import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Pencil, X, Star, BookOpen, Film, Tv, Gamepad2, Podcast,
  LayoutGrid, List, Filter
} from 'lucide-react'
import './Hobbies.css'

const MEDIA_KEY = 'hive-media-items'

const TYPES = [
  { value: 'book', label: 'Books', icon: BookOpen },
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'tv', label: 'TV Shows', icon: Tv },
  { value: 'game', label: 'Games', icon: Gamepad2 },
  { value: 'podcast', label: 'Podcasts', icon: Podcast },
]

const STATUSES = [
  { value: 'want', label: 'Want', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'amber' },
  { value: 'done', label: 'Done', color: 'green' },
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadItems() {
  try {
    const stored = localStorage.getItem(MEDIA_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveItems(items) {
  localStorage.setItem(MEDIA_KEY, JSON.stringify(items))
}

const EMPTY_FORM = {
  title: '', type: 'book', status: 'want', rating: null, notes: ''
}

export default function Hobbies() {
  const [items, setItems] = useState(loadItems)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState('grid')

  useEffect(() => { saveItems(items) }, [items])

  // Currently in progress
  const inProgress = items.filter(i => i.status === 'in_progress')

  // Filtered items
  const filtered = items.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    return true
  })

  function openForm(item = null) {
    if (item) {
      setEditingId(item.id)
      setForm({
        title: item.title,
        type: item.type,
        status: item.status,
        rating: item.rating,
        notes: item.notes || ''
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

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    const now = new Date().toISOString()

    if (editingId) {
      setItems(prev => prev.map(i =>
        i.id === editingId
          ? { ...i, ...form, updatedAt: now }
          : i
      ))
    } else {
      setItems(prev => [...prev, {
        id: generateId(),
        ...form,
        createdAt: now,
        updatedAt: now
      }])
    }
    closeForm()
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function setRating(id, rating) {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, rating, updatedAt: new Date().toISOString() } : i
    ))
  }

  function getTypeIcon(type) {
    const t = TYPES.find(tp => tp.value === type)
    return t ? t.icon : BookOpen
  }

  function getTypeLabel(type) {
    const t = TYPES.find(tp => tp.value === type)
    return t ? t.label : type
  }

  function getStatusInfo(status) {
    return STATUSES.find(s => s.value === status) || STATUSES[0]
  }

  return (
    <div className="page">
      <h2>Hobbies</h2>
      <p className="text-muted">Books, movies, games, and more.</p>

      {/* Currently section */}
      {inProgress.length > 0 && (
        <div className="card hobbies-currently">
          <h3>Currently</h3>
          <div className="hobbies-currently-list">
            {inProgress.map(item => {
              const Icon = getTypeIcon(item.type)
              return (
                <div key={item.id} className="hobbies-currently-item" onClick={() => openForm(item)}>
                  <Icon size={16} className="hobbies-type-icon" />
                  <span className="hobbies-currently-title">{item.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters and controls */}
      <div className="hobbies-controls">
        <div className="hobbies-type-filters">
          <button
            className={`hobbies-pill ${filterType === 'all' ? 'hobbies-pill--active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          {TYPES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                className={`hobbies-pill ${filterType === t.value ? 'hobbies-pill--active' : ''}`}
                onClick={() => setFilterType(t.value)}
              >
                <Icon size={14} />
                <span className="hobbies-pill-label">{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="hobbies-controls-row">
          <select
            className="hobbies-status-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="hobbies-view-toggle">
            <button
              className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'hobbies-view--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'hobbies-view--active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => openForm()}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="money-modal-backdrop" onClick={closeForm}>
          <div className="card money-form-card" onClick={e => e.stopPropagation()}>
            <div className="money-form-header">
              <h3>{editingId ? 'Edit Item' : 'Add Item'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="money-form">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <div className="money-form-row">
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="hobbies-rating-input">
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Rating:</span>
                <StarRating
                  rating={form.rating}
                  onChange={r => setForm(f => ({ ...f, rating: r }))}
                />
                {form.rating && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                    onClick={() => setForm(f => ({ ...f, rating: null }))}
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                placeholder="Notes (optional)"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="money-empty">
          <BookOpen size={32} />
          <p>{items.length === 0 ? 'Nothing tracked yet' : 'No items match your filters'}</p>
        </div>
      )}

      {/* Items grid/list */}
      <div className={viewMode === 'grid' ? 'hobbies-grid' : 'hobbies-list'}>
        {filtered.map(item => {
          const Icon = getTypeIcon(item.type)
          const statusInfo = getStatusInfo(item.status)
          return (
            <div key={item.id} className="card hobbies-item-card">
              <div className="hobbies-item-top">
                <Icon size={16} className="hobbies-type-icon" />
                <span className={`hobbies-status-badge hobbies-status--${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h4 className="hobbies-item-title">{item.title}</h4>
              <div className="hobbies-item-rating">
                <StarRating
                  rating={item.rating}
                  onChange={r => setRating(item.id, r)}
                  size={14}
                />
              </div>
              {item.notes && (
                <p className="hobbies-item-notes">{item.notes}</p>
              )}
              <div className="hobbies-item-actions">
                <button className="btn btn-ghost btn-icon" onClick={() => openForm(item)}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => deleteItem(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StarRating({ rating, onChange, size = 16 }) {
  return (
    <div className="hobbies-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`hobbies-star ${n <= (rating || 0) ? 'hobbies-star--filled' : ''}`}
          onClick={() => onChange(n)}
        >
          <Star size={size} />
        </button>
      ))}
    </div>
  )
}
