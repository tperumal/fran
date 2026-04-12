import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, Check, RotateCcw } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, parseISO, isSameDay } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import './Week.css'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function Week() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [addingDay, setAddingDay] = useState(null)
  const [formTitle, setFormTitle] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formRecurring, setFormRecurring] = useState(false)

  const { householdId } = useHousehold()

  const baseWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset)
  const weekKey = format(baseWeek, 'yyyy-MM-dd')
  const today = new Date()

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(baseWeek, i)),
    [baseWeek.getTime()]
  )

  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const navLabel = `${format(weekStart, 'MMM d').toUpperCase()} — ${format(weekEnd, 'MMM d, yyyy').toUpperCase()}`

  const { items: events, addItem: addEvent, updateItem: updateEvent, deleteItem: deleteEvent, loading: loadingEvents } = useStore(
    'calendar_events', 'hive-calendar-events',
    { householdId }
  )

  const { items: tasks, updateItem: updateTask, loading: loadingTasks } = useStore(
    'tasks', 'hive-tasks',
    {
      profileColumn: 'created_by',
      skipProfileFilter: !!householdId,
      fromRow: row => ({
        ...row,
        listId: row.list_id,
        dueDate: row.due_date,
        completedAt: row.completed_at,
      }),
    }
  )

  // Filter events for this week: recurring (any week) + one-off (matching week_key)
  const weekEvents = useMemo(() => {
    return events.filter(ev => {
      if (ev.recurring) return true
      return ev.week_key === weekKey
    })
  }, [events, weekKey])

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = {}
    tasks.forEach(task => {
      if (!task.dueDate && !task.due_date) return
      const due = task.dueDate || task.due_date
      const dateStr = due.split('T')[0]
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(task)
    })
    return map
  }, [tasks])

  function eventsForDay(dayIndex) {
    return weekEvents.filter(ev => ev.day_of_week === dayIndex)
  }

  function tasksForDay(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return tasksByDate[dateStr] || []
  }

  async function handleAddEvent(e, dayIndex) {
    e.preventDefault()
    const title = formTitle.trim()
    if (!title) return

    await addEvent({
      id: crypto.randomUUID(),
      title,
      day_of_week: dayIndex,
      time: formTime || null,
      recurring: formRecurring,
      week_key: formRecurring ? null : weekKey,
      created_at: new Date().toISOString(),
    })

    setFormTitle('')
    setFormTime('')
    setFormRecurring(false)
    setAddingDay(null)
  }

  async function handleDeleteEvent(id) {
    await deleteEvent(id)
  }

  async function handleToggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const now = !task.completed ? new Date().toISOString() : null
      await updateTask(taskId, {
        completed: !task.completed,
        completed_at: now,
      })
    }
  }

  if (loadingEvents || loadingTasks) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page week-page">
      <h2>Week</h2>
      <p className="text-muted">Your week at a glance.</p>

      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="week-nav-label">{navLabel}</div>
        <button className="week-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight size={18} />
        </button>
        {weekOffset !== 0 && (
          <button className="btn btn-ghost week-today-btn" onClick={() => setWeekOffset(0)}>
            Today
          </button>
        )}
      </div>

      <div className="week-days">
        {weekDays.map((date, i) => {
          const isToday = isSameDay(date, today)
          const dayEvents = eventsForDay(i)
          const dayTasks = tasksForDay(date)
          const isAdding = addingDay === i
          const isEmpty = dayEvents.length === 0 && dayTasks.length === 0 && !isAdding

          return (
            <div key={i} className="card week-day-card">
              <div className={`week-day-header ${isToday ? 'week-day-header--today' : ''}`}>
                <span>{DAY_LABELS[i]}, {format(date, 'MMM d').toUpperCase()}</span>
              </div>

              {dayEvents.map(ev => (
                <div key={ev.id} className="week-event-row">
                  <span className="week-event-dot" />
                  <span className="week-event-title">{ev.title}</span>
                  {ev.time && <span className="week-event-time">{ev.time}</span>}
                  {ev.recurring && <RotateCcw size={12} className="week-event-recurring" />}
                  <ShareToggle
                    shared={!!ev.household_id}
                    onToggle={(share) => updateEvent(ev.id, { household_id: share ? householdId : null })}
                    size={12}
                  />
                  <button className="week-event-delete" onClick={() => handleDeleteEvent(ev.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {dayTasks.map(task => (
                <div key={task.id} className="week-task-row">
                  <label className="week-task-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={!!task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="week-task-checkbox"
                    />
                    <span className={`week-task-check ${task.completed ? 'week-task-check--done' : ''}`}>
                      {task.completed && <Check size={10} />}
                    </span>
                  </label>
                  <span className={`week-task-title ${task.completed ? 'week-task-title--done' : ''}`}>{task.title}</span>
                  <span className="week-task-badge">task</span>
                </div>
              ))}

              {isEmpty && !isAdding && (
                <div className="week-empty-day">—</div>
              )}

              {isAdding ? (
                <form className="week-add-form" onSubmit={(e) => handleAddEvent(e, i)}>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="week-add-input"
                    autoFocus
                  />
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="week-add-time"
                  />
                  <label className="week-add-recurring">
                    <input
                      type="checkbox"
                      checked={formRecurring}
                      onChange={(e) => setFormRecurring(e.target.checked)}
                    />
                    <span>Weekly</span>
                  </label>
                  <button type="submit" className="week-add-submit" disabled={!formTitle.trim()}>
                    <Plus size={14} />
                  </button>
                </form>
              ) : (
                <button
                  className="week-add-btn"
                  onClick={() => {
                    setAddingDay(i)
                    setFormTitle('')
                    setFormTime('')
                    setFormRecurring(false)
                  }}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
