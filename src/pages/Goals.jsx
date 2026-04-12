import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, X, Target, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { format } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import supabase from '../lib/supabase'
import useAuth from '../hooks/useAuth'
import './Goals.css'

export default function Goals() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { items: goals, addItem, updateItem, deleteItem, loading } = useStore(
    'goals',
    'hive-goals',
    { householdId, orderBy: 'order', ascending: true }
  )

  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [newGoalTitle, setNewGoalTitle] = useState('')

  // Sub-items state
  const [subItems, setSubItems] = useState([])
  const [checkIns, setCheckIns] = useState([])
  const [newSubText, setNewSubText] = useState('')
  const [newSubType, setNewSubType] = useState('habit')

  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchSubItems = useCallback(async (goalId) => {
    const { data } = await supabase
      .from('goal_items')
      .select('*')
      .eq('goal_id', goalId)
      .order('order', { ascending: true })
    setSubItems(data || [])
  }, [])

  const fetchCheckIns = useCallback(async (goalId) => {
    if (!user) return
    const { data: items } = await supabase
      .from('goal_items')
      .select('id')
      .eq('goal_id', goalId)
    if (!items || items.length === 0) { setCheckIns([]); return }
    const itemIds = items.map(i => i.id)
    const { data } = await supabase
      .from('goal_check_ins')
      .select('*')
      .in('goal_item_id', itemIds)
      .eq('profile_id', user.id)
      .eq('date', today)
    setCheckIns(data || [])
  }, [user, today])

  useEffect(() => {
    if (expandedId) {
      fetchSubItems(expandedId)
      fetchCheckIns(expandedId)
    } else {
      setSubItems([])
      setCheckIns([])
    }
  }, [expandedId, fetchSubItems, fetchCheckIns])

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
    setEditingId(null)
  }

  // Goal CRUD
  async function handleAddGoal() {
    if (!newGoalTitle.trim()) return
    await addItem({
      id: crypto.randomUUID(),
      title: newGoalTitle.trim(),
      description: '',
      order: goals.length,
      created_at: new Date().toISOString(),
    })
    setNewGoalTitle('')
  }

  function startEdit(goal) {
    setEditingId(goal.id)
    setEditForm({ title: goal.title, description: goal.description || '' })
  }

  async function saveEdit(id) {
    if (!editForm.title.trim()) return
    await updateItem(id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
    })
    setEditingId(null)
  }

  async function handleDeleteGoal(id) {
    await deleteItem(id)
    if (expandedId === id) setExpandedId(null)
  }

  // Sub-item CRUD
  async function addSubItem(goalId) {
    if (!newSubText.trim()) return
    const item = {
      id: crypto.randomUUID(),
      goal_id: goalId,
      text: newSubText.trim(),
      type: newSubType,
      order: subItems.length,
      created_at: new Date().toISOString(),
    }
    await supabase.from('goal_items').insert(item)
    setNewSubText('')
    fetchSubItems(goalId)
  }

  async function deleteSubItem(itemId, goalId) {
    await supabase.from('goal_items').delete().eq('id', itemId)
    fetchSubItems(goalId)
    fetchCheckIns(goalId)
  }

  // Check-in toggle
  async function toggleCheckIn(goalItemId) {
    const existing = checkIns.find(c => c.goal_item_id === goalItemId)
    if (existing) {
      await supabase.from('goal_check_ins').delete().eq('id', existing.id)
    } else {
      await supabase.from('goal_check_ins').insert({
        id: crypto.randomUUID(),
        goal_item_id: goalItemId,
        profile_id: user.id,
        date: today,
        checked: true,
      })
    }
    fetchCheckIns(expandedId)
  }

  function isChecked(goalItemId) {
    return checkIns.some(c => c.goal_item_id === goalItemId)
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Goals</h2>
      <p className="text-muted">Track goals, habits, and notes.</p>

      <div className="goals-controls">
        <input
          type="text"
          placeholder="New goal..."
          value={newGoalTitle}
          onChange={e => setNewGoalTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAddGoal}>
          <Plus size={16} /> Add
        </button>
      </div>

      {goals.length === 0 && (
        <div className="goals-empty">
          <Target size={32} />
          <p>No goals yet</p>
        </div>
      )}

      <div className="goals-list">
        {goals.map(goal => {
          const isExpanded = expandedId === goal.id
          const isEditing = editingId === goal.id

          return (
            <div key={goal.id} className="card goal-card">
              <div className="goal-card-main" onClick={() => toggleExpand(goal.id)}>
                <div className="goal-card-icon">
                  <Target size={16} />
                </div>
                <div className="goal-card-body">
                  <span className="goal-card-title">{goal.title}</span>
                  {goal.description && !isExpanded && (
                    <span className="goal-card-desc">{goal.description}</span>
                  )}
                </div>
                <div className="goal-card-actions">
                  <ShareToggle
                    shared={!!goal.household_id}
                    onToggle={(share) => updateItem(goal.id, { household_id: share ? householdId : null })}
                  />
                  {isExpanded
                    ? <ChevronUp size={16} className="goal-chevron" />
                    : <ChevronDown size={16} className="goal-chevron" />
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="goal-expanded">
                  {isEditing ? (
                    <div className="goal-edit-form">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Goal title"
                        autoFocus
                      />
                      <textarea
                        rows={2}
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                      <div className="goal-item-btns">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(goal.id)}>
                          <Check size={14} /> Save
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {goal.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                          {goal.description}
                        </p>
                      )}

                      {subItems.length > 0 && (
                        <div className="goal-subitems">
                          {subItems.map(item => (
                            <div key={item.id} className="goal-subitem">
                              {item.type === 'habit' ? (
                                <button
                                  className={`goal-checkbox ${isChecked(item.id) ? 'goal-checkbox--checked' : ''}`}
                                  onClick={() => toggleCheckIn(item.id)}
                                >
                                  {isChecked(item.id) && <Check size={12} />}
                                </button>
                              ) : (
                                <span className="goal-bullet" />
                              )}
                              <span className="goal-subitem-text">{item.text}</span>
                              <button
                                className="btn btn-ghost btn-icon goal-subitem-delete"
                                onClick={() => deleteSubItem(item.id, goal.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="goal-add-subitem">
                        <input
                          type="text"
                          placeholder="Add item..."
                          value={newSubText}
                          onChange={e => setNewSubText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addSubItem(goal.id)}
                        />
                        <select value={newSubType} onChange={e => setNewSubType(e.target.value)}>
                          <option value="habit">Habit</option>
                          <option value="note">Note</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={() => addSubItem(goal.id)}>
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="goal-item-btns">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(goal)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button className="btn btn-ghost btn-sm goal-delete-btn" onClick={() => handleDeleteGoal(goal.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
