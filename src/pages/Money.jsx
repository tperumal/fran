import { useState } from 'react'
import {
  Plus, Trash2, Pencil, X, DollarSign, PiggyBank, TrendingUp,
  AlertTriangle, Check
} from 'lucide-react'
import { format, getDate, getDaysInMonth, parseISO } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import './Money.css'

const BILL_CATEGORIES = [
  'Housing', 'Utilities', 'Insurance', 'Subscriptions',
  'Loans', 'Transportation', 'Other'
]

function formatDollars(amount) {
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isBillDueThisMonth(bill) {
  const now = new Date()
  const month = now.getMonth()
  if (bill.frequency === 'monthly') return true
  if (bill.frequency === 'quarterly') {
    const created = bill.created_at ? new Date(bill.created_at) : (bill.createdAt ? new Date(bill.createdAt) : now)
    const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (month - created.getMonth())
    return diffMonths % 3 === 0
  }
  if (bill.frequency === 'yearly') {
    const created = bill.created_at ? new Date(bill.created_at) : (bill.createdAt ? new Date(bill.createdAt) : now)
    return created.getMonth() === month
  }
  return true
}

function getBillStatus(bill) {
  const now = new Date()
  const today = getDate(now)
  const dueDay = bill.due_day || bill.dueDay
  const effectiveDue = Math.min(dueDay, getDaysInMonth(now))
  if (!isBillDueThisMonth(bill)) return 'not-due'
  if (today > effectiveDue) return 'overdue'
  if (effectiveDue - today <= 7) return 'upcoming'
  return 'normal'
}

function ordinalSuffix(n) {
  const num = Number(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const EMPTY_BILL = { name: '', amount: '', dueDay: 1, frequency: 'monthly', category: 'Other' }
const EMPTY_GOAL = { name: '', targetAmount: '', currentAmount: 0, deadline: '' }

export default function Money() {
  const { householdId } = useHousehold()

  const { items: bills, addItem: addBill, updateItem: updateBill, deleteItem: deleteBill, loading: loadingBills } = useStore(
    'bills', 'hive-bills',
    {
      householdId,
      toRow: item => ({
        name: item.name,
        amount: Number(item.amount),
        due_day: Number(item.dueDay || item.due_day),
        frequency: item.frequency,
        category: item.category,
      }),
      fromRow: row => ({
        ...row,
        dueDay: row.due_day,
        amount: Number(row.amount),
      }),
    }
  )

  const { items: goals, addItem: addGoal, updateItem: updateGoal, deleteItem: deleteGoal, loading: loadingGoals } = useStore(
    'savings_goals', 'hive-savings-goals',
    {
      householdId,
      toRow: item => ({
        name: item.name,
        target_amount: Number(item.targetAmount || item.target_amount),
        current_amount: Number(item.currentAmount || item.current_amount || 0),
        deadline: item.deadline || null,
      }),
      fromRow: row => ({
        ...row,
        targetAmount: Number(row.target_amount),
        currentAmount: Number(row.current_amount),
      }),
    }
  )

  const [tab, setTab] = useState('bills')
  const [showBillForm, setShowBillForm] = useState(false)
  const [editingBillId, setEditingBillId] = useState(null)
  const [billForm, setBillForm] = useState(EMPTY_BILL)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL)
  const [addFundsGoalId, setAddFundsGoalId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')

  const billsThisMonth = bills.filter(isBillDueThisMonth)
  const totalBillsThisMonth = billsThisMonth.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || g.current_amount || 0), 0)
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount || g.target_amount || 0), 0)
  const overallProgress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0

  function openBillForm(bill = null) {
    if (bill) {
      setEditingBillId(bill.id)
      setBillForm({ name: bill.name, amount: bill.amount, dueDay: bill.dueDay || bill.due_day, frequency: bill.frequency, category: bill.category })
    } else {
      setEditingBillId(null)
      setBillForm(EMPTY_BILL)
    }
    setShowBillForm(true)
  }

  function closeBillForm() { setShowBillForm(false); setEditingBillId(null); setBillForm(EMPTY_BILL) }

  async function handleBillSubmit(e) {
    e.preventDefault()
    if (!billForm.name.trim() || !billForm.amount) return
    if (editingBillId) {
      await updateBill(editingBillId, {
        name: billForm.name, amount: Number(billForm.amount),
        due_day: Number(billForm.dueDay), dueDay: Number(billForm.dueDay),
        frequency: billForm.frequency, category: billForm.category,
      })
    } else {
      await addBill({
        id: crypto.randomUUID(), name: billForm.name, amount: Number(billForm.amount),
        due_day: Number(billForm.dueDay), dueDay: Number(billForm.dueDay),
        frequency: billForm.frequency, category: billForm.category,
        created_at: new Date().toISOString(), createdAt: new Date().toISOString(),
      })
    }
    closeBillForm()
  }

  function openGoalForm(goal = null) {
    if (goal) {
      setEditingGoalId(goal.id)
      setGoalForm({ name: goal.name, targetAmount: goal.targetAmount || goal.target_amount, currentAmount: goal.currentAmount || goal.current_amount, deadline: goal.deadline || '' })
    } else {
      setEditingGoalId(null)
      setGoalForm(EMPTY_GOAL)
    }
    setShowGoalForm(true)
  }

  function closeGoalForm() { setShowGoalForm(false); setEditingGoalId(null); setGoalForm(EMPTY_GOAL) }

  async function handleGoalSubmit(e) {
    e.preventDefault()
    if (!goalForm.name.trim() || !goalForm.targetAmount) return
    if (editingGoalId) {
      await updateGoal(editingGoalId, {
        name: goalForm.name, target_amount: Number(goalForm.targetAmount), targetAmount: Number(goalForm.targetAmount),
        current_amount: Number(goalForm.currentAmount), currentAmount: Number(goalForm.currentAmount),
        deadline: goalForm.deadline || null,
      })
    } else {
      await addGoal({
        id: crypto.randomUUID(), name: goalForm.name,
        target_amount: Number(goalForm.targetAmount), targetAmount: Number(goalForm.targetAmount),
        current_amount: 0, currentAmount: 0,
        deadline: goalForm.deadline || null,
        created_at: new Date().toISOString(),
      })
    }
    closeGoalForm()
  }

  async function handleAddFunds(e) {
    e.preventDefault()
    if (!addFundsAmount || Number(addFundsAmount) <= 0) return
    const goal = goals.find(g => g.id === addFundsGoalId)
    if (goal) {
      const newAmount = Number(goal.currentAmount || goal.current_amount || 0) + Number(addFundsAmount)
      await updateGoal(addFundsGoalId, { current_amount: newAmount, currentAmount: newAmount })
    }
    setAddFundsGoalId(null)
    setAddFundsAmount('')
  }

  const sortedBills = [...billsThisMonth].sort((a, b) => (a.dueDay || a.due_day) - (b.dueDay || b.due_day))
  const otherBills = bills.filter(b => !isBillDueThisMonth(b))

  if (loadingBills || loadingGoals) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Money</h2>
      <p className="text-muted">Budgets, bills, and savings.</p>

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
              <span className="money-stat-label">{totalTarget > 0 ? `${overallProgress.toFixed(0)}% of ${formatDollars(totalTarget)}` : 'Total saved'}</span>
            </div>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="money-progress-bar"><div className="money-progress-fill" style={{ width: `${overallProgress}%` }} /></div>
        )}
      </div>

      <div className="money-tabs">
        <button className={`money-tab ${tab === 'bills' ? 'money-tab--active' : ''}`} onClick={() => setTab('bills')}><DollarSign size={16} /> Bills</button>
        <button className={`money-tab ${tab === 'savings' ? 'money-tab--active' : ''}`} onClick={() => setTab('savings')}><PiggyBank size={16} /> Savings</button>
      </div>

      {tab === 'bills' && (
        <div className="money-section">
          <div className="money-section-header">
            <h3>Due This Month</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openBillForm()}><Plus size={16} /> Add Bill</button>
          </div>
          {sortedBills.length === 0 && <div className="money-empty"><DollarSign size={32} /><p>No bills added yet</p></div>}

          {showBillForm && (
            <div className="money-modal-backdrop" onClick={closeBillForm}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header"><h3>{editingBillId ? 'Edit Bill' : 'Add Bill'}</h3><button className="btn btn-ghost btn-icon" onClick={closeBillForm}><X size={18} /></button></div>
                <form onSubmit={handleBillSubmit} className="money-form">
                  <input type="text" placeholder="Bill name" value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  <div className="money-form-row">
                    <input type="number" placeholder="Amount" min="0" step="0.01" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
                    <input type="number" placeholder="Due day" min="1" max="31" value={billForm.dueDay} onChange={e => setBillForm(f => ({ ...f, dueDay: e.target.value }))} />
                  </div>
                  <div className="money-form-row">
                    <select value={billForm.frequency} onChange={e => setBillForm(f => ({ ...f, frequency: e.target.value }))}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select>
                    <select value={billForm.category} onChange={e => setBillForm(f => ({ ...f, category: e.target.value }))}>{BILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{editingBillId ? 'Save Changes' : 'Add Bill'}</button>
                </form>
              </div>
            </div>
          )}

          <div className="money-list">
            {sortedBills.map(bill => {
              const status = getBillStatus(bill)
              const dueDay = bill.dueDay || bill.due_day
              return (
                <div key={bill.id} className={`card money-bill-card money-bill--${status}`}>
                  <div className="money-bill-main">
                    <div className="money-bill-info">
                      <span className="money-bill-name">{bill.name}</span>
                      <span className="money-bill-meta">Due {dueDay}{ordinalSuffix(dueDay)} &middot; {bill.frequency} &middot; {bill.category}</span>
                    </div>
                    <div className="money-bill-right">
                      <span className="money-bill-amount">{formatDollars(bill.amount)}</span>
                      {status === 'overdue' && <span className="money-badge money-badge--overdue"><AlertTriangle size={12} /> Overdue</span>}
                      {status === 'upcoming' && <span className="money-badge money-badge--upcoming">Soon</span>}
                    </div>
                  </div>
                  <div className="money-bill-actions">
                    <button className="btn btn-ghost btn-icon" onClick={() => openBillForm(bill)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteBill(bill.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>

          {otherBills.length > 0 && (
            <>
              <h3 className="money-subheading">Not Due This Month</h3>
              <div className="money-list">
                {otherBills.map(bill => {
                  const dueDay = bill.dueDay || bill.due_day
                  return (
                    <div key={bill.id} className="card money-bill-card money-bill--not-due">
                      <div className="money-bill-main">
                        <div className="money-bill-info">
                          <span className="money-bill-name">{bill.name}</span>
                          <span className="money-bill-meta">Due {dueDay}{ordinalSuffix(dueDay)} &middot; {bill.frequency} &middot; {bill.category}</span>
                        </div>
                        <div className="money-bill-right"><span className="money-bill-amount">{formatDollars(bill.amount)}</span></div>
                      </div>
                      <div className="money-bill-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => openBillForm(bill)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => deleteBill(bill.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'savings' && (
        <div className="money-section">
          <div className="money-section-header"><h3>Savings Goals</h3><button className="btn btn-primary btn-sm" onClick={() => openGoalForm()}><Plus size={16} /> Add Goal</button></div>
          {goals.length === 0 && <div className="money-empty"><PiggyBank size={32} /><p>No savings goals yet</p></div>}

          {showGoalForm && (
            <div className="money-modal-backdrop" onClick={closeGoalForm}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header"><h3>{editingGoalId ? 'Edit Goal' : 'Add Goal'}</h3><button className="btn btn-ghost btn-icon" onClick={closeGoalForm}><X size={18} /></button></div>
                <form onSubmit={handleGoalSubmit} className="money-form">
                  <input type="text" placeholder="Goal name" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  <div className="money-form-row">
                    <input type="number" placeholder="Target amount" min="0" step="0.01" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} />
                    {editingGoalId && <input type="number" placeholder="Current amount" min="0" step="0.01" value={goalForm.currentAmount} onChange={e => setGoalForm(f => ({ ...f, currentAmount: e.target.value }))} />}
                  </div>
                  <input type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
                  <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: -8 }}>Optional deadline</span>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{editingGoalId ? 'Save Changes' : 'Add Goal'}</button>
                </form>
              </div>
            </div>
          )}

          {addFundsGoalId && (
            <div className="money-modal-backdrop" onClick={() => { setAddFundsGoalId(null); setAddFundsAmount('') }}>
              <div className="card money-form-card" onClick={e => e.stopPropagation()}>
                <div className="money-form-header"><h3>Add Funds</h3><button className="btn btn-ghost btn-icon" onClick={() => { setAddFundsGoalId(null); setAddFundsAmount('') }}><X size={18} /></button></div>
                <form onSubmit={handleAddFunds} className="money-form">
                  <input type="number" placeholder="Amount to add" min="0.01" step="0.01" value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)} autoFocus />
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><TrendingUp size={16} /> Add Funds</button>
                </form>
              </div>
            </div>
          )}

          <div className="money-list">
            {goals.map(goal => {
              const target = Number(goal.targetAmount || goal.target_amount || 0)
              const current = Number(goal.currentAmount || goal.current_amount || 0)
              const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
              const isComplete = pct >= 100
              return (
                <div key={goal.id} className="card money-goal-card">
                  <div className="money-goal-header">
                    <div className="money-goal-info">
                      <span className="money-goal-name">{isComplete && <Check size={16} className="money-goal-check" />}{goal.name}</span>
                      {goal.deadline && <span className="money-goal-deadline">by {format(parseISO(goal.deadline), 'MMM d, yyyy')}</span>}
                    </div>
                    <div className="money-goal-amounts">
                      <span className="money-goal-current">{formatDollars(current)}</span>
                      <span className="money-goal-target">of {formatDollars(target)}</span>
                    </div>
                  </div>
                  <div className="money-progress-bar"><div className={`money-progress-fill ${isComplete ? 'money-progress-fill--complete' : ''}`} style={{ width: `${pct}%` }} /></div>
                  <span className="money-goal-pct">{pct.toFixed(0)}%</span>
                  <div className="money-goal-actions">
                    {!isComplete && <button className="btn btn-secondary btn-sm" onClick={() => { setAddFundsGoalId(goal.id); setAddFundsAmount('') }}><TrendingUp size={14} /> Add Funds</button>}
                    <button className="btn btn-ghost btn-icon" onClick={() => openGoalForm(goal)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => deleteGoal(goal.id)}><Trash2 size={14} /></button>
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
