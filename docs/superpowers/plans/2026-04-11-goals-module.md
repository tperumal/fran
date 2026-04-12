# Goals Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Goals module to FRAN with nested sub-items that can be daily habits (checkable) or static notes (reference text), with household sharing support.

**Architecture:** Three new Supabase tables (goals, goal_items, goal_check_ins) with RLS. A new Goals page following the existing module pattern (useStore, ShareToggle, brutalist cards). Dashboard gets a Goals summary card. Navigation updated to include Goals.

**Tech Stack:** React 19, Supabase, existing useStore hook, ShareToggle component, Lucide icons, date-fns

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/009_goals.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Goals module tables + RLS
-- Run in Supabase SQL Editor

-- Goals table
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_profile ON goals(profile_id);
CREATE INDEX idx_goals_household ON goals(household_id);

-- Goal items (sub-items within a goal)
CREATE TABLE goal_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text NOT NULL DEFAULT 'habit' CHECK (type IN ('habit', 'note')),
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_items_goal ON goal_items(goal_id);

-- Goal check-ins (daily habit tracking)
CREATE TABLE goal_check_ins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_item_id uuid NOT NULL REFERENCES goal_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  checked boolean NOT NULL DEFAULT true,
  UNIQUE (goal_item_id, profile_id, date)
);

CREATE INDEX idx_goal_check_ins_item ON goal_check_ins(goal_item_id);
CREATE INDEX idx_goal_check_ins_profile ON goal_check_ins(profile_id);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;

-- Goals RLS
CREATE POLICY "View goals" ON goals FOR SELECT
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert goals" ON goals FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update goals" ON goals FOR UPDATE
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete goals" ON goals FOR DELETE
  USING (profile_id = auth.uid());

-- Goal items RLS (access via parent goal)
CREATE POLICY "View goal items" ON goal_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Insert goal items" ON goal_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Update goal items" ON goal_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Delete goal items" ON goal_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND g.profile_id = auth.uid()
  ));

-- Goal check-ins RLS (personal only)
CREATE POLICY "View own check-ins" ON goal_check_ins FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY "Insert own check-ins" ON goal_check_ins FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update own check-ins" ON goal_check_ins FOR UPDATE
  USING (profile_id = auth.uid());
CREATE POLICY "Delete own check-ins" ON goal_check_ins FOR DELETE
  USING (profile_id = auth.uid());
```

- [ ] **Step 2: Save the file and commit**

```bash
git add supabase/migrations/009_goals.sql
git commit -m "Add goals module database migration"
```

- [ ] **Step 3: Run in Supabase SQL Editor**

Copy the contents of `supabase/migrations/009_goals.sql` and execute in the Supabase dashboard SQL Editor. Verify all tables and policies are created without errors.

---

### Task 2: Goals Page — Core Component

**Files:**
- Create: `src/pages/Goals.jsx`
- Create: `src/pages/Goals.css`

- [ ] **Step 1: Create Goals.css**

```css
/* ============================================
   Goals Module — FRAN
   ============================================ */

.goals-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }

.goals-list { display: flex; flex-direction: column; gap: 6px; }

.goals-empty { text-align: center; padding: 48px 20px; color: var(--text-dim); }
.goals-empty svg { margin-bottom: 12px; opacity: 0.15; }
.goals-empty p { font-size: 0.85rem; color: var(--text-muted); font-family: var(--font-mono); }

/* Goal card */
.goal-card { padding: 12px; cursor: pointer; }
.goal-card-main { display: flex; align-items: center; gap: 12px; }
.goal-card-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--border); background: var(--accent); color: #fff; border-color: var(--accent); }
.goal-card-body { flex: 1; min-width: 0; }
.goal-card-title { display: block; font-size: 0.9rem; font-weight: 700; line-height: 1.3; text-transform: uppercase; letter-spacing: 0.01em; }
.goal-card-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
.goal-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.goal-chevron { color: var(--text-dim); }

/* Expanded goal */
.goal-expanded { margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border); }

