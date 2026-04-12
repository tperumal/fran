import { useState } from 'react'
import {
  Plus, Trash2, Pencil, X, Star, BookOpen, Film, Tv, Gamepad2, Podcast,
  LayoutGrid, List
} from 'lucide-react'
import useStore from '../hooks/useStore'
import './Hobbies.css'

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

const EMPTY_FORM = {
  title: '', type: 'book', status: 'want', rating: null, notes: ''
}

export default function Hobbies() {
  const { items, addItem, updateItem, deleteItem, loading } = useStore(
    'media_items',
    'hive-media-items',
    {
      fromRow: row => ({
        ...row,
        type: row.media_type || row.type,
      }),
      toRow: item => ({
        title: item.title,
        media_type: item.type,
        status: item.status,
        rating: item.rating,
        notes: item.notes || null,
      }),
    }
  )

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState('grid')

  const inProgress = items.filter(i => i.status === 'in_progress')

  const filtered = items.filter(i => {
    const t = i.media_type || i.type
    if (filterType !== 'all' && t !== filterType) return false
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    return true
  })

  function openForm(item = null) {
    if (item) {
      setEditingId(item.id)
      setForm({
        title: item.title,
        type: item.media_type || item.type,
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    if (editingId) {
      await updateItem(editingId, {
        title: form.title,
        media_type: form.type,
        status: form.status,
        rating: form.rating,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      })
    } else {
      await addItem({
        id: crypto.randomUUID(),
        title: form.title,
        media_type: form.type,
        type: form.type,
        status: form.status,
        rating: form.rating,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    closeForm()
  }

  async function setRating(id, rating) {
    await updateItem(id, { rating, updated_at: new Date().toISOString() })
  }

  function getTypeIcon(type) {
    const t = TYPES.find(tp => tp.value === type)
    return t ? t.icon : BookOpen
  }

  function getStatusInfo(status) {
    return STATUSES.find(s => s.value === status) || STATUSES[0]
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Hobbies</h2>
      <p className="text-muted">Books, movies, games, and more.</p>

      {inProgress.length > 0 && (
        <div className="card hobbies-currently">
          <h3>Currently</h3>
          <div className="hobbies-currently-list">
            {inProgress.map(item => {
              const Icon = getTypeIcon(item.media_type || item.type)
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

      <div className="hobbies-controls">
        <div className="hobbies-type-filters">
          <button className={`hobbies-pill ${filterType === 'all' ? 'hobbies-pill--active' : ''}`} onClick={() => setFilterType('all')}>All</button>
          {TYPES.map(t => {
            const Icon = t.icon
            return (
              <button key={t.value} className={`hobbies-pill ${filterType === t.value ? 'hobbies-pill--active' : ''}`} onClick={() => setFilterType(t.value)}>
                <Icon size={14} />
                <span className="hobbies-pill-label">{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="hobbies-controls-row">
          <select className="hobbies-status-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="hobbies-view-toggle">
            <button className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'hobbies-view--active' : ''}`} onClick={() => setViewMode('grid')}>
              <LayoutGrid size={16} />
            </button>
            <button className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'hobbies-view--active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={16} />
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openForm()}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {showForm && (
        <div className="money-modal-backdrop" onClick={closeForm}>
          <div className="card money-form-card" onClick={e => e.stopPropagation()}>
            <div className="money-form-header">
              <h3>{editingId ? 'Edit Item' : 'Add Item'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="money-form">
              <input type="text" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              <div className="money-form-row">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="hobbies-rating-input">
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Rating:</span>
                <StarRating rating={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
                {form.rating && (
                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '2px 6px' }} onClick={() => setForm(f => ({ ...f, rating: null }))}>Clear</button>
                )}
              </div>
              <textarea placeholder="Notes (optional)" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="money-empty">
          <BookOpen size={32} />
          <p>{items.length === 0 ? 'Nothing tracked yet' : 'No items match your filters'}</p>
        </div>
      )}

      <div className={viewMode === 'grid' ? 'hobbies-grid' : 'hobbies-list'}>
        {filtered.map(item => {
          const Icon = getTypeIcon(item.media_type || item.type)
          const statusInfo = getStatusInfo(item.status)
          return (
            <div key={item.id} className="card hobbies-item-card">
              <div className="hobbies-item-top">
                <Icon size={16} className="hobbies-type-icon" />
                <span className={`hobbies-status-badge hobbies-status--${statusInfo.color}`}>{statusInfo.label}</span>
              </div>
              <h4 className="hobbies-item-title">{item.title}</h4>
              <div className="hobbies-item-rating">
                <StarRating rating={item.rating} onChange={r => setRating(item.id, r)} size={14} />
              </div>
              {item.notes && <p className="hobbies-item-notes">{item.notes}</p>}
              <div className="hobbies-item-actions">
                <button className="btn btn-ghost btn-icon" onClick={() => openForm(item)}><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-icon" onClick={() => deleteItem(item.id)}><Trash2 size={14} /></button>
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
        <button key={n} type="button" className={`hobbies-star ${n <= (rating || 0) ? 'hobbies-star--filled' : ''}`} onClick={() => onChange(n)}>
          <Star size={size} />
        </button>
      ))}
    </div>
  )
}
