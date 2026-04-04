import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'

const LOCAL_KEY = 'hive-meal-plans'
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

function emptyWeekMeals() {
  const meals = {}
  DAYS.forEach(d => { meals[d] = { breakfast: '', lunch: '', dinner: '' } })
  return meals
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLocal(plans) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(plans))
}

// Convert DB rows to local shape
function dbToLocal(plan, items) {
  const meals = emptyWeekMeals()
  for (const item of items) {
    const day = DAYS[item.day_of_week]
    if (day && meals[day] && item.meal_type in meals[day]) {
      meals[day][item.meal_type] = item.meal_name
    }
  }
  return {
    id: plan.id,
    weekStart: plan.week_start,
    meals,
  }
}

export default function useMealPlans() {
  const { user } = useAuth()
  const isOnline = !!supabase && !!user

  const [mealPlans, setMealPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOnline) {
      fetchPlans()
    } else {
      setMealPlans(loadLocal())
      setLoading(false)
    }
  }, [isOnline])

  async function fetchPlans() {
    setLoading(true)
    const { data: plans } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('profile_id', user.id)
      .order('week_start', { ascending: false })

    if (!plans || plans.length === 0) {
      setMealPlans([])
      setLoading(false)
      return
    }

    const planIds = plans.map(p => p.id)
    const { data: items } = await supabase
      .from('meal_plan_items')
      .select('*')
      .in('plan_id', planIds)

    const allItems = items || []
    const combined = plans.map(p =>
      dbToLocal(p, allItems.filter(i => i.plan_id === p.id))
    )

    setMealPlans(combined)
    setLoading(false)
  }

  const updateMealPlans = useCallback(async (updater) => {
    setMealPlans(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!isOnline) {
        saveLocal(next)
      }
      return next
    })
  }, [isOnline])

  // Sync a specific week plan to Supabase after local state updates
  const syncWeek = useCallback(async (weekKey, meals) => {
    if (!isOnline) return

    // Find or create the plan row
    let { data: existing } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('profile_id', user.id)
      .eq('week_start', weekKey)
      .single()

    let planId
    if (existing) {
      planId = existing.id
    } else {
      const { data: newPlan } = await supabase
        .from('meal_plans')
        .insert({ profile_id: user.id, week_start: weekKey })
        .select()
        .single()
      if (!newPlan) return
      planId = newPlan.id
    }

    // Delete existing items for this plan
    await supabase
      .from('meal_plan_items')
      .delete()
      .eq('plan_id', planId)

    // Insert non-empty slots
    const rows = []
    DAYS.forEach((day, dayIndex) => {
      MEAL_TYPES.forEach(mealType => {
        const name = meals[day]?.[mealType]
        if (name && name.trim()) {
          rows.push({
            plan_id: planId,
            meal_name: name.trim(),
            day_of_week: dayIndex,
            meal_type: mealType,
          })
        }
      })
    })

    if (rows.length > 0) {
      await supabase.from('meal_plan_items').insert(rows)
    }
  }, [isOnline, user])

  return { mealPlans, setMealPlans: updateMealPlans, syncWeek, loading }
}