/* Sub-items */
.goal-items { display: flex; flex-direction: column; gap: 4px; }
.goal-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.goal-item-check { width: 20px; height: 20px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all 0.15s ease; background: transparent; color: var(--text); padding: 0; }
.goal-item-check--done { background: var(--text); border-color: var(--text); color: var(--bg); }
.goal-item-bullet { width: 6px; height: 6px; background: var(--text-dim); flex-shrink: 0; margin: 0 7px; }
.goal-item-text { font-size: 0.85rem; font-family: var(--font-mono); flex: 1; }
.goal-item-text--done { text-decoration: line-through; color: var(--text-dim); }
.goal-item-type { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-family: var(--font-mono); padding: 1px 4px; border: 1px solid var(--border-light); }
.goal-item-delete { padding: 4px; color: var(--text-dim); background: none; border: none; cursor: pointer; }
.goal-item-delete:hover { color: var(--danger); }

/* Add sub-item */
.goal-add-item { display: flex; gap: 6px; margin-top: 8px; align-items: center; }
.goal-add-item input { flex: 1; font-size: 0.8rem; padding: 6px 8px; }
.goal-add-item select { width: auto; font-size: 0.7rem; padding: 6px 8px; }
.goal-add-item button { flex-shrink: 0; padding: 6px 10px; }

/* Goal actions in expanded */
.goal-expanded-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); }
.goal-expanded-actions .btn { font-size: 0.75rem; gap: 4px; }
.goal-delete-btn:hover { color: var(--danger) !important; }

/* Add goal form */
.goal-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.goal-form input, .goal-form textarea { font-size: 0.85rem; }
.goal-form-actions { display: flex; gap: 8px; }

/* Edit inline */
.goal-edit-field { margin-bottom: 8px; }
.goal-edit-field input, .goal-edit-field textarea { width: 100%; }
.goal-edit-field label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; display: block; font-family: var(--font-mono); }

