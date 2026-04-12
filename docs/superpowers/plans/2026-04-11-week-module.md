# Week Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Week module showing Mon-Sun calendar events (recurring and one-off) plus tasks with due dates, with household sharing and week navigation.

**Architecture:** One new Supabase table (calendar_events) with RLS. A new Week page that fetches events via useStore and tasks from the existing tasks store filtered by due date. Dashboard gets a Week summary card. Navigation updated.

**Tech Stack:** React 19, Supabase, useStore hook, ShareToggle, date-fns, Lucide icons

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/010_week.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Week module: calendar_events table + RLS
-- Run in Supabase SQL Editor

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time text,
  recurring boolean NOT NULL DEFAULT true,
  week_key date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_profile ON calendar_events(profile_id);
CREATE INDEX idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX idx_calendar_events_week ON calendar_events(week_key);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View calendar events" ON calendar_events FOR SELECT
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert calendar events" ON calendar_events FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update calendar events" ON calendar_events FOR UPDATE
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete calendar events" ON calendar_events FOR DELETE
  USING (profile_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/010_week.sql
git commit -m "Add calendar_events table for Week module"
```

---

### Task 2: Week Page Component + CSS

**Files:**
- Create: `src/pages/Week.jsx`
- Create: `src/pages/Week.css`

- [ ] **Step 1: Create Week.css**

```css
/* ============================================
   Week Module — FRAN
   ============================================ */

.week-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
.week-nav-btn { background: none; border: 2px solid var(--border); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); transition: all 0.1s ease; }
.week-nav-btn:hover { background: var(--text); color: var(--bg); }
.week-nav-label { font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }

.week-days { display: flex; flex-direction: column; gap: 8px; }

.week-day { padding: 12px; }
.week-day-header { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; font-family: var(--font-mono); }
.week-day-header--today { color: var(--accent); }

.week-day-items { display: flex; flex-direction: column; gap: 4px; }

/* Calendar event row */
.week-event { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.week-event-dot { width: 8px; height: 8px; background: var(--text); flex-shrink: 0; }
.week-event-title { font-size: 0.85rem; font-family: var(--font-mono); flex: 1; }
.week-event-time { font-size: 0.65rem; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 1px 6px; border: 1px solid var(--border-light); flex-shrink: 0; }
.week-event-recurring { font-size: 0.55rem; font-family: var(--font-mono); color: var(--text-dim); text-transform: uppercase; }
.week-event-actions { display: flex; gap: 2px; flex-shrink: 0; }
.week-event-delete { background: none; border: none; padding: 4px; color: var(--text-dim); cursor: pointer; }
.week-event-delete:hover { color: var(--danger); }

/* Task row (auto-pulled) */
.week-task { display: flex; align-items: center; gap: 8px; padding: 6px 0; opacity: 0.7; }
.week-task-check { width: 16px; height: 16px; border: 2px solid var(--border-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; background: none; color: var(--text); padding: 0; transition: all 0.1s ease; }
.week-task-check--done { background: var(--text-dim); border-color: var(--text-dim); color: var(--bg); }
.week-task-title { font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted); flex: 1; }
.week-task-title--done { text-decoration: line-through; color: var(--text-dim); }
.week-task-label { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-family: var(--font-mono); padding: 1px 4px; border: 1px solid var(--border-light); flex-shrink: 0; }

/* Add event row */
.week-add { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
.week-add input { flex: 1; font-size: 0.8rem; padding: 6px 8px; }
.week-add-time { width: 90px; font-size: 0.75rem; padding: 6px 8px; }
.week-add-recurring { display: flex; align-items: center; gap: 4px; font-size: 0.6rem; font-family: var(--font-mono); font-weight: 700; text-transform: uppercase; color: var(--text-muted); white-space: nowrap; cursor: pointer; }
.week-add-recurring input[type="checkbox"] { width: auto; accent-color: var(--text); }
.week-add button { flex-shrink: 0; padding: 6px 10px; }

.week-empty-day { font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); padding: 4px 0; }
```

- [ ] **Step 2: Create Week.jsx**

```jsx
import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, Check, RotateCcw } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, parseISO, isSameDay } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import './Week.css'

