import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'

const HouseholdContext = createContext(null)

/**
 * Provider that wraps the app and makes household data available everywhere.
 */
export function HouseholdProvider({ children }) {
  const { user } = useAuth()
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const isOnline = !!supabase && !!user

  const fetchHousehold = useCallback(async () => {
    if (!isOnline) {
      setLoading(false)
      return
    }
    setLoading(true)

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

    const { data: memberRows } = await supabase
      .from('household_members')
      .select('profile_id, role, joined_at, profiles(id, display_name, avatar_url)')
      .eq('household_id', hh.id)

    setMembers(
      (memberRows || []).map(m => ({
        profileId: m.profile_id,
        role: m.role,
        joinedAt: m.joined_at,
        displayName: m.profiles?.display_name || 'Unknown',
        avatarUrl: m.profiles?.avatar_url,
      }))
    )

    setLoading(false)
  }, [isOnline, user])

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  const createHousehold = useCallback(async (name) => {
    if (!isOnline) return null

    // Ensure profile exists (required by foreign key)
    await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User' })

    const id = crypto.randomUUID()
    const { error } = await supabase
      .from('households')
      .insert({ id, name, created_by: user.id })
    if (error) {
      console.error('[FRAN] Create household error:', error)
      throw new Error(error.message)
    }

    const { error: memErr } = await supabase
      .from('household_members')
      .insert({ household_id: id, profile_id: user.id, role: 'owner' })
    if (memErr) {
      console.error('[FRAN] Add member error:', memErr)
      // Clean up the household if member insert fails
      await supabase.from('households').delete().eq('id', id)
      throw new Error(memErr.message)
    }

    await fetchHousehold()
    return { id, name }
  }, [isOnline, user, fetchHousehold])

  const joinHousehold = useCallback(async (code) => {
    if (!isOnline) return null
    const normalized = code.trim().toLowerCase()
    if (normalized.length !== 8) throw new Error('Invite code must be 8 characters')

    // Use RPC to bypass RLS for lookup (partner isn't a member yet)
    const { data: matches, error: rpcErr } = await supabase
      .rpc('find_household_by_code', { invite_code: normalized })

    if (rpcErr) {
      console.error('[FRAN] Join lookup error:', rpcErr)
      throw new Error('Could not look up invite code')
    }

    const target = matches?.[0]
    if (!target) throw new Error('No household found with that code')

    // Check not already a member
    const { data: existing } = await supabase
      .from('household_members')
      .select('profile_id')
      .eq('household_id', target.id)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (existing) throw new Error('You are already a member of this household')

    const { error: joinErr } = await supabase
      .from('household_members')
      .insert({ household_id: target.id, profile_id: user.id, role: 'member' })
    if (joinErr) throw joinErr

    await fetchHousehold()
    return target
  }, [isOnline, user, fetchHousehold])

  const leaveHousehold = useCallback(async () => {
    if (!isOnline || !household) return
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('profile_id', user.id)
    if (error) throw error
    setHousehold(null)
    setMembers([])
  }, [isOnline, household, user])

  const inviteCode = household ? household.id.replace(/-/g, '').substring(0, 8).toUpperCase() : null
  const householdId = household?.id || null

  return (
    <HouseholdContext.Provider value={{
      household, members, inviteCode, householdId, loading,
      createHousehold, joinHousehold, leaveHousehold, refetch: fetchHousehold,
    }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export default function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