/* Progress indicator */
.goal-progress { font-size: 0.65rem; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
```

- [ ] **Step 2: Create Goals.jsx**

```jsx
import { useState } from 'react'
import { Plus, Trash2, Pencil, X, Target, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { format } from 'date-fns'
import useStore from '../hooks/useStore'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import supabase from '../lib/supabase'
import useAuth from '../hooks/useAuth'
import './Goals.css'

function uid() { return crypto.randomUUID() }

export default function Goals() {
  const { householdId } = useHousehold()
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { items: goals, addItem: addGoal, updateItem: updateGoal, deleteItem: deleteGoal, loading } = useStore(
    'goals', 'hive-goals',
    { householdId, orderBy: 'order', ascending: true }
  )

  const [expandedId, setExpandedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Sub-items and check-ins are managed per-goal when expanded
  const [subItems, setSubItems] = useState([])
  const [checkIns, setCheckIns] = useState([])
  const [newItemText, setNewItemText] = useState('')
  const [newItemType, setNewItemType] = useState('habit')
  const [loadingSub, setLoadingSub] = useState(false)

  async function fetchSubItems(goalId) {
    setLoadingSub(true)
    const { data: items } = await supabase
      .from('goal_items')
      .select('*')
      .eq('goal_id', goalId)
      .order('order', { ascending: true })
    setSubItems(items || [])

    // Fetch today's check-ins for habit items
    const itemIds = (items || []).filter(i => i.type === 'habit').map(i => i.id)
    if (itemIds.length > 0 && user) {
      const { data: checks } = await supabase
        .from('goal_check_ins')
        .select('*')
        .in('goal_item_id', itemIds)
        .eq('profile_id', user.id)
        .eq('date', today)
      setCheckIns(checks || [])
    } else {
      setCheckIns([])
    }
    setLoadingSub(false)
  }

  function handleExpand(goalId) {
    if (expandedId === goalId) {
      setExpandedId(null)
      setEditing(false)
    } else {
      setExpandedId(goalId)
      setEditing(false)
      fetchSubItems(goalId)
    }
  }

  function startEdit(goal) {
    setEditing(true)
    setEditTitle(goal.title)
    setEditDesc(goal.description || '')
  }

  async function saveEdit(goalId) {
    await updateGoal(goalId, { title: editTitle.trim() || 'Untitled', description: editDesc.trim() || null })
    setEditing(false)
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    if (!formTitle.trim()) return
    await addGoal({
      id: uid(),
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      order: goals.length,
      created_at: new Date().toISOString(),
    })
    setFormTitle('')
    setFormDesc('')
    setShowForm(false)
  }

  async function handleAddSubItem() {
    if (!newItemText.trim() || !expandedId) return
    const item = {
      id: uid(),
      goal_id: expandedId,
      text: newItemText.trim(),
      type: newItemType,
      order: subItems.length,
    }
    const { error } = await supabase.from('goal_items').insert(item)
    if (!error) {
      setSubItems(prev => [...prev, item])
      setNewItemText('')
    }
  }

  async function handleDeleteSubItem(itemId) {
    const { error } = await supabase.from('goal_items').delete().eq('id', itemId)
    if (!error) {
      setSubItems(prev => prev.filter(i => i.id !== itemId))
      setCheckIns(prev => prev.filter(c => c.goal_item_id !== itemId))
    }
  }

  async function toggleCheckIn(itemId) {
    const existing = checkIns.find(c => c.goal_item_id === itemId)
    if (existing) {
      await supabase.from('goal_check_ins').delete().eq('id', existing.id)
      setCheckIns(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const newCheck = { id: uid(), goal_item_id: itemId, profile_id: user.id, date: today, checked: true }
      const { error } = await supabase.from('goal_check_ins').insert(newCheck)
      if (!error) setCheckIns(prev => [...prev, newCheck])
    }
  }

  function isChecked(itemId) {
    return checkIns.some(c => c.goal_item_id === itemId)
  }

  // Count today's habits
  const habitCount = subItems.filter(i => i.type === 'habit').length
  const checkedCount = checkIns.length

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Goals</h2>
      <p className="text-muted">Stay focused on what matters.</p>

      <div className="goals-controls">
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Add Goal'}
        </button>
      </div>

      {showForm && (
        <form className="card goal-form" onSubmit={handleAddGoal}>
          <input placeholder="Goal title" value={formTitle} onChange={e => setFormTitle(e.target.value)} autoFocus />
          <textarea placeholder="Description (optional)" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} />
          <div className="goal-form-actions">
            <button type="submit" className="btn btn-primary" disabled={!formTitle.trim()}>Save</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="goals-empty">
          <Target size={40} />
          <p>No goals yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map(goal => {
            const isExpanded = expandedId === goal.id
            return (
              <div key={goal.id} className="card goal-card">
                <div className="goal-card-main" onClick={() => handleExpand(goal.id)}>
                  <div className="goal-card-icon"><Target size={18} /></div>
                  <div className="goal-card-body">
                    <span className="goal-card-title">{goal.title}</span>
                    {goal.description && <span className="goal-card-desc">{goal.description}</span>}
                  </div>
                  <div className="goal-card-actions">
                    <ShareToggle
                      shared={!!goal.household_id}
                      onToggle={(share) => updateGoal(goal.id, { household_id: share ? householdId : null })}
                    />
                    {isExpanded ? <ChevronUp size={16} className="goal-chevron" /> : <ChevronDown size={16} className="goal-chevron" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="goal-expanded">
                    {editing ? (
                      <div>
                        <div className="goal-edit-field">
                          <label>Title</label>
                          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                        <div className="goal-edit-field">
                          <label>Description</label>
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
                        </div>
                        <div className="goal-form-actions">
                          <button className="btn btn-primary" onClick={() => saveEdit(goal.id)}>Save</button>
                          <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {loadingSub ? (
                          <p className="text-muted">Loading...</p>
                        ) : (
                          <div className="goal-items">
                            {subItems.map(item => (
                              <div key={item.id} className="goal-item">
                                {item.type === 'habit' ? (
                                  <button
                                    className={`goal-item-check ${isChecked(item.id) ? 'goal-item-check--done' : ''}`}
                                    onClick={() => toggleCheckIn(item.id)}
                                  >
                                    {isChecked(item.id) && <Check size={14} />}
                                  </button>
                                ) : (
                                  <span className="goal-item-bullet" />
                                )}
                                <span className={`goal-item-text ${item.type === 'habit' && isChecked(item.id) ? 'goal-item-text--done' : ''}`}>
                                  {item.text}
                                </span>
                                <span className="goal-item-type">{item.type}</span>
                                <button className="goal-item-delete" onClick={() => handleDeleteSubItem(item.id)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="goal-add-item">
                          <input
                            placeholder="Add item..."
                            value={newItemText}
                            onChange={e => setNewItemText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubItem()}
                          />
                          <select value={newItemType} onChange={e => setNewItemType(e.target.value)}>
                            <option value="habit">Habit</option>
                            <option value="note">Note</option>
                          </select>
                          <button className="btn btn-primary" onClick={handleAddSubItem}><Plus size={14} /></button>
                        </div>

                        <div className="goal-expanded-actions">
                          <button className="btn btn-ghost" onClick={() => startEdit(goal)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="btn btn-ghost goal-delete-btn" onClick={() => { deleteGoal(goal.id); setExpandedId(null) }}>
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
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Goals.jsx src/pages/Goals.css
git commit -m "Add Goals page component and styles"
```

---

### Task 3: Wire Up Navigation and Routing

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/AppLayout.jsx`

- [ ] **Step 1: Add route in App.jsx**

Add import at the top with the other page imports:

```jsx
import Goals from './pages/Goals'
```

Add route inside `<Routes>` after the career route:

```jsx
<Route path="/goals" element={<Goals />} />
```

- [ ] **Step 2: Add nav item in AppLayout.jsx**

Add `Target` to the lucide-react import:

```jsx
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  CheckSquare,
  Wallet,
  Gamepad2,
  Briefcase,
  Sun,
  Mic,
  Menu,
  X,
  Settings,
  Target,
} from 'lucide-react'
```

Add to `ALL_NAV_ITEMS` array after the weekend entry:

```jsx
{ id: 'goals', to: '/goals', label: 'Goals', icon: Target },
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/AppLayout.jsx
git commit -m "Add Goals route and navigation item"
```

---

### Task 4: Dashboard Goals Card

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add imports**

Add `Target` to the lucide-react import (add to existing import line):

```jsx
Target,
```

Add a `useStore` call for goals inside the Dashboard component, after the other `useStore` calls:

```jsx
const { items: goals } = useStore('goals', 'hive-goals', { householdId })
```

- [ ] **Step 2: Add 'goals' to the ALL_MODULES array**

Change:
```jsx
const ALL_MODULES = ['tasks', 'fitness', 'meals', 'career', 'money', 'hobbies', 'weekend']
```
To:
```jsx
const ALL_MODULES = ['tasks', 'fitness', 'meals', 'career', 'money', 'hobbies', 'weekend', 'goals']
```

Add to ITEM_LABELS:
```jsx
goals: 'GOALS',
```

- [ ] **Step 3: Add the Goals card in the dash-grid**

Add after the weekend card block, before the closing `</div>` of `dash-grid`:

```jsx
{isVis('goals') && (
  <div className="card dash-card" onClick={() => navigate('/goals')}>
    <div className="dash-card-header"><Target size={18} /><span>Goals</span><ChevronRight size={16} className="dash-chevron" /></div>
    {goals.length > 0 ? (
      <div className="dash-card-body">
        {goals.slice(0, 3).map(g => (
          <div key={g.id} className="dash-task-item">
            <span className="dash-task-dot" /><span>{g.title}</span>
          </div>
        ))}
      </div>
    ) : <p className="text-muted">Set your goals</p>}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "Add Goals card to Dashboard"
```

---

### Task 5: Build, Verify, and Push

**Files:** None new

- [ ] **Step 1: Build the project**

```bash
cd /Users/toddperumal/personal_projects/hive
npm run build
```

Expected: Build succeeds with no errors (chunk size warning is OK).

- [ ] **Step 2: Push all commits**

```bash
git push origin main
```

- [ ] **Step 3: Run migration in Supabase**

Copy contents of `supabase/migrations/009_goals.sql` and run in the Supabase SQL Editor. Verify no errors.

- [ ] **Step 4: Verify in browser**

Open `https://app.onlyfran.co` (or local dev server). Check:
- Goals appears in hamburger menu
- Can create a goal
- Can add habit and note sub-items
- Habit checkboxes toggle for today
- Share toggle works
- Dashboard shows Goals card
- No console errors
