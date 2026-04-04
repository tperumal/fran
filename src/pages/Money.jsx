import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Pencil, X, DollarSign, PiggyBank, TrendingUp,
  AlertTriangle, Check, ChevronDown
} from 'lucide-react'
import {
  format, getDate, getDaysInMonth, addDays, isBefore, isAfter,
  startOfMonth, endOfMonth, parseISO
} from 'date-fns'
import './Money.css'

const BILLS_KEY = 'hive-bills'
const GOALS_KEY = 'hive-savings-goals'

const BILL_CATEGORIES = [
  'Housing', 'Utilities', 'Insurance', 'Subscriptions',
  'Loans', 'Transportation', 'Other'
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadBills() {
  try {
    const stored = localStorage.getItem(BILLS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveBills(bills) {
  localStorage.setItem(BILLS_KEY, JSON.stringify(bills))
}

function loadGoals() {
  try {
    const stored = localStorage.getItem(GOALS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

function formatDollars(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function isBillDueThisMonth(bill) {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  if (bill.frequency === 'monthly') return true

  if (bill.frequency === 'quarterly') {
    // Due every 3 months starting from creation month
    const created = bill.createdAt ? new Date(bill.createdAt) : now
    const diffMonths = (year - created.getFullYear()) * 12 + (month - created.getMonth())
    return diffMonths % 3 === 0
  }

  if (bill.frequency === 'yearly') {
    const created = bill.createdAt ? new Date(bill.createdAt) : now
    return created.getMonth() === month
  }

  return true
}

function getBillStatus(bill) {
  const now = new Date()
  const today = getDate(now)
  const dueDay = bill.dueDay
  const daysInMonth = getDaysInMonth(now)
  const effectiveDue = Math.min(dueDay, daysInMonth)

  if (!isBillDueThisMonth(bill)) return 'not-due'
  if (today > effectiveDue) return 'overdue'
  if (effectiveDue - today <= 7) return 'upcoming'
  return 'normal'
}

const EMPTY_BILL = {
  name: '', amount: '', dueDay: 1, frequency: 'monthly', category: 'Other'
}

const EMPTY_GOAL = {
  name: '', targetAmount: '', currentAmount: 0, deadline: ''
}

export default function Money() {
  const [tab, setTab] = useState('bills')
  const [bills, setBills] = useState(loadBills)
  const [goals, setGoals] = useState(loadGoals)

  // Bill form
  const [showBillForm, setShowBillForm] = useState(false)
  const [editingBillId, setEditingBillId] = useState(null)
  const [billForm, setBillForm] = useState(EMPTY_BILL)

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL)

  // Add funds modal
  const [addFundsGoalId, setAddFundsGoalId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')

  useEffect(() => { saveBills(bills) }, [bills])
  useEffect(() => { saveGoals(goals) }, [goals])

  // ---- Monthly overview ----
  const billsThisMonth = bills.filter(isBillDueThisMonth)
  const totalBillsThisMonth = billsThisMonth.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount), 0)
  const overallProgress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0

  // ---- Bill handlers ----
  function openBillForm(bill = null) {
    if (bill) {
      setEditingBillId(bill.id)
      setBillForm({
        name: bill.name,
        amount: bill.amount,
        dueDay: bill.dueDay,
        frequency: bill.frequency,
        category: bill.category
      })
    } else {
      setEditingBillId(null)
      setBillForm(EMPTY_BILL)
    }
    setShowBillForm(true)
  }

  function closeBillForm() {
    setShowBillForm(false)
    setEditingBillId(null)
    setBillForm(EMPTY_BILL)
  }

  function handleBillSubmit(e) {
    e.preventDefault()
    if (!billForm.name.trim() || !billForm.amount) return

    if (editingBillId) {
      setBills(prev => prev.map(b =>
        b.id === editingBillId
          ? { ...b, ...billForm, amount: Number(billForm.amount), dueDay: Number(billForm.dueDay) }
          : b
      ))
    } else {
      setBills(prev => [...prev, {
        id: generateId(),
        ...billForm,
        amount: Number(billForm.amount),
        dueDay: Number(billForm.dueDay),
        createdAt: new Date().toISOString()
      }])
    }
    closeBillForm()
  }

  function deleteBill(id) {
    setBills(prev => prev.filter(b => b.id !== id))
  }

  // ---- Goal handlers ----
  function openGoalForm(goal = null) {
    if (goal) {
      setEditingGoalId(goal.id)
      setGoalForm({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline || ''
      })
    } else {
      setEditingGoalId(null)
      setGoalForm(EMPTY_GOAL)
    }
    setShowGoalForm(true)
  }

  function closeGoalForm() {
    setShowGoalForm(false)
    setEditingGoalId(null)
    setGoalForm(EMPTY_GOAL)
  }

  function handleGoalSubmit(e) {
    e.preventDefault()
    if (!goalForm.name.trim() || !goalForm.targetAmount) return

    if (editingGoalId) {
      setGoals(prev => prev.map(g =>
        g.id === editingGoalId
          ? {
              ...g,
              name: goalForm.name,
              targetAmount: Number(goalForm.targetAmount),
              currentAmount: Number(goalForm.currentAmount),
              deadline: goalForm.deadline || null
            }
          : g
      ))
    } else {
      setGoals(prev => [...prev, {
        id: generateId(),
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        currentAmount: 0,
        deadline: goalForm.deadline || null,
        createdAt: new Date().toISOString()
      }])
    }
    closeGoalForm()
  }

  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  function handleAddFunds(e) {
    e.preventDefault()
    if (!addFundsAmount || Number(addFundsAmount) <= 0) return
    setGoals(prev => prev.map(g =>
      g.id === addFundsGoalId
        ? { ...g, currentAmount: Number(g.currentAmount) + Number(addFundsAmount) }
        : g
    ))
    setAddFundsGoalId(null)
    setAddFundsAmount('')
  }

  // Sort bills by due day
  const sortedBills = [...billsThisMonth].sort((a, b) => a.dueDay - b.dueDay)
  const otherBills = bills.filter(b => !isBillDueThisMonth(b))

  return (
    <div className="page">
      <h2>Money</h2>
      <p className="text-muted">Budgets, bills, and savings.</p>

      {/* Monthly overview */}
      <div className="card money-overview">
        <h3>Monthly Overview</h3>
        <div className="money-overview-grid">
          <div className="money-overview-stat">
            <DollarSign size={18} />
            <div>
              <span className="money-stat-value">{formatDollars(totalBillsThisMonth)}</span>
              <span className="money-stat-label">Bills this month</span>
            </div>
          </div>
          <div className="money-overview-stat">
            <PiggyBank size={18} />
            <div>
              <span className="money-stat-value">{formatDollars(totalSaved)}</span>
              <span className="money-stat-label">
                {totalTarget > 0
                  ? `${overallProgress.toFixed(0)}% of ${formatDollars(totalTarget)}`
                  : 'Total saved'}
              </span>
            </div>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="money-progress-bar">
            <div
              className="money-progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="money-tabs">
        <button
          className={`money-tab ${tab === 'bills' ? 'money-tab--active' : ''}`}
          onClick={() => setTab('bills')}
        >
          <DollarSign size={16} />
          Bills
        </button>
        <button
          className={`money-tab ${tab === 'savings' ? 'money-tab--active' : ''}`}
          onClick={() => setTab('savings')}
        >
          <PiggyBank size={16} />
          Savings
        </button>
      </div>

      {/* Bills Tab */}
      {tab === 'bills' && (
        <div className="money-section">
          <div className="money-section-header">
            <h3>Due This Month</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openBillForm()}>
              <Plus size={16} /> Add Bill
            </button>
          </div>

          {sortedBills.length === 0 && !showBillForm && (
            <div className="money-empty">
              <DollarSign size={32} />
              <p>No bills added yet</p>
            </div>
          )}

          {/* Bill form modal */}
          {showBillForm && (
            <div className="money-modal-backdrop" onClick={closeBillForm}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header">
                  <h3>{editingBillId ? 'Edit Bill' : 'Add Bill'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={closeBillForm}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleBillSubmit} className="money-form">
                  <input
                    type="text"
                    placeholder="Bill name"
                    value={billForm.name}
                    onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                  <div className="money-form-row">
                    <input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={billForm.amount}
                      onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Due day"
                      min="1"
                      max="31"
                      value={billForm.dueDay}
                      onChange={e => setBillForm(f => ({ ...f, dueDay: e.target.value }))}
                    />
                  </div>
                  <div className="money-form-row">
                    <select
                      value={billForm.frequency}
                      onChange={e => setBillForm(f => ({ ...f, frequency: e.target.value }))}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <select
                      value={billForm.category}
                      onChange={e => setBillForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {BILL_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    {editingBillId ? 'Save Changes' : 'Add Bill'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="money-list">
            {sortedBills.map(bill => {
              const status = getBillStatus(bill)
              return (
                <div key={bill.id} className={`card money-bill-card money-bill--${status}`}>
                  <div className="money-bill-main">
                    <div className="money-bill-info">
                      <span className="money-bill-name">{bill.name}</span>
                      <span className="money-bill-meta">
                        Due {bill.dueDay}{ordinalSuffix(bill.dueDay)} &middot; {bill.frequency} &middot; {bill.category}
                      </span>
                    </div>
                    <div className="money-bill-right">
                      <span className="money-bill-amount">{formatDollars(bill.amount)}</span>
                      {status === 'overdue' && (
                        <span className="money-badge money-badge--overdue">
                          <AlertTriangle size={12} /> Overdue
                        </span>
                      )}
                      {status === 'upcoming' && (
                        <span className="money-badge money-badge--upcoming">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="money-bill-actions">
                    <button className="btn btn-ghost btn-icon" onClick={() => openBillForm(bill)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteBill(bill.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {otherBills.length > 0 && (
            <>
              <h3 className="money-subheading">Not Due This Month</h3>
              <div className="money-list">
                {otherBills.map(bill => (
                  <div key={bill.id} className="card money-bill-card money-bill--not-due">
                    <div className="money-bill-main">
                      <div className="money-bill-info">
                        <span className="money-bill-name">{bill.name}</span>
                        <span className="money-bill-meta">
                          Due {bill.dueDay}{ordinalSuffix(bill.dueDay)} &middot; {bill.frequency} &middot; {bill.category}
                        </span>
                      </div>
                      <div className="money-bill-right">
                        <span className="money-bill-amount">{formatDollars(bill.amount)}</span>
                      </div>
                    </div>
                    <div className="money-bill-actions">
                      <button className="btn btn-ghost btn-icon" onClick={() => openBillForm(bill)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => deleteBill(bill.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Savings Tab */}
      {tab === 'savings' && (
        <div className="money-section">
          <div className="money-section-header">
            <h3>Savings Goals</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openGoalForm()}>
              <Plus size={16} /> Add Goal
            </button>
          </div>

          {goals.length === 0 && !showGoalForm && (
            <div className="money-empty">
              <PiggyBank size={32} />
              <p>No savings goals yet</p>
            </div>
          )}

          {/* Goal form modal */}
          {showGoalForm && (
            <div className="money-modal-backdrop" onClick={closeGoalForm}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header">
                  <h3>{editingGoalId ? 'Edit Goal' : 'Add Goal'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={closeGoalForm}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleGoalSubmit} className="money-form">
                  <input
                    type="text"
                    placeholder="Goal name (e.g. Emergency fund)"
                    value={goalForm.name}
                    onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                  <div className="money-form-row">
                    <input
                      type="number"
                      placeholder="Target amount"
                      min="0"
                      step="0.01"
                      value={goalForm.targetAmount}
                      onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                    />
                    {editingGoalId && (
                      <input
                        type="number"
                        placeholder="Current amount"
                        min="0"
                        step="0.01"
                        value={goalForm.currentAmount}
                        onChange={e => setGoalForm(f => ({ ...f, currentAmount: e.target.value }))}
                      />
                    )}
                  </div>
                  <input
                    type="date"
                    value={goalForm.deadline}
                    onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                  <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: -8 }}>
                    Optional deadline
                  </span>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    {editingGoalId ? 'Save Changes' : 'Add Goal'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Add funds modal */}
          {addFundsGoalId && (
            <div className="money-modal-backdrop" onClick={() => { setAddFundsGoalId(null); setAddFundsAmount('') }}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header">
                  <h3>Add Funds</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setAddFundsGoalId(null); setAddFundsAmount('') }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddFunds} className="money-form">
                  <input
                    type="number"
                    placeholder="Amount to add"
                    min="0.01"
                    step="0.01"
                    value={addFundsAmount}
                    onChange={e => setAddFundsAmount(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <TrendingUp size={16} /> Add Funds
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="money-list">
            {goals.map(goal => {
              const pct = goal.targetAmount > 0
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0
              const isComplete = pct >= 100
              return (
                <div key={goal.id} className="card money-goal-card">
                  <div className="money-goal-header">
                    <div className="money-goal-info">
                      <span className="money-goal-name">
                        {isComplete && <Check size={16} className="money-goal-check" />}
                        {goal.name}
                      </span>
                      {goal.deadline && (
                        <span className="money-goal-deadline">
                          by {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <div className="money-goal-amounts">
                      <span className="money-goal-current">{formatDollars(goal.currentAmount)}</span>
                      <span className="money-goal-target">of {formatDollars(goal.targetAmount)}</span>
                    </div>
                  </div>
                  <div className="money-progress-bar">
                    <div
                      className={`money-progress-fill ${isComplete ? 'money-progress-fill--complete' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="money-goal-pct">{pct.toFixed(0)}%</span>
                  <div className="money-goal-actions">
                    {!isComplete && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setAddFundsGoalId(goal.id); setAddFundsAmount('') }}
                      >
                        <TrendingUp size={14} /> Add Funds
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon" onClick={() => openGoalForm(goal)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ordinalSuffix(n) {
  const num = Number(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
