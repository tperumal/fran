import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'
import useHousehold from './useHousehold'

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n) {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() - n)
  return d
}

export default function useMood() {
  const { user } = useAuth()
  const { householdId, members } = useHousehold()
  const [todayMoods, setTodayMoods] = useState([]) // all household moods today
  const [history, setHistory] = useState([])        // user's last 7 days
  const [loading, setLoading] = useState(true)

  const isOnline = !!supabase && !!user

  const fetchMoods = useCallback(async () => {
    if (!isOnline) {
      setLoading(false)
      return
    }

    const todayStart = startOfDay(new Date()).toISOString()
    const weekAgo = daysAgo(7).toISOString()

    // Fetch today's moods for all household members (or just the user)
    let todayQuery = supabase
      .from('mood_logs')
      .select('*')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })

    if (householdId) {
      todayQuery = todayQuery.eq('household_id', householdId)
    } else {
      todayQuery = todayQuery.eq('profile_id', user.id)
    }

    // Fetch user's 7-day history
    const historyQuery = supabase
      .from('mood_logs')
      .select('mood, created_at')
      .eq('profile_id', user.id)
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })

    const [todayRes, historyRes] = await Promise.all([todayQuery, historyQuery])

    if (todayRes.data) setTodayMoods(todayRes.data)
    if (historyRes.data) setHistory(historyRes.data)
    setLoading(false)
  }, [isOnline, user, householdId])

  useEffect(() => {
    fetchMoods()
  }, [fetchMoods])

  const logMood = useCallback(async (mood) => {
    if (!isOnline) return

    const { error } = await supabase
      .from('mood_logs')
      .insert({
        profile_id: user.id,
        household_id: householdId || null,
        mood,
      })

    if (error) {
      console.error('[FRAN] Error logging mood:', error.message)
      return
    }

    await fetchMoods()
  }, [isOnline, user, householdId, fetchMoods])

  // Derive current user's latest mood today
  const myMood = todayMoods.find(m => m.profile_id === user?.id) || null

  // Derive partner moods (other household members)
  const partnerMoods = todayMoods
    .filter(m => m.profile_id !== user?.id)
    .map(m => {
      const member = members.find(mem => mem.profileId === m.profile_id)
      return {
        ...m,
        displayName: member?.displayName || 'Partner',
      }
    })

  // Build 7-day history strip (index 0 = 6 days ago, index 6 = today)
  const historyStrip = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = daysAgo(i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const entry = history.find(h => {
      const d = new Date(h.created_at)
      return d >= dayStart && d < dayEnd
    })
    historyStrip.push(entry ? entry.mood : null)
  }

  return { myMood, partnerMoods, historyStrip, logMood, loading }
}
