import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Calendar, X, FileText
} from 'lucide-react'
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns'
import './Tasks.css'

const LISTS_KEY = 'hive-task-lists'
const TASKS_KEY = 'hive-tasks'

const DEFAULT_LISTS = [
  { id: 'personal', name: 'Personal', icon: '🧑', isDefault: true },
  { id: 'shared', name: 'Shared', icon: '👥', isDefault: true },
  { id: 'home', name: 'Home', icon: '🏠', isDefault: true },
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadLists() {
  try {
    const stored = localStorage.getItem(LISTS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return DEFAULT_LISTS
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(TASKS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveLists(lists) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

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
  const [lists, setLists] = useState(loadLists)
  const [tasks, setTasks] = useState(loadTasks)
  const [activeListId, setActiveListId] = useState(() => loadLists()[0]?.id || 'personal')
  const [quickTitle, setQuickTitle] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState('📋')
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [editDue, setEditDue] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const quickInputRef = useRef(null)
  const listInputRef = useRef(null)
  const listScrollRef = useRef(null)

  // Persist
  useEffect(() => { saveLists(lists) }, [lists])
  useEffect(() => { saveTasks(tasks) }, [tasks])

  // Focus new list input when form opens
  useEffect(() => {
    if (showNewList && listInputRef.current) listInputRef.current.focus()
  }, [showNewList])

  // Derived
  const activeTasks = tasks
    .filter((t) => t.listId === activeListId)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const incompleteCount = (listId) =>
    tasks.filter((t) => t.listId === listId && !t.completed).length

  // Handlers
  function handleQuickAdd(e) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    const task = {
      id: generateId(),
      listId: activeListId,
      title,
      notes: '',
      dueDate: null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [task, ...prev])
    setQuickTitle('')
    quickInputRef.current?.focus()
  }

  function handleToggle(taskId) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t
      )
    )
  }

  function handleDelete(taskId) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    if (expandedTaskId === taskId) setExpandedTaskId(null)
  }

  function handleExpand(task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null)
    } else {
      setExpandedTaskId(task.id)
      setEditDue(task.dueDate ? task.dueDate.split('T')[0] : '')
      setEditNotes(task.notes || '')
    }
  }

  function handleSaveDetails(taskId) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              dueDate: editDue ? new Date(editDue + 'T00:00:00').toISOString() : null,
              notes: editNotes,
            }
          : t
      )
    )
    setExpandedTaskId(null)
  }

  function handleAddList(e) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    const newList = {
      id: generateId(),
      name,
      icon: newListIcon || '📋',
      isDefault: false,
    }
    setLists((prev) => [...prev, newList])
    setActiveListId(newList.id)
    setNewListName('')
    setNewListIcon('📋')
    setShowNewList(false)
  }

  function handleDeleteList(listId) {
    setLists((prev) => prev.filter((l) => l.id !== listId))
    setTasks((prev) => prev.filter((t) => t.listId !== listId))
    if (activeListId === listId) {
      setActiveListId(lists[0]?.id || 'personal')
    }
  }

  return (
    <div className="page tasks-page">
      <h2>Tasks</h2>
      <p className="text-muted">Stay on top of everything.</p>

      {/* List selector */}
      <div className="tasks-list-selector" ref={listScrollRef}>
        <div className="tasks-list-scroll">
          {lists.map((list) => (
            <button
              key={list.id}
              className={`tasks-pill ${activeListId === list.id ? 'tasks-pill--active' : ''}`}
              onClick={() => setActiveListId(list.id)}
            >
              <span className="tasks-pill-icon">{list.icon}</span>
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

      {/* New list inline form */}
      {showNewList && (
        <form className="tasks-new-list card" onSubmit={handleAddList}>
          <div className="tasks-new-list-row">
            <input
              ref={listInputRef}
              type="text"
              className="tasks-new-list-icon-input"
              value={newListIcon}
              onChange={(e) => setNewListIcon(e.target.value)}
              maxLength={2}
              aria-label="List icon"
            />
            <input
              type="text"
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="tasks-new-list-name-input"
            />
            <button type="submit" className="btn btn-primary tasks-new-list-btn">Add</button>
            <button
              type="button"
              className="btn btn-ghost tasks-new-list-btn"
              onClick={() => setShowNewList(false)}
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Quick add */}
      <form className="tasks-quick-add" onSubmit={handleQuickAdd}>
        <input
          ref={quickInputRef}
          type="text"
          placeholder="Add a task..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="tasks-quick-input"
        />
        <button
          type="submit"
          className="btn btn-primary tasks-quick-btn"
          disabled={!quickTitle.trim()}
        >
          <Plus size={18} />
        </button>
      </form>

      {/* Task list */}
      <div className="tasks-items">
        {activeTasks.length === 0 && (
          <div className="tasks-empty">
            <p className="text-muted">No tasks yet. Add one above.</p>
          </div>
        )}
        {activeTasks.map((task) => {
          const overdue = !task.completed && isDueOverdue(task.dueDate)
          const label = dueDateLabel(task.dueDate)
          const isExpanded = expandedTaskId === task.id

          return (
            <div
              key={task.id}
              className={`tasks-item card ${task.completed ? 'tasks-item--done' : ''} ${overdue ? 'tasks-item--overdue' : ''}`}
            >
              <div className="tasks-item-main">
                <label className="tasks-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task.id)}
                    className="tasks-checkbox"
                  />
                  <span className="tasks-checkbox-custom" />
                </label>

                <div className="tasks-item-body" onClick={() => handleExpand(task)}>
                  <span className={`tasks-item-title ${task.completed ? 'tasks-item-title--done' : ''}`}>
                    {task.title}
                  </span>
                  <div className="tasks-item-meta">
                    {label && (
                      <span className={`tasks-due-badge ${overdue ? 'tasks-due-badge--overdue' : ''}`}>
                        <Calendar size={12} />
                        {label}
                      </span>
                    )}
                    {task.notes && (
                      <span className="tasks-note-indicator">
                        <FileText size={12} />
                      </span>
                    )}
                  </div>
                </div>

                <div className="tasks-item-actions">
                  <button
                    className="btn btn-ghost tasks-expand-btn"
                    onClick={() => handleExpand(task)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    className="btn btn-ghost tasks-delete-btn"
                    onClick={() => handleDelete(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="tasks-item-details">
                  <div className="tasks-detail-field">
                    <label className="tasks-detail-label">Due date</label>
                    <input
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      className="tasks-detail-input"
                    />
                  </div>
                  <div className="tasks-detail-field">
                    <label className="tasks-detail-label">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add notes..."
                      rows={3}
                      className="tasks-detail-textarea"
                    />
                  </div>
                  <div className="tasks-detail-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSaveDetails(task.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setExpandedTaskId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete non-default list */}
      {lists.find((l) => l.id === activeListId && !l.isDefault) && (
        <button
          className="btn btn-ghost tasks-delete-list-btn"
          onClick={() => handleDeleteList(activeListId)}
        >
          <Trash2 size={14} />
          Delete this list
        </button>
      )}
    </div>
  )
}
