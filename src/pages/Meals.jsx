import { useState, useEffect, useMemo, useCallback } from 'react'
import useStore from '../hooks/useStore'
import useMealPlans from '../hooks/useMealPlans'
import useHousehold from '../hooks/useHousehold'
import ShareToggle from '../components/ShareToggle'
import {
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
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

  const { householdId } = useHousehold()

  const { items: recipes, setItems: setRecipes, addItem: addRecipe, updateItem: updateRecipeItem, deleteItem: deleteRecipeItem, loading: loadingRecipes } = useStore(
    'recipes', 'hive-recipes',
    {
      householdId,
      toRow: item => ({
        name: item.name,
        description: item.description || null,
        ingredients: item.ingredients || null,
        instructions: item.instructions || null,
        prep_time_min: item.prepTime ? Number(item.prepTime) : null,
        cook_time_min: item.cookTime ? Number(item.cookTime) : null,
        servings: item.servings ? Number(item.servings) : null,
        tags: item.tags || null,
      }),
      fromRow: row => ({
        ...row,
        prepTime: row.prep_time_min,
        cookTime: row.cook_time_min,
      }),
    }
  )

  const { items: groceryItems, setItems: setGroceryItems, addItem: addGroceryItem, updateItem: updateGroceryItem, deleteItem: deleteGroceryItem, loading: loadingGrocery } = useStore(
    'grocery_items', 'hive-grocery-items',
    { householdId }
  )

  const { mealPlans, setMealPlans, syncWeek, loading: loadingPlans } = useMealPlans()

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
          syncWeek={syncWeek}
          recipes={recipes}
        />
      )}
      {tab === 'recipes' && (
        <RecipesTab recipes={recipes} addRecipe={addRecipe} updateRecipe={updateRecipeItem} deleteRecipe={deleteRecipeItem} householdId={householdId} />
      )}
      {tab === 'grocery' && (
        <GroceryTab
          items={groceryItems}
          setItems={setGroceryItems}
          addItem={addGroceryItem}
          updateItem={updateGroceryItem}
          deleteItem={deleteGroceryItem}
          mealPlans={mealPlans}
          recipes={recipes}
        />
      )}
    </div>
  )
}

// ─── Plan Tab ───────────────────────────────────────────────

function PlanTab({ mealPlans, setMealPlans, syncWeek, recipes }) {
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
    const updated = { ...meals }
    updated[day] = { ...updated[day], [meal]: value }

    setMealPlans(prev => {
      const existing = prev.find(p => p.weekStart === weekKey)
      if (existing) {
        return prev.map(p => p.weekStart === weekKey ? { ...p, meals: updated } : p)
      }
      return [...prev, { id: uid(), weekStart: weekKey, meals: updated }]
    })

    // Sync to Supabase
    syncWeek(weekKey, updated)
  }, [weekKey, meals, setMealPlans, syncWeek])

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

