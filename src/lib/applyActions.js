const DAY_TO_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

function todayWeekStart() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

const HANDLERS = {
  async add_task(action, { supabase, user, householdId }) {
    const listName = (action.list || 'Personal').toLowerCase()
    const { data: lists } = await supabase
      .from('task_lists')
      .select('id, name')
      .eq('profile_id', user.id)
    const list = lists?.find(l => l.name.toLowerCase() === listName) || lists?.[0]
    if (!list) throw new Error('No task lists found. Create one first.')

    const row = {
      list_id: list.id,
      title: action.title,
      created_by: user.id,
    }
    if (action.dueDate) row.due_date = action.dueDate
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('tasks').insert(row)
    if (error) throw error
  },

  async add_grocery(action, { supabase, user, householdId }) {
    const row = {
      name: action.name,
      category: action.category || 'other',
      profile_id: user.id,
    }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('grocery_items').insert(row)
    if (error) throw error
  },

  async add_shopping(action, { supabase, user, householdId }) {
    let { data: existing } = await supabase
      .from('task_lists')
      .select('id')
      .eq('profile_id', user.id)
      .ilike('name', 'Shopping')
      .maybeSingle()

    let listId = existing?.id
    if (!listId) {
      const listRow = { profile_id: user.id, name: 'Shopping', is_shared: false }
      if (householdId) listRow.household_id = householdId
      const { data: newList, error: listErr } = await supabase
        .from('task_lists')
        .insert(listRow)
        .select('id')
        .single()
      if (listErr) throw listErr
      listId = newList.id
    }

    const row = {
      list_id: listId,
      title: action.name,
      description: action.notes || null,
      created_by: user.id,
    }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('tasks').insert(row)
    if (error) throw error
  },

  async plan_meal(action, { supabase, user, householdId }) {
    const dayIndex = DAY_TO_INDEX[action.day]
    if (dayIndex === undefined) throw new Error(`Invalid day: ${action.day}`)
    if (!['breakfast', 'lunch', 'dinner'].includes(action.meal)) {
      throw new Error(`Invalid meal type: ${action.meal}`)
    }
    const weekStart = todayWeekStart()

    let { data: plan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('profile_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()

    let planId = plan?.id
    if (!planId) {
      const planRow = { profile_id: user.id, week_start: weekStart }
      if (householdId) planRow.household_id = householdId
      const { data: newPlan, error: planErr } = await supabase
        .from('meal_plans')
        .insert(planRow)
        .select('id')
        .single()
      if (planErr) throw planErr
      planId = newPlan.id
    }

    await supabase
      .from('meal_plan_items')
      .delete()
      .eq('plan_id', planId)
      .eq('day_of_week', dayIndex)
      .eq('meal_type', action.meal)

    const { error } = await supabase.from('meal_plan_items').insert({
      plan_id: planId,
      meal_name: action.name,
      day_of_week: dayIndex,
      meal_type: action.meal,
    })
    if (error) throw error
  },

  async add_calendar_event(action, { supabase, user, householdId }) {
    const dayIndex = DAY_TO_INDEX[action.day]
    if (dayIndex === undefined) throw new Error(`Invalid day: ${action.day}`)
    const row = {
      profile_id: user.id,
      title: action.title,
      day_of_week: dayIndex,
      time: action.startTime || null,
      recurring: action.recurring !== false,
      week_key: action.recurring === false ? todayWeekStart() : null,
    }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('calendar_events').insert(row)
    if (error) throw error
  },

  async add_weekend(action, { supabase, user, householdId }) {
    const row = {
      title: action.title,
      day: action.day || 'sat',
      time: action.time || null,
      tag: action.tag || null,
      week_key: todayWeekStart(),
      profile_id: user.id,
    }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('weekend_activities').insert(row)
    if (error) throw error
  },

  async add_bill(action, { supabase, user, householdId }) {
    const row = {
      name: action.name,
      amount: Number(action.amount) || 0,
      due_day: Number(action.dueDay) || 1,
      frequency: action.frequency || 'monthly',
      category: 'Other',
      profile_id: user.id,
    }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('bills').insert(row)
    if (error) throw error
  },

  async add_goal(action, { supabase, user, householdId }) {
    if (action.parentTitle) {
      const { data: parent } = await supabase
        .from('goals')
        .select('id')
        .ilike('title', action.parentTitle)
        .maybeSingle()
      if (parent) {
        const { error } = await supabase.from('goal_items').insert({
          goal_id: parent.id,
          text: action.title,
          type: 'habit',
        })
        if (error) throw error
        return
      }
    }
    const row = { title: action.title, profile_id: user.id }
    if (householdId) row.household_id = householdId
    const { error } = await supabase.from('goals').insert(row)
    if (error) throw error
  },

  async add_milestone(action, { supabase, user }) {
    const { error } = await supabase.from('career_milestones').insert({
      title: action.title,
      category: action.category || 'achievement',
      date: todayDate(),
      profile_id: user.id,
    })
    if (error) throw error
  },

  async add_media(action, { supabase, user }) {
    const { error } = await supabase.from('media_items').insert({
      title: action.title,
      media_type: action.mediaType || 'movie',
      status: action.status || 'want',
      profile_id: user.id,
    })
    if (error) throw error
  },
}

export default async function applyActions(actions, ctx) {
  const applied = []
  const failed = []
  for (const action of actions) {
    const handler = HANDLERS[action.type]
    if (!handler) {
      failed.push({ action, error: `Unknown action type: ${action.type}` })
      continue
    }
    try {
      await handler(action, ctx)
      applied.push(action)
    } catch (err) {
      console.error('[FRAN applyActions] Failed:', action, err)
      failed.push({ action, error: err.message || String(err) })
    }
  }
  return { applied, failed }
}
