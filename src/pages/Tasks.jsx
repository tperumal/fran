import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Calendar, X, FileText
} from 'lucide-react'
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import './Tasks.css'

const DEFAULT_LISTS = [
  { name: 'Personal', icon: '🧑' },
  { name: 'Shared', icon: '👥' },
  { name: 'Home', icon: '🏠' },
]

function dueDateLabel(dueDate) {
  if (!dueDate) return null
  const date = parseISO(dueDate)
  if (isToday(date)) return 'Today'
  if (isPast(date)) return 'Overdue!'
  return formatDistanceToNow(date, { addSuffix: true })
}

function isDueOverdue(dueDate) {
  if (!dueDate) return false
  const date = parseISO(dueDate)
  return isPast(date) && !isToday(date)
}

export default function Tasks() {
  const { householdId } = useHousehold()

  const { items: lists, addItem: addList, updateItem: updateList, deleteItem: deleteList, loading: loadingLists } = useStore(
    'task_lists', 'hive-task-lists',
    {
      householdId,
      toRow: item => ({ name: item.name }),
      fromRow: row => ({ ...row, icon: '📋' }),
    }
  )

  const { items: tasks, addItem: addTask, updateItem: updateTask, deleteItem: deleteTask, loading: loadingTasks } = useStore(
    'tasks', 'hive-tasks',
    {
      profileColumn: 'created_by',
      skipProfileFilter: !!householdId,
      toRow: item => ({
        list_id: item.listId || item.list_id,
        title: item.title,
        description: item.notes || item.description || null,
        due_date: item.dueDate || item.due_date || null,
        completed: item.completed || false,
        completed_at: item.completedAt || item.completed_at || null,
      }),
      fromRow: row => ({
        ...row,
        listId: row.list_id,
        notes: row.description,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
      }),
    }
  )

  const [activeListId, setActiveListId] = useState(() => localStorage.getItem('fran-active-list-id'))
  const [quickTitle, setQuickTitle] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState('📋')
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [editDue, setEditDue] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [defaultsCreated, setDefaultsCreated] = useState(false)
  const quickInputRef = useRef(null)
  const listInputRef = useRef(null)

  // Create default lists on first load if none exist
  useEffect(() => {
    if (!loadingLists && lists.length === 0 && !defaultsCreated) {
      setDefaultsCreated(true)
      DEFAULT_LISTS.forEach(async (dl) => {
        await addList({
          id: crypto.randomUUID(),
          name: dl.name,
          icon: dl.icon,
          created_at: new Date().toISOString(),
        })
      })
    }
  }, [loadingLists, lists.length])

  // Set active list — restore from localStorage or fall back to first list
  useEffect(() => {
    if (lists.length > 0 && (!activeListId || !lists.find(l => l.id === activeListId))) {
      setActiveListId(lists[0].id)
    }
  }, [lists, activeListId])

  // Persist active list selection
  useEffect(() => {
    if (activeListId) localStorage.setItem('fran-active-list-id', activeListId)
  }, [activeListId])

  useEffect(() => {
    if (showNewList && listInputRef.current) listInputRef.current.focus()
  }, [showNewList])

  const activeTasks = tasks
    .filter(t => (t.listId || t.list_id) === activeListId)
    .sort((a, b) => {
      // Completed always at bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      // Then sort by selected method
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at)
        case 'due':
          if (!(a.dueDate || a.due_date) && !(b.dueDate || b.due_date)) return 0
          if (!(a.dueDate || a.due_date)) return 1
          if (!(b.dueDate || b.due_date)) return -1
          return new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date)
        case 'az':
          return a.title.localeCompare(b.title)
        case 'newest':
        default:
          return new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
      }
    })

  const incompleteCount = (listId) =>
    tasks.filter(t => (t.listId || t.list_id) === listId && !t.completed).length

  async function handleQuickAdd(e) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    await addTask({
      id: crypto.randomUUID(),
      listId: activeListId,
      list_id: activeListId,
      title,
      notes: '',
      description: '',
      dueDate: null,
      due_date: null,
      completed: false,
      completedAt: null,
      completed_at: null,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    setQuickTitle('')
    quickInputRef.current?.focus()
  }

  async function handleToggle(taskId) {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const now = !task.completed ? new Date().toISOString() : null
      await updateTask(taskId, {
        completed: !task.completed,
        completed_at: now,
      })
    }
  }

  async function handleDelete(taskId) {
    await deleteTask(taskId)
    if (expandedTaskId === taskId) setExpandedTaskId(null)
  }

  function handleExpand(task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null)
    } else {
      setExpandedTaskId(task.id)
      const due = task.dueDate || task.due_date
      setEditDue(due ? due.split('T')[0] : '')
      setEditNotes(task.notes || task.description || '')
    }
  }

  async function handleSaveDetails(taskId) {
    await updateTask(taskId, {
      dueDate: editDue ? new Date(editDue + 'T00:00:00').toISOString() : null,
      due_date: editDue ? new Date(editDue + 'T00:00:00').toISOString() : null,
      notes: editNotes,
      description: editNotes,
    })
    setExpandedTaskId(null)
  }

  async function handleAddList(e) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    const newList = await addList({
      id: crypto.randomUUID(),
      name,
      icon: newListIcon || '📋',
      created_at: new Date().toISOString(),
    })
    if (newList) setActiveListId(newList.id)
    setNewListName('')
    setNewListIcon('📋')
    setShowNewList(false)
  }

  async function handleDeleteList(listId) {
    // Delete all tasks in this list first
    const listTasks = tasks.filter(t => (t.listId || t.list_id) === listId)
    for (const t of listTasks) {
      await deleteTask(t.id)
    }
    await deleteList(listId)
    if (activeListId === listId) {
      setActiveListId(lists.find(l => l.id !== listId)?.id || null)
    }
  }

  if (loadingLists || loadingTasks) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page tasks-page">
      <h2>Tasks</h2>
      <p className="text-muted">Stay on top of everything.</p>

      <div className="tasks-list-selector">
        <div className="tasks-list-scroll">
          {lists.map((list) => (
            <button
              key={list.id}
              className={`tasks-pill ${activeListId === list.id ? 'tasks-pill--active' : ''}`}
              onClick={() => setActiveListId(list.id)}
            >
              <span className="tasks-pill-icon">{list.icon || '📋'}</span>
              <span className="tasks-pill-name">{list.name}</span>
              {incompleteCount(list.id) > 0 && (
                <span className="tasks-pill-count">{incompleteCount(list.id)}</span>
              )}
            </button>
          ))}
          <button
            className="tasks-pill tasks-pill--add"
            onClick={() => setShowNewList((v) => !v)}
            aria-label="Add new list"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {showNewList && (
        <form className="tasks-new-list card" onSubmit={handleAddList}>
          <div className="tasks-new-list-row">
            <input ref={listInputRef} type="text" className="tasks-new-list-icon-input" value={newListIcon} onChange={(e) => setNewListIcon(e.target.value)} maxLength={2} aria-label="List icon" />
            <input type="text" placeholder="List name" value={newListName} onChange={(e) => setNewListName(e.target.value)} className="tasks-new-list-name-input" />
            <button type="submit" className="btn btn-primary tasks-new-list-btn">Add</button>
            <button type="button" className="btn btn-ghost tasks-new-list-btn" onClick={() => setShowNewList(false)}><X size={16} /></button>
          </div>
        </form>
      )}

      <form className="tasks-quick-add" onSubmit={handleQuickAdd}>
        <input ref={quickInputRef} type="text" placeholder="Add a task..." value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} className="tasks-quick-input" />
        <button type="submit" className="btn btn-primary tasks-quick-btn" disabled={!quickTitle.trim()}><Plus size={18} /></button>
      </form>

      <div className="tasks-sort-row">
        <select className="tasks-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">NEWEST</option>
          <option value="oldest">OLDEST</option>
          <option value="due">DUE DATE</option>
          <option value="az">A — Z</option>
        </select>
      </div>

      <div className="tasks-items">
        {activeTasks.length === 0 && (
          <div className="tasks-empty"><p className="text-muted">No tasks yet. Add one above.</p></div>
        )}
        {activeTasks.map((task) => {
          const dueDate = task.dueDate || task.due_date
          const overdue = !task.completed && isDueOverdue(dueDate)
          const label = dueDateLabel(dueDate)
          const isExpanded = expandedTaskId === task.id
          const notes = task.notes || task.description

          return (
            <div key={task.id} className={`tasks-item card ${task.completed ? 'tasks-item--done' : ''} ${overdue ? 'tasks-item--overdue' : ''}`}>
              <div className="tasks-item-main">
                <label className="tasks-checkbox-wrap">
                  <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task.id)} className="tasks-checkbox" />
                  <span className="tasks-checkbox-custom" />
                </label>
                <div className="tasks-item-body" onClick={() => handleExpand(task)}>
                  <span className={`tasks-item-title ${task.completed ? 'tasks-item-title--done' : ''}`}>{task.title}</span>
                  <div className="tasks-item-meta">
                    {label && <span className={`tasks-due-badge ${overdue ? 'tasks-due-badge--overdue' : ''}`}><Calendar size={12} />{label}</span>}
                    {notes && <span className="tasks-note-indicator"><FileText size={12} /></span>}
                  </div>
                </div>
                <div className="tasks-item-actions">
                  <button className="btn btn-ghost tasks-expand-btn" onClick={() => handleExpand(task)}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                  <button className="btn btn-ghost tasks-delete-btn" onClick={() => handleDelete(task.id)}><Trash2 size={16} /></button>
                </div>
              </div>

              {isExpanded && (
                <div className="tasks-item-details">
                  <div className="tasks-detail-field">
                    <label className="tasks-detail-label">Due date</label>
                    <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="tasks-detail-input" />
                  </div>
                  <div className="tasks-detail-field">
                    <label className="tasks-detail-label">Notes</label>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add notes..." rows={3} className="tasks-detail-textarea" />
                  </div>
                  <div className="tasks-detail-actions">
                    <button className="btn btn-primary" onClick={() => handleSaveDetails(task.id)}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setExpandedTaskId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {lists.find((l) => l.id === activeListId) && (
        <div className="tasks-list-actions">
          <ShareToggle
            shared={!!lists.find(l => l.id === activeListId)?.household_id}
            onToggle={(share) => updateList(activeListId, { household_id: share ? householdId : null })}
          />
          {lists.length > 1 && (
            <button className="btn btn-ghost tasks-delete-list-btn" onClick={() => handleDeleteList(activeListId)}>
              <Trash2 size={14} /> Delete this list
            </button>
          )}
        </div>
      )}
    </div>
  )
}