function RecipesTab({ recipes, addRecipe, updateRecipe, deleteRecipe, householdId }) {
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

  const saveRecipe = async () => {
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
    await addRecipe(recipe)
    resetForm()
  }

  const handleDelete = (id) => {
    deleteRecipe(id)
    if (viewing === id) setViewing(null)
  }

  // Detail view
  const [editingRecipe, setEditingRecipe] = useState(false)
  const [recipeForm, setRecipeForm] = useState({})

  const startEditRecipe = () => {
    setRecipeForm({
      name: viewedRecipe.name,
      ingredients: (viewedRecipe.ingredients || []).join('\n'),
      instructions: viewedRecipe.instructions || '',
      prepTime: viewedRecipe.prepTime || '',
      cookTime: viewedRecipe.cookTime || '',
      servings: viewedRecipe.servings || '',
      tags: (viewedRecipe.tags || []).join(', '),
    })
    setEditingRecipe(true)
  }

  const saveEditRecipe = async () => {
    await updateRecipe(viewedRecipe.id, {
      name: recipeForm.name.trim(),
      ingredients: recipeForm.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: recipeForm.instructions.trim() || null,
      prep_time_min: Number(recipeForm.prepTime) || null,
      cook_time_min: Number(recipeForm.cookTime) || null,
      servings: Number(recipeForm.servings) || null,
      tags: recipeForm.tags.split(',').map(s => s.trim()).filter(Boolean),
    })
    setEditingRecipe(false)
  }

  if (viewedRecipe) {
    return (
      <div className="meals-section">
        <button className="btn btn-ghost" onClick={() => { setViewing(null); setEditingRecipe(false) }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="card recipe-detail">
          {editingRecipe ? (
            <div className="recipe-form">
              <input placeholder="Recipe name" value={recipeForm.name} onChange={e => setRecipeForm(f => ({ ...f, name: e.target.value }))} />
              <label className="tasks-detail-label">Ingredients (one per line)</label>
              <textarea value={recipeForm.ingredients} onChange={e => setRecipeForm(f => ({ ...f, ingredients: e.target.value }))} rows={6} placeholder="1 cup flour&#10;2 eggs&#10;..." />
              <label className="tasks-detail-label">Instructions</label>
              <textarea value={recipeForm.instructions} onChange={e => setRecipeForm(f => ({ ...f, instructions: e.target.value }))} rows={4} placeholder="Steps..." />
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Prep (min)" type="number" value={recipeForm.prepTime} onChange={e => setRecipeForm(f => ({ ...f, prepTime: e.target.value }))} />
                <input placeholder="Cook (min)" type="number" value={recipeForm.cookTime} onChange={e => setRecipeForm(f => ({ ...f, cookTime: e.target.value }))} />
                <input placeholder="Servings" type="number" value={recipeForm.servings} onChange={e => setRecipeForm(f => ({ ...f, servings: e.target.value }))} />
              </div>
              <input placeholder="Tags (comma separated)" value={recipeForm.tags} onChange={e => setRecipeForm(f => ({ ...f, tags: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={saveEditRecipe}>Save</button>
                <button className="btn btn-ghost" onClick={() => setEditingRecipe(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h3>{viewedRecipe.name}</h3>
              <div className="recipe-meta">
                {viewedRecipe.prepTime > 0 && <span><Clock size={14} /> Prep: {viewedRecipe.prepTime}m</span>}
                {viewedRecipe.cookTime > 0 && <span><Clock size={14} /> Cook: {viewedRecipe.cookTime}m</span>}
                {viewedRecipe.servings > 0 && <span><Users size={14} /> Serves {viewedRecipe.servings}</span>}
              </div>
              {viewedRecipe.tags?.length > 0 && (
                <div className="recipe-tags">
                  {viewedRecipe.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
              {viewedRecipe.ingredients?.length > 0 && (
                <>
                  <h4>Ingredients</h4>
                  <ul className="ingredient-list">
                    {viewedRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                  </ul>
                </>
              )}
              {viewedRecipe.instructions && (
                <>
                  <h4>Instructions</h4>
                  <p className="recipe-instructions">{viewedRecipe.instructions}</p>
                </>
              )}
              <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                <ShareToggle
                  shared={!!viewedRecipe.household_id}
                  onToggle={(share) => updateRecipe(viewedRecipe.id, { household_id: share ? householdId : null })}
                />
                <button className="btn btn-secondary" onClick={startEditRecipe}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-secondary" onClick={() => handleDelete(viewedRecipe.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
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

function GroceryTab({ items, setItems, addItem: addStoreItem, updateItem: updateStoreItem, deleteItem: deleteStoreItem, mealPlans, recipes }) {
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('other')

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addStoreItem({ id: uid(), name: newName.trim(), category: newCategory, checked: false, fromMealPlan: false })
    setNewName('')
  }

  const toggleItem = (id) => {
    const item = items.find(it => it.id === id)
    if (item) updateStoreItem(id, { checked: !item.checked })
  }

  const handleDelete = (id) => {
    deleteStoreItem(id)
  }

  const clearChecked = () => {
    items.filter(it => it.checked).forEach(it => deleteStoreItem(it.id))
  }

  const generateFromPlan = async () => {
    // Get the current week plan
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const plan = mealPlans.find(p => p.weekStart === weekStart)
    if (!plan || !plan.meals) return

    const plannedNames = new Set()
    DAYS.forEach(d => {
      if (!plan.meals[d]) return
      MEAL_TYPES.forEach(m => {
        if (plan.meals[d][m]) plannedNames.add(plan.meals[d][m])
      })
    })

    // Match planned meal names to recipes (case-insensitive) and extract ingredients
    const newIngredients = new Set()
    const existingNames = new Set(items.map(it => it.name.toLowerCase()))
    plannedNames.forEach(name => {
      const recipe = recipes.find(r => r.name.toLowerCase() === name.toLowerCase())
      if (recipe && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
          if (!existingNames.has(ing.toLowerCase())) {
            newIngredients.add(ing)
          }
        })
      }
    })

    if (newIngredients.size === 0) return
    for (const ing of newIngredients) {
      await addStoreItem({
        id: uid(),
        name: ing,
        category: 'other',
        checked: false,
        fromMealPlan: true,
      })
    }
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
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button className="btn btn-primary grocery-add-btn" onClick={handleAdd}>
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
                  <div key={item.id} className={`grocery-item ${item.checked ? 'checked' : ''}`}>
                    <button className="grocery-item-toggle" onClick={() => toggleItem(item.id)}>
                      <span className="grocery-check">
                        {item.checked && <Check size={14} />}
                      </span>
                      <span className="grocery-item-name">{item.name}</span>
                      {item.fromMealPlan && (
                        <span className="grocery-badge">plan</span>
                      )}
                    </button>
                    <button className="btn btn-ghost grocery-delete-btn" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