function uid() { return crypto.randomUUID() }

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function Week() {
  const { householdId } = useHousehold()
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  )
  const weekKey = format(weekStart, 'yyyy-MM-dd')
  const weekLabel = `${format(weekStart, 'MMM d')} — ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`

  const { items: events, addItem: addEvent, updateItem: updateEvent, deleteItem: deleteEvent, loading: loadingEvents } = useStore(
    'calendar_events', 'hive-calendar-events',
    { householdId }
  )

  const { items: tasks, updateItem: updateTask } = useStore(
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

  // Per-day add form state
  const [addingDay, setAddingDay] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newRecurring, setNewRecurring] = useState(true)

  function eventsForDay(dayIndex) {
    return events.filter(e => {
      if (e.day_of_week !== dayIndex) return false
      if (e.recurring) return true
      return e.week_key === weekKey
    }).sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return -1
      if (!b.time) return 1
      return a.time.localeCompare(b.time)
    })
  }

  function tasksForDay(dayIndex) {
    const dayDate = addDays(weekStart, dayIndex)
    return tasks.filter(t => {
      const due = t.dueDate || t.due_date
      if (!due) return false
      return isSameDay(parseISO(due), dayDate)
    })
  }

  async function handleAdd(dayIndex) {
    if (!newTitle.trim()) return
    await addEvent({
      id: uid(),
      title: newTitle.trim(),
      day_of_week: dayIndex,
      time: newTime.trim() || null,
      recurring: newRecurring,
      week_key: newRecurring ? null : weekKey,
      created_at: new Date().toISOString(),
    })
    setNewTitle('')
    setNewTime('')
    setNewRecurring(true)
    setAddingDay(null)
  }

  async function handleToggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const now = !task.completed ? new Date().toISOString() : null
      await updateTask(taskId, { completed: !task.completed, completed_at: now })
    }
  }

  const today = new Date()

  if (loadingEvents) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Week</h2>
      <p className="text-muted">Plan your days.</p>

      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="week-nav-label">{weekLabel}</span>
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="week-days">
        {DAY_LABELS.map((label, dayIndex) => {
          const dayDate = addDays(weekStart, dayIndex)
          const isToday = isSameDay(dayDate, today)
          const dayEvents = eventsForDay(dayIndex)
          const dayTasks = tasksForDay(dayIndex)
          const hasContent = dayEvents.length > 0 || dayTasks.length > 0

          return (
            <div key={dayIndex} className="card week-day">
              <div className={`week-day-header ${isToday ? 'week-day-header--today' : ''}`}>
                {label}, {format(dayDate, 'MMM d')}
              </div>

              <div className="week-day-items">
                {dayEvents.map(event => (
                  <div key={event.id} className="week-event">
                    <span className="week-event-dot" />
                    <span className="week-event-title">{event.title}</span>
                    {event.time && <span className="week-event-time">{event.time}</span>}
                    {event.recurring && <span className="week-event-recurring"><RotateCcw size={10} /></span>}
                    <div className="week-event-actions">
                      <ShareToggle
                        shared={!!event.household_id}
                        onToggle={(share) => updateEvent(event.id, { household_id: share ? householdId : null })}
                        size={12}
                      />
                      <button className="week-event-delete" onClick={() => deleteEvent(event.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {dayTasks.map(task => (
                  <div key={task.id} className="week-task">
                    <button
                      className={`week-task-check ${task.completed ? 'week-task-check--done' : ''}`}
                      onClick={() => handleToggleTask(task.id)}
                    >
                      {task.completed && <Check size={10} />}
                    </button>
                    <span className={`week-task-title ${task.completed ? 'week-task-title--done' : ''}`}>{task.title}</span>
                    <span className="week-task-label">task</span>
                  </div>
                ))}

                {!hasContent && addingDay !== dayIndex && (
                  <span className="week-empty-day">—</span>
                )}
              </div>

              {addingDay === dayIndex ? (
                <div className="week-add">
                  <input
                    placeholder="Event..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd(dayIndex)}
                    autoFocus
                  />
                  <input
                    className="week-add-time"
                    placeholder="Time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                  />
                  <label className="week-add-recurring">
                    <input type="checkbox" checked={newRecurring} onChange={e => setNewRecurring(e.target.checked)} />
                    Weekly
                  </label>
                  <button className="btn btn-primary" onClick={() => handleAdd(dayIndex)}><Plus size={14} /></button>
                  <button className="btn btn-ghost" onClick={() => setAddingDay(null)}><span style={{ fontSize: '0.7rem' }}>X</span></button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.7rem', marginTop: 4, padding: '4px 8px' }}
                  onClick={() => { setAddingDay(dayIndex); setNewTitle(''); setNewTime(''); setNewRecurring(true) }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Week.jsx src/pages/Week.css
git commit -m "Add Week page component and styles"
```

---

### Task 3: Wire Up Navigation and Routing

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/AppLayout.jsx`

- [ ] **Step 1: Add route in App.jsx**

Add import with other pages:
```jsx
import Week from './pages/Week'
```

Add route inside `<Routes>`:
```jsx
<Route path="/week" element={<Week />} />
```

- [ ] **Step 2: Add nav item in AppLayout.jsx**

Add `CalendarDays` to the lucide-react import.

Add to `ALL_NAV_ITEMS` after goals:
```jsx
{ id: 'week', to: '/week', label: 'Week', icon: CalendarDays },
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/AppLayout.jsx
git commit -m "Add Week route and navigation item"
```

---

### Task 4: Dashboard Week Card

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add CalendarDays to lucide imports**

- [ ] **Step 2: Add 'week' to ALL_MODULES and ITEM_LABELS**

- [ ] **Step 3: Add useStore for calendar_events**

```jsx
const { items: calendarEvents } = useStore('calendar_events', 'hive-calendar-events', { householdId })
```

- [ ] **Step 4: Add the Week card after the Goals card**

Show today's events and tasks due today:

```jsx
{isVis('week') && (
  <div className="card dash-card" onClick={() => navigate('/week')}>
    <div className="dash-card-header"><CalendarDays size={18} /><span>Week</span><ChevronRight size={16} className="dash-chevron" /></div>
    {todayEvents.length > 0 ? (
      <div className="dash-card-body">
        {todayEvents.slice(0, 3).map(e => (
          <div key={e.id} className="dash-task-item">
            <span className="dash-task-dot" /><span>{e.title}</span>
            {e.time && <span className="dash-due">{e.time}</span>}
          </div>
        ))}
      </div>
    ) : <p className="text-muted">Nothing scheduled today</p>}
  </div>
)}
```

Compute `todayEvents` from calendarEvents:
```jsx
const todayDow = (today.getDay() + 6) % 7  // Convert Sun=0 to Mon=0
const todayWeekKey = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
const todayEvents = calendarEvents.filter(e => {
  if (e.day_of_week !== todayDow) return false
  if (e.recurring) return true
  return e.week_key === todayWeekKey
})
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "Add Week card to Dashboard"
```

---

### Task 5: Build, Verify, and Push

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Run 010_week.sql in Supabase SQL Editor**

- [ ] **Step 4: Verify in browser**

Check: Week in hamburger menu, can add events, recurring shows every week, tasks with due dates appear, week navigation works, Dashboard card shows today's events.
