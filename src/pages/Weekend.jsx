import { useState } from 'react'
import {
  Plus, Trash2, Pencil, X, MapPin, Clock, Users, User,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import {
  format, addWeeks, startOfWeek, addDays, isSameDay
} from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import './Weekend.css'

const TAGS = ['Date Night', 'Outdoors', 'Social', 'Chill', 'Errands', 'Family', 'Adventure']

const EMPTY_FORM = {
  title: '',
  day: 'sat',
  time: '',
  location: '',
  who: 'both',
  tag: '',
  notes: '',
  done: false,
}

function getWeekendDates(weekStart) {
  return { sat: addDays(weekStart, 5), sun: addDays(weekStart, 6) }
}

export default function Weekend() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const baseWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset)
  const { sat, sun } = getWeekendDates(baseWeek)
  const weekKey = format(baseWeek, 'yyyy-MM-dd')
  const isThisWeekend = weekOffset === 0
  const today = new Date()

  const { householdId } = useHousehold()
  const { items: activities, addItem, updateItem, deleteItem, loading } = useStore(
    'weekend_activities',
    'hive-weekend-activities',
    {
      householdId,
      toRow: item => ({
        week_key: item.week_key || item.weekKey,
        title: item.title,
        day: item.day,
        time: item.time || null,
        location: item.location || null,
        who: item.who || 'both',
        tag: item.tag || null,
        notes: item.notes || null,
        done: item.done || false,
      }),
    }
  )

  // Filter to current week
  const weekActivities = activities.filter(a => a.week_key === weekKey || a.weekKey === weekKey)
  const satActivities = weekActivities
    .filter(a => a.day === 'sat')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const sunActivities = weekActivities
    .filter(a => a.day === 'sun')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  function openForm(item = null, defaultDay = 'sat') {
    if (item) {
      setEditingId(item.id)
      setForm({
        title: item.title,
        day: item.day,
        time: item.time || '',
        location: item.location || '',
        who: item.who || 'both',
        tag: item.tag || '',
        notes: item.notes || '',
        done: item.done || false,
      })
    } else {
      setEditingId(null)
      setForm({ ...EMPTY_FORM, day: defaultDay })
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    if (editingId) {
      await updateItem(editingId, {
        ...form,
        updated_at: new Date().toISOString(),
      })
    } else {
      await addItem({
        id: crypto.randomUUID(),
        week_key: weekKey,
        weekKey: weekKey,
        ...form,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    closeForm()
  }

  async function toggleDone(id) {
    const item = activities.find(a => a.id === id)
    if (item) {
      await updateItem(id, {
        done: !item.done,
        updated_at: new Date().toISOString(),
      })
    }
  }

  function renderDaySection(dayLabel, date, items, dayKey, isToday) {
    return (
      <div className={`weekend-day ${isToday ? 'weekend-day--today' : ''}`}>
        <div className="weekend-day-header">
          <div className="weekend-day-info">
            <h3>{dayLabel}</h3>
            <span className="text-muted">{format(date, 'MMM d')}</span>
            {isToday && <span className="weekend-today-badge">Today</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => openForm(null, dayKey)}>
            <Plus size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="weekend-empty-day">
            <p className="text-muted">Nothing planned</p>
          </div>
        ) : (
          <div className="weekend-activities">
            {items.map(item => (
              <div key={item.id} className={`card weekend-activity ${item.done ? 'weekend-activity--done' : ''}`}>
                <div className="weekend-activity-main">
                  <button
                    className={`weekend-check ${item.done ? 'weekend-check--done' : ''}`}
                    onClick={() => toggleDone(item.id)}
                  >
                    {item.done ? '✓' : ''}
                  </button>
                  <div className="weekend-activity-body">
                    <span className={`weekend-activity-title ${item.done ? 'weekend-activity-title--done' : ''}`}>
                      {item.title}
                    </span>
                    <div className="weekend-activity-meta">
                      {item.time && <span className="weekend-meta-item"><Clock size={12} /> {item.time}</span>}
                      {item.location && <span className="weekend-meta-item"><MapPin size={12} /> {item.location}</span>}
                      {item.who && (
                        <span className="weekend-meta-item">
                          {item.who === 'both' ? <Users size={12} /> : <User size={12} />}
                          {item.who === 'both' ? 'Together' : 'Solo'}
                        </span>
                      )}
                    </div>
                    {item.tag && <span className="weekend-tag">{item.tag}</span>}
                  </div>
                  <div className="weekend-activity-actions">
                    <button className="btn btn-ghost btn-icon" onClick={() => openForm(item)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon weekend-delete-btn" onClick={() => deleteItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {item.notes && <p className="weekend-activity-notes">{item.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Weekend</h2>
      <p className="text-muted">Plan your time off.</p>

      <div className="weekend-nav">
        <button className="btn btn-ghost btn-icon" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="weekend-nav-label">
          {isThisWeekend ? (
            <span className="weekend-nav-this">This Weekend</span>
          ) : (
            <span>{format(sat, 'MMM d')} – {format(sun, 'MMM d')}</span>
          )}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight size={20} />
        </button>
        {weekOffset !== 0 && (
          <button className="btn btn-ghost btn-sm weekend-today-btn" onClick={() => setWeekOffset(0)}>
            Today
          </button>
        )}
      </div>

      {renderDaySection('Saturday', sat, satActivities, 'sat', isSameDay(today, sat))}
      {renderDaySection('Sunday', sun, sunActivities, 'sun', isSameDay(today, sun))}

      {showForm && (
        <div className="weekend-modal-backdrop" onClick={closeForm}>
          <div className="card weekend-form-card" onClick={e => e.stopPropagation()}>
            <div className="weekend-form-header">
              <h3>{editingId ? 'Edit Activity' : 'Add Activity'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="weekend-form">
              <input type="text" placeholder="What's the plan?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              <div className="weekend-form-row">
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}>
                  <option value="sat">Saturday</option>
                  <option value="sun">Sunday</option>
                </select>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <input type="text" placeholder="Location (optional)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              <div className="weekend-form-row">
                <select value={form.who} onChange={e => setForm(f => ({ ...f, who: e.target.value }))}>
                  <option value="both">Together</option>
                  <option value="solo">Solo</option>
                </select>
                <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                  <option value="">No tag</option>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <textarea placeholder="Notes (optional)" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingId ? 'Save Changes' : 'Add Activity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
