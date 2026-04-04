import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Plus,
  Trash2,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Sparkles,
  Check,
  UtensilsCrossed,
} from 'lucide-react'
import {
  startOfWeek,
  addWeeks,
  format,
  addDays,
} from 'date-fns'
import './Meals.css'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const CATEGORIES = ['produce', 'protein', 'dairy', 'pantry', 'other']
const CATEGORY_LABELS = {
  produce: 'Produce', protein: 'Protein',
  dairy: 'Dairy', pantry: 'Pantry', other: 'Other',
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function emptyWeekMeals() {
  const meals = {}
  DAYS.forEach(d => { meals[d] = { breakfast: '', lunch: '', dinner: '' } })
  return meals
}

// ─── Main Component ─────────────────────────────────────────

export default function Meals() {
  const [tab, setTab] = useState('plan')
  const [recipes, setRecipes] = useState(() => loadJSON('hive-recipes', []))
  const [mealPlans, setMealPlans] = useState(() => loadJSON('hive-meal-plans', []))
  const [groceryItems, setGroceryItems] = useState(() => loadJSON('hive-grocery-items', []))

  useEffect(() => { localStorage.setItem('hive-recipes', JSON.stringify(recipes)) }, [recipes])
  useEffect(() => { localStorage.setItem('hive-meal-plans', JSON.stringify(mealPlans)) }, [mealPlans])
  useEffect(() => { localStorage.setItem('hive-grocery-items', JSON.stringify(groceryItems)) }, [groceryItems])

  return (
    <div className="page meals-page">
      <h2>Meals</h2>
      <p className="text-muted">Plan meals and manage groceries.</p>

      <div className="meals-tabs">
        {[
          { key: 'plan', icon: CalendarDays, label: 'Plan' },
          { key: 'recipes', icon: BookOpen, label: 'Recipes' },
          { key: 'grocery', icon: ShoppingCart, label: 'Grocery' },
        ].map(t => (
          <button
            key={t.key}
            className={`meals-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <PlanTab
          mealPlans={mealPlans}
          setMealPlans={setMealPlans}
          recipes={recipes}
        />
      )}
      {tab === 'recipes' && (
        <RecipesTab recipes={recipes} setRecipes={setRecipes} />
      )}
      {tab === 'grocery' && (
        <GroceryTab
          items={groceryItems}
          setItems={setGroceryItems}
          mealPlans={mealPlans}
          recipes={recipes}
        />
      )}
    </div>
  )
}

// ─── Plan Tab ───────────────────────────────────────────────

function PlanTab({ mealPlans, setMealPlans, recipes }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingSlot, setEditingSlot] = useState(null) // { day, meal }
  const [slotInput, setSlotInput] = useState('')
  const [showRecipePicker, setShowRecipePicker] = useState(false)

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  )
  const weekKey = format(weekStart, 'yyyy-MM-dd')
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`

  const plan = useMemo(
    () => mealPlans.find(p => p.weekStart === weekKey),
    [mealPlans, weekKey]
  )
  const meals = plan ? plan.meals : emptyWeekMeals()

  const updateSlot = useCallback((day, meal, value) => {
    setMealPlans(prev => {
      const existing = prev.find(p => p.weekStart === weekKey)
      const updated = { ...meals }
      updated[day] = { ...updated[day], [meal]: value }
      if (existing) {
        return prev.map(p => p.weekStart === weekKey ? { ...p, meals: updated } : p)
      }
      return [...prev, { id: uid(), weekStart: weekKey, meals: updated }]
    })
  }, [weekKey, meals, setMealPlans])

  const openSlotEditor = (day, meal) => {
    setEditingSlot({ day, meal })
    setSlotInput(meals[day][meal])
    setShowRecipePicker(false)
  }

  const saveSlot = () => {
    if (editingSlot) {
      updateSlot(editingSlot.day, editingSlot.meal, slotInput)
      setEditingSlot(null)
      setSlotInput('')
    }
  }

  const pickRecipe = (recipe) => {
    if (editingSlot) {
      updateSlot(editingSlot.day, editingSlot.meal, recipe.name)
      setEditingSlot(null)
      setSlotInput('')
      setShowRecipePicker(false)
    }
  }

  const filledCount = DAYS.reduce(
    (n, d) => n + MEAL_TYPES.reduce((m, t) => m + (meals[d][t] ? 1 : 0), 0), 0
  )

  return (
    <div className="meals-section">
      <div className="week-nav">
        <button className="btn btn-ghost" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="week-label">{weekLabel}</span>
        <button className="btn btn-ghost" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-muted" style={{ textAlign: 'center', marginBottom: 16 }}>
        {filledCount} of 21 meals planned
      </p>

      {/* Slot editor modal */}
      {editingSlot && (
        <div className="slot-editor card">
          <div className="slot-editor-header">
            <span>
              {DAY_LABELS[editingSlot.day]} &mdash; {editingSlot.meal}
            </span>
            <button className="btn btn-ghost" onClick={() => setEditingSlot(null)}>
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={slotInput}
            onChange={e => setSlotInput(e.target.value)}
            placeholder="Type a meal name..."
            onKeyDown={e => e.key === 'Enter' && saveSlot()}
          />
          <div className="slot-editor-actions">
            <button className="btn btn-secondary" onClick={() => setShowRecipePicker(p => !p)}>
              <BookOpen size={14} />
              Pick Recipe
            </button>
            <button className="btn btn-primary" onClick={saveSlot}>Save</button>
          </div>
          {showRecipePicker && (
            <div className="recipe-picker">
              {recipes.length === 0 ? (
                <p className="text-muted">No recipes yet. Add some in the Recipes tab.</p>
              ) : (
                recipes.map(r => (
                  <button key={r.id} className="recipe-pick-item" onClick={() => pickRecipe(r)}>
                    {r.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="week-plan">
        {DAYS.map((day, i) => {
          const dateStr = format(addDays(weekStart, i), 'EEE, MMM d')
          return (
            <div key={day} className="day-row card">
              <div className="day-label">{dateStr}</div>
              <div className="meal-slots">
                {MEAL_TYPES.map(meal => {
                  const val = meals[day][meal]
                  return (
                    <button
                      key={meal}
                      className={`meal-slot ${val ? 'filled' : 'empty'}`}
                      onClick={() => openSlotEditor(day, meal)}
                    >
                      <span className="meal-type-label">{meal}</span>
                      <span className="meal-value">
                        {val || <span className="text-muted">+ add</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Recipes Tab ────────────────────────────────────────────

function RecipesTab({ recipes, setRecipes }) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState(null) // recipe id
  const [form, setForm] = useState({
    name: '', ingredients: '', instructions: '',
    prepTime: '', cookTime: '', servings: '', tags: '',
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes
    const q = search.toLowerCase()
    return recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [recipes, search])

  const viewedRecipe = viewing ? recipes.find(r => r.id === viewing) : null

  const resetForm = () => {
    setForm({ name: '', ingredients: '', instructions: '', prepTime: '', cookTime: '', servings: '', tags: '' })
    setShowForm(false)
  }

  const saveRecipe = () => {
    if (!form.name.trim()) return
    const recipe = {
      id: uid(),
      name: form.name.trim(),
      ingredients: form.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: form.instructions.trim(),
      prepTime: Number(form.prepTime) || 0,
      cookTime: Number(form.cookTime) || 0,
      servings: Number(form.servings) || 0,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
    }
    setRecipes(prev => [...prev, recipe])
    resetForm()
  }

  const deleteRecipe = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (viewing === id) setViewing(null)
  }

  // Detail view
  if (viewedRecipe) {
    return (
      <div className="meals-section">
        <button className="btn btn-ghost" onClick={() => setViewing(null)}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="card recipe-detail">
          <h3>{viewedRecipe.name}</h3>
          <div className="recipe-meta">
            {viewedRecipe.prepTime > 0 && (
              <span><Clock size={14} /> Prep: {viewedRecipe.prepTime}m</span>
            )}
            {viewedRecipe.cookTime > 0 && (
              <span><Clock size={14} /> Cook: {viewedRecipe.cookTime}m</span>
            )}
            {viewedRecipe.servings > 0 && (
              <span><Users size={14} /> Serves {viewedRecipe.servings}</span>
            )}
          </div>
          {viewedRecipe.tags.length > 0 && (
            <div className="recipe-tags">
              {viewedRecipe.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
          <h4>Ingredients</h4>
          <ul className="ingredient-list">
            {viewedRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
          {viewedRecipe.instructions && (
            <>
              <h4>Instructions</h4>
              <p className="recipe-instructions">{viewedRecipe.instructions}</p>
            </>
          )}
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => deleteRecipe(viewedRecipe.id)}
          >
            <Trash2 size={14} /> Delete Recipe
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="meals-section">
      <div className="search-row">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..."
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <div className="card recipe-form">
          <div className="slot-editor-header">
            <span>New Recipe</span>
            <button className="btn btn-ghost" onClick={resetForm}><X size={16} /></button>
          </div>
          <input
            placeholder="Recipe name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <textarea
            rows={4}
            placeholder="Ingredients (one per line)"
            value={form.ingredients}
            onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
          />
          <textarea
            rows={3}
            placeholder="Instructions"
            value={form.instructions}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
          />
          <div className="form-row-triple">
            <input
              type="number"
              placeholder="Prep (min)"
              value={form.prepTime}
              onChange={e => setForm(f => ({ ...f, prepTime: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Cook (min)"
              value={form.cookTime}
              onChange={e => setForm(f => ({ ...f, cookTime: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Servings"
              value={form.servings}
              onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
            />
          </div>
          <input
            placeholder="Tags (comma-separated)"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          />
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveRecipe}>
            Save Recipe
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <UtensilsCrossed size={40} />
          <p>{recipes.length === 0 ? 'No recipes yet. Tap "Add" to save your first recipe.' : 'No recipes match your search.'}</p>
        </div>
      ) : (
        <div className="recipe-list">
          {filtered.map(r => (
            <button key={r.id} className="card recipe-card" onClick={() => setViewing(r.id)}>
              <div className="recipe-card-name">{r.name}</div>
              <div className="recipe-card-meta text-muted">
                {r.ingredients.length} ingredients
                {r.prepTime + r.cookTime > 0 && ` \u00B7 ${r.prepTime + r.cookTime}m`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Grocery Tab ────────────────────────────────────────────

function GroceryTab({ items, setItems, mealPlans, recipes }) {
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('other')

  const addItem = () => {
    if (!newName.trim()) return
    setItems(prev => [
      ...prev,
      { id: uid(), name: newName.trim(), category: newCategory, checked: false, fromMealPlan: false },
    ])
    setNewName('')
  }

  const toggleItem = (id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it))
  }

  const clearChecked = () => {
    setItems(prev => prev.filter(it => !it.checked))
  }

  const generateFromPlan = () => {
    // Get the current week plan
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const plan = mealPlans.find(p => p.weekStart === weekStart)
    if (!plan) return

    const plannedNames = new Set()
    DAYS.forEach(d => {
      MEAL_TYPES.forEach(m => {
        if (plan.meals[d][m]) plannedNames.add(plan.meals[d][m])
      })
    })

    // Match planned meal names to recipes and extract ingredients
    const newIngredients = new Set()
    const existingNames = new Set(items.map(it => it.name.toLowerCase()))
    plannedNames.forEach(name => {
      const recipe = recipes.find(r => r.name === name)
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          if (!existingNames.has(ing.toLowerCase())) {
            newIngredients.add(ing)
          }
        })
      }
    })

    if (newIngredients.size === 0) return
    const newItems = [...newIngredients].map(ing => ({
      id: uid(),
      name: ing,
      category: 'other',
      checked: false,
      fromMealPlan: true,
    }))
    setItems(prev => [...prev, ...newItems])
  }

  const grouped = useMemo(() => {
    const g = {}
    CATEGORIES.forEach(c => { g[c] = [] })
    items.forEach(it => {
      const cat = CATEGORIES.includes(it.category) ? it.category : 'other'
      g[cat].push(it)
    })
    return g
  }, [items])

  const checkedCount = items.filter(it => it.checked).length

  return (
    <div className="meals-section">
      <div className="grocery-actions">
        <button className="btn btn-secondary" onClick={generateFromPlan}>
          <Sparkles size={14} /> Generate from Plan
        </button>
        {checkedCount > 0 && (
          <button className="btn btn-ghost" onClick={clearChecked}>
            <Trash2 size={14} /> Clear {checkedCount} checked
          </button>
        )}
      </div>

      <div className="grocery-add-row">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add item..."
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button className="btn btn-primary grocery-add-btn" onClick={addItem}>
          <Plus size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={40} />
          <p>Your grocery list is empty. Add items manually or generate from your meal plan.</p>
        </div>
      ) : (
        <div className="grocery-list">
          {CATEGORIES.map(cat => {
            if (grouped[cat].length === 0) return null
            return (
              <div key={cat} className="grocery-category">
                <div className="grocery-category-label">{CATEGORY_LABELS[cat]}</div>
                {grouped[cat].map(item => (
                  <button
                    key={item.id}
                    className={`grocery-item ${item.checked ? 'checked' : ''}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span className="grocery-check">
                      {item.checked && <Check size={14} />}
                    </span>
                    <span className="grocery-item-name">{item.name}</span>
                    {item.fromMealPlan && (
                      <span className="grocery-badge">plan</span>
                    )}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
