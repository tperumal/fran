import { useState } from 'react'
import {
  Plus, Trash2, Pencil, X, Trophy, Target, TrendingUp,
  Calendar, ChevronDown, ChevronUp
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import './Career.css'

const CATEGORIES = [
  { value: 'promotion', label: 'Promotion', icon: TrendingUp, color: 'green' },
  { value: 'achievement', label: 'Achievement', icon: Trophy, color: 'amber' },
  { value: 'goal', label: 'Goal', icon: Target, color: 'blue' },
]

const EMPTY_FORM = {
  title: '',
  category: 'achievement',
  date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  completed: false,
}

export default function Career() {
  const { householdId } = useHousehold()
  const { items: milestones, addItem, updateItem, deleteItem, loading } = useStore(
    'career_milestones',
    'hive-career-milestones',
    {
      householdId,
      orderBy: 'date',
      ascending: false,
    }
  )

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterCat, setFilterCat] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = milestones
    .filter(m => filterCat === 'all' || m.category === filterCat)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const totalAchieved = milestones.filter(m => m.category !== 'goal' || m.completed).length
  const activeGoals = milestones.filter(m => m.category === 'goal' && !m.completed).length

  function openForm(item = null) {
    if (item) {
      setEditingId(item.id)
      setForm({
        title: item.title,
        category: item.category,
        date: item.date,
        description: item.description || '',
        completed: item.completed || false,
      })
    } else {
      setEditingId(null)
      setForm(EMPTY_FORM)
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
        ...form,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    closeForm()
  }

  async function handleDelete(id) {
    await deleteItem(id)
    if (expandedId === id) setExpandedId(null)
  }

  async function toggleCompleted(id) {
    const item = milestones.find(m => m.id === id)
    if (item) {
      await updateItem(id, {
        completed: !item.completed,
        updated_at: new Date().toISOString(),
      })
    }
  }

  function getCategoryInfo(cat) {
    return CATEGORIES.find(c => c.value === cat) || CATEGORIES[1]
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Career</h2>
      <p className="text-muted">Track milestones and goals.</p>

      <div className="career-stats">
        <div className="career-stat">
          <span className="career-stat-number">{totalAchieved}</span>
          <span className="career-stat-label">Milestones</span>
        </div>
        <div className="career-stat">
          <span className="career-stat-number">{activeGoals}</span>
          <span className="career-stat-label">Active Goals</span>
        </div>
      </div>

      <div className="career-controls">
        <div className="career-filters">
          <button
            className={`career-pill ${filterCat === 'all' ? 'career-pill--active' : ''}`}
            onClick={() => setFilterCat('all')}
          >All</button>
          {CATEGORIES.map(c => {
            const Icon = c.icon
            return (
              <button
                key={c.value}
                className={`career-pill ${filterCat === c.value ? 'career-pill--active' : ''}`}
                onClick={() => setFilterCat(c.value)}
              >
                <Icon size={14} />
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openForm()}>
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <div className="career-modal-backdrop" onClick={closeForm}>
          <div className="card career-form-card" onClick={e => e.stopPropagation()}>
            <div className="career-form-header">
              <h3>{editingId ? 'Edit Milestone' : 'Add Milestone'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="career-form">
              <input
                type="text"
                placeholder="What did you achieve?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <div className="career-form-row">
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <textarea
                placeholder="Details (optional)"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              {form.category === 'goal' && (
                <label className="career-completed-toggle">
                  <input
                    type="checkbox"
                    checked={form.completed}
                    onChange={e => setForm(f => ({ ...f, completed: e.target.checked }))}
                  />
                  <span>Mark as completed</span>
                </label>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingId ? 'Save Changes' : 'Add Milestone'}
              </button>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="career-empty">
          <Trophy size={32} />
          <p>{milestones.length === 0 ? 'No milestones yet' : 'No items match your filter'}</p>
        </div>
      )}

      <div className="career-timeline">
        {filtered.map(item => {
          const catInfo = getCategoryInfo(item.category)
          const Icon = catInfo.icon
          const isExpanded = expandedId === item.id

          return (
            <div key={item.id} className={`card career-item ${item.category === 'goal' && !item.completed ? 'career-item--pending' : ''}`}>
              <div className="career-item-main" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                <div className={`career-item-icon career-icon--${catInfo.color}`}>
                  <Icon size={16} />
                </div>
                <div className="career-item-body">
                  <span className="career-item-title">{item.title}</span>
                  <span className="career-item-date">
                    <Calendar size={12} />
                    {format(parseISO(item.date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="career-item-actions">
                  <ShareToggle
                    shared={!!item.household_id}
                    onToggle={(share) => updateItem(item.id, { household_id: share ? householdId : null })}
                  />
                  {item.category === 'goal' && (
                    <button
                      className={`career-goal-check ${item.completed ? 'career-goal-check--done' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleCompleted(item.id) }}
                      title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.completed ? '✓' : '○'}
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="career-chevron" /> : <ChevronDown size={16} className="career-chevron" />}
                </div>
              </div>

              {isExpanded && (
                <div className="career-item-expanded">
                  {item.description && <p className="career-item-desc">{item.description}</p>}
                  <div className="career-item-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => openForm(item)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button className="btn btn-ghost btn-sm career-delete-btn" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
