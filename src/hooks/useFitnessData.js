import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'

const WORKOUTS_KEY = 'hive-workouts'
const TEMPLATES_KEY = 'hive-workout-templates'

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export default function useFitnessData() {
  const { user } = useAuth()
  const isOnline = !!supabase && !!user

  const [workouts, setWorkouts] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOnline) {
      Promise.all([fetchWorkouts(), fetchTemplates()]).then(() => setLoading(false))
    } else {
      setWorkouts(loadLocal(WORKOUTS_KEY, []))
      setTemplates(loadLocal(TEMPLATES_KEY, []))
      setLoading(false)
    }
  }, [isOnline])

  async function fetchWorkouts() {
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('profile_id', user.id)
      .order('started_at', { ascending: false })

    if (!logs) return

    // Fetch exercises for all logs
    const logIds = logs.map(l => l.id)
    let exercises = []
    if (logIds.length > 0) {
      const { data } = await supabase
        .from('workout_log_exercises')
        .select('*')
        .in('log_id', logIds)
        .order('order_index', { ascending: true })
      exercises = data || []
    }

    // Combine into local shape
    const combined = logs.map(log => ({
      id: log.id,
      name: log.name,
      date: log.started_at,
      notes: log.notes,
      exercises: exercises
        .filter(ex => ex.log_id === log.id)
        .map(ex => ({ name: ex.exercise_name, sets: ex.sets || [] })),
    }))

    setWorkouts(combined)
  }

  async function fetchTemplates() {
    const { data: tmpls } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    if (!tmpls) return

    const tmplIds = tmpls.map(t => t.id)
    let exercises = []
    if (tmplIds.length > 0) {
      const { data } = await supabase
        .from('workout_template_exercises')
        .select('*')
        .in('template_id', tmplIds)
        .order('order_index', { ascending: true })
      exercises = data || []
    }

    const combined = tmpls.map(t => ({
      id: t.id,
      name: t.name,
      exercises: exercises
        .filter(ex => ex.template_id === t.id)
        .map(ex => ({
          name: ex.exercise_name,
          defaultSets: ex.sets || 3,
          defaultReps: ex.reps || 10,
          defaultWeight: ex.weight || 0,
        })),
    }))

    setTemplates(combined)
  }

  const saveWorkout = useCallback(async (workout) => {
    if (isOnline) {
      const { data: log, error } = await supabase
        .from('workout_logs')
        .insert({
          id: workout.id,
          profile_id: user.id,
          name: workout.name,
          started_at: workout.date,
          notes: workout.notes || null,
        })
        .select()
        .single()

      if (error) {
        console.error('[FRAN] Error saving workout:', error.message)
        return
      }

      if (workout.exercises.length > 0) {
        const exerciseRows = workout.exercises.map((ex, i) => ({
          log_id: log.id,
          exercise_name: ex.name,
          sets: ex.sets,
          order_index: i,
        }))
        await supabase.from('workout_log_exercises').insert(exerciseRows)
      }

      setWorkouts(prev => [workout, ...prev])
    } else {
      setWorkouts(prev => {
        const next = [workout, ...prev]
        saveLocal(WORKOUTS_KEY, next)
        return next
      })
    }
  }, [isOnline, user])

  const deleteWorkout = useCallback(async (id) => {
    if (isOnline) {
      await supabase.from('workout_logs').delete().eq('id', id)
    }
    setWorkouts(prev => {
      const next = prev.filter(w => w.id !== id)
      if (!isOnline) saveLocal(WORKOUTS_KEY, next)
      return next
    })
  }, [isOnline])

  const saveTemplate = useCallback(async (tmpl) => {
    if (isOnline) {
      const { data: row, error } = await supabase
        .from('workout_templates')
        .insert({
          id: tmpl.id,
          profile_id: user.id,
          name: tmpl.name,
        })
        .select()
        .single()

      if (error) {
        console.error('[FRAN] Error saving template:', error.message)
        return
      }

      if (tmpl.exercises.length > 0) {
        const exerciseRows = tmpl.exercises.map((ex, i) => ({
          template_id: row.id,
          exercise_name: ex.name,
          sets: ex.defaultSets || 3,
          reps: ex.defaultReps || 10,
          weight: ex.defaultWeight || 0,
          order_index: i,
        }))
        await supabase.from('workout_template_exercises').insert(exerciseRows)
      }

      setTemplates(prev => [tmpl, ...prev])
    } else {
      setTemplates(prev => {
        const next = [tmpl, ...prev]
        saveLocal(TEMPLATES_KEY, next)
        return next
      })
    }
  }, [isOnline, user])

  const deleteTemplate = useCallback(async (id) => {
    if (isOnline) {
      await supabase.from('workout_templates').delete().eq('id', id)
    }
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id)
      if (!isOnline) saveLocal(TEMPLATES_KEY, next)
      return next
    })
  }, [isOnline])

  return { workouts, templates, loading, saveWorkout, deleteWorkout, saveTemplate, deleteTemplate }
}
