import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'

/**
 * Hook for household management — fetch, create, join, leave.
 * Invite codes are the first 6 chars of the household UUID (uppercased).
 */
export default function useHousehold() {
  const { user } = useAuth()
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const isOnline = !!supabase && !!user

  // Fetch the user's household + members
  const fetchHousehold = useCallback(async () => {
    if (!isOnline) {
      setLoading(false)
      return
    }
    setLoading(true)

    // Get the user's household membership
    const { data: membership, error: memErr } = await supabase
      .from('household_members')
      .select('household_id, role, households(id, name, created_at, created_by)')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (memErr) {
      console.error('[FRAN] Error fetching household:', memErr.message)
      setLoading(false)
      return
    }

    if (!membership) {
      setHousehold(null)
      setMembers([])
      setLoading(false)
      return
    }

    const hh = membership.households
    setHousehold({ ...hh, role: membership.role })

    // Fetch all members with their profiles
    const { data: memberRows, error: membersErr } = await supabase
      .from('household_members')
      .select('profile_id, role, joined_at, profiles(id, display_name, avatar_url)')
      .eq('household_id', hh.id)

    if (membersErr) {
      console.error('[FRAN] Error fetching members:', membersErr.message)
    } else {
      setMembers(
        (memberRows || []).map(m => ({
          profileId: m.profile_id,
          role: m.role,
          joinedAt: m.joined_at,
          displayName: m.profiles?.display_name || 'Unknown',
          avatarUrl: m.profiles?.avatar_url,
        }))
      )
    }

    setLoading(false)
  }, [isOnline, user])

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  /**
   * Create a new household and add the current user as owner.
   */
  const createHousehold = useCallback(async (name) => {
    if (!isOnline) return null

    const id = crypto.randomUUID()
    const { data, error } = await supabase
      .from('households')
      .insert({ id, name, created_by: user.id })
      .select()
      .single()

    if (error) {
      console.error('[FRAN] Error creating household:', error.message)
      throw error
    }

    // Add self as owner
    const { error: memErr } = await supabase
      .from('household_members')
      .insert({ household_id: id, profile_id: user.id, role: 'owner' })

    if (memErr) {
      console.error('[FRAN] Error adding self to household:', memErr.message)
      throw memErr
    }

    await fetchHousehold()
    return data
  }, [isOnline, user, fetchHousehold])

  /**
   * Join an existing household using a 6-character invite code.
   * The code is the first 6 chars of the household UUID (case-insensitive).
   */
  const joinHousehold = useCallback(async (code) => {
    if (!isOnline) return null

    const normalized = code.trim().toLowerCase()
    if (normalized.length !== 6) {
      throw new Error('Invite code must be 6 characters')
    }

    // Look up households where id starts with the code
    const { data: matches, error: lookupErr } = await supabase
      .from('households')
      .select('id, name')
      .ilike('id', `${normalized}%`)

    if (lookupErr) {
      console.error('[FRAN] Error looking up household:', lookupErr.message)
      throw lookupErr
    }

    if (!matches || matches.length === 0) {
      throw new Error('No household found with that code')
    }

    const target = matches[0]

    // Insert membership
    const { error: joinErr } = await supabase
      .from('household_members')
      .insert({ household_id: target.id, profile_id: user.id, role: 'member' })

    if (joinErr) {
      console.error('[FRAN] Error joining household:', joinErr.message)
      throw joinErr
    }

    await fetchHousehold()
    return target
  }, [isOnline, user, fetchHousehold])

  /**
   * Leave the current household (delete own membership).
   */
  const leaveHousehold = useCallback(async () => {
    if (!isOnline || !household) return

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('[FRAN] Error leaving household:', error.message)
      throw error
    }

    setHousehold(null)
    setMembers([])
  }, [isOnline, household, user])

  /**
   * Get the 6-char invite code for the current household.
   */
  const inviteCode = household ? household.id.substring(0, 6).toUpperCase() : null

  return {
    household,
    members,
    inviteCode,
    loading,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    refetch: fetchHousehold,
  }
}
