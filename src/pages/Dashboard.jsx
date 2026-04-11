import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, CheckSquare, Wallet, Gamepad2, Briefcase, Sun, ChevronRight, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, startOfWeek, addDays, isBefore, formatDistanceToNowStrict } from 'date-fns'
import useMood from '../hooks/useMood'
import useStore from '../hooks/useStore'
import useFitnessData from '../hooks/useFitnessData'
import useMealPlans from '../hooks/useMealPlans'
import useHousehold from '../hooks/useHousehold'
import './Dashboard.css'

/* ---- Weather helpers ---- */

const WEATHER_CACHE_KEY = 'fran-weather-cache'
const GEO_CACHE_KEY = 'fran-geo-cache'
const WEATHER_TTL = 30 * 60 * 1000

function weatherCodeToEmoji(code) {
  if (code === 0) return { emoji: '\u2600\uFE0F', label: 'CLEAR' }
  if (code <= 3) return { emoji: '\u26C5', label: 'CLOUDY' }
  if (code <= 48) return { emoji: '\uD83C\uDF2B\uFE0F', label: 'FOGGY' }
  if (code <= 67) return { emoji: '\uD83C\uDF27\uFE0F', label: 'RAIN' }
  if (code <= 77) return { emoji: '\u2744\uFE0F', label: 'SNOW' }
  if (code <= 82) return { emoji: '\uD83C\uDF26\uFE0F', label: 'SHOWERS' }
  return { emoji: '\u26C8\uFE0F', label: 'STORM' }
}

function useWeather() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchWeather = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
      )
      const data = await res.json()
      if (!data.current) throw new Error('No weather data')
      const result = { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, fetchedAt: Date.now() }
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(result))
      setWeather(result)
      setLoading(false)
    } catch { setError('FETCH_FAILED'); setLoading(false) }
  }, [])

  const requestLocation = useCallback(() => {
    setError(null)
    setLoading(true)
    const cachedGeo = localStorage.getItem(GEO_CACHE_KEY)
    if (cachedGeo) {
      const { lat, lng } = JSON.parse(cachedGeo)
      const cachedWeather = localStorage.getItem(WEATHER_CACHE_KEY)
      if (cachedWeather) {
        const parsed = JSON.parse(cachedWeather)
        if (Date.now() - parsed.fetchedAt < WEATHER_TTL) { setWeather(parsed); setLoading(false); return }
      }
      fetchWeather(lat, lng)
      return
    }
    if (!navigator.geolocation) { setError('NO_GEO'); setLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }; localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo)); fetchWeather(geo.lat, geo.lng) },
      () => { setError('DENIED'); setLoading(false) },
      { timeout: 10000 }
    )
  }, [fetchWeather])

  useEffect(() => { requestLocation() }, [requestLocation])
  return { weather, error, loading, retry: requestLocation }
}

/* ---- Dashboard visibility ---- */

const DASH_VIS_KEY = 'fran-dash-visible'
const ALL_WIDGETS = ['mood', 'weather']
const ALL_MODULES = ['tasks', 'fitness', 'meals', 'career', 'money', 'hobbies', 'weekend']
const DEFAULT_VISIBLE = [...ALL_WIDGETS, ...ALL_MODULES]

function loadVisible() {
  try {
    const stored = localStorage.getItem(DASH_VIS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE
}

function saveVisible(ids) {
  localStorage.setItem(DASH_VIS_KEY, JSON.stringify(ids))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { householdId } = useHousehold()
  const { myMood, partnerMoods, historyStrip, logMood, loading: moodLoading, moodError } = useMood()
  const { weather, error: weatherError, loading: weatherLoading, retry: retryWeather } = useWeather()
  const { workouts } = useFitnessData()
  const { items: tasks } = useStore('tasks', 'hive-tasks', {
    profileColumn: 'created_by',
    fromRow: row => ({ ...row, listId: row.list_id, dueDate: row.due_date, completedAt: row.completed_at }),
    householdId,
  })
  const { items: bills } = useStore('bills', 'hive-bills', {
    fromRow: row => ({ ...row, dueDay: row.due_day }),
    householdId,
  })
  const { items: media } = useStore('media_items', 'hive-media-items', { householdId })
  const { items: groceryItems } = useStore('grocery_items', 'hive-grocery-items', { householdId })
  const { items: milestones } = useStore('career_milestones', 'hive-career-milestones', { householdId })
  const { items: weekendActivities } = useStore('weekend_activities', 'hive-weekend-activities', {
    filters: { week_key: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') },
    householdId,
  })
  const { mealPlans } = useMealPlans()
  const [visible, setVisible] = useState(loadVisible)
  const [editing, setEditing] = useState(false)

  useEffect(() => { saveVisible(visible) }, [visible])

  const today = new Date()
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]
  const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const currentPlan = mealPlans.find(p => p.weekStart === currentWeekStart)
  const todayMeals = currentPlan?.meals?.[dayKey] || {}
  const hasMeals = todayMeals.breakfast || todayMeals.lunch || todayMeals.dinner
  const lastWorkout = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    if (!a.dueDate && !a.due_date) return 1; if (!b.dueDate && !b.due_date) return -1
    return new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date)
  }).slice(0, 5)
  const currentDay = today.getDate()
  const upcomingBills = bills.filter(b => { const dd = b.dueDay || b.due_day; const diff = dd - currentDay; return diff >= 0 && diff <= 7 }).sort((a, b) => (a.dueDay || a.due_day) - (b.dueDay || b.due_day))
  const currentMedia = media.filter(m => m.status === 'in_progress').slice(0, 3)
  const uncheckedGroceries = groceryItems.filter(g => !g.checked).length
  const recentMilestones = milestones.filter(m => m.category !== 'goal' || m.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2)
  const activeGoals = milestones.filter(m => m.category === 'goal' && !m.completed).slice(0, 3)
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekendPlans = weekendActivities.filter(a => (a.weekKey || a.week_key) === weekStart && !a.done).sort((a, b) => {
    if (a.day !== b.day) return a.day === 'sat' ? -1 : 1; return (a.time || '').localeCompare(b.time || '')
  }).slice(0, 4)

  const MOODS = [
    { emoji: '\uD83D\uDE34', label: 'Tired' },
    { emoji: '\uD83D\uDE24', label: 'Frustrated' },
    { emoji: '\uD83D\uDE10', label: 'Neutral' },
    { emoji: '\uD83D\uDE42', label: 'Good' },
    { emoji: '\uD83D\uDD25', label: 'Great' },
  ]
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayIdx = (new Date().getDay() + 6) % 7
  const stripLabels = []
  for (let i = 6; i >= 0; i--) { stripLabels.push(DAY_LABELS[((todayIdx - i + 7) % 7)]) }

  const isVis = (id) => visible.includes(id)
  const toggleVis = (id) => {
    setVisible(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
  }

  const ITEM_LABELS = {
    mood: 'MOOD', weather: 'WEATHER', tasks: 'TASKS', fitness: 'FITNESS',
    meals: 'MEALS', career: 'CAREER', money: 'MONEY', hobbies: 'HOBBIES', weekend: 'WEEKEND',
  }

  return (
    <div className="page">
      <div className="dash-title-row">
        <div>
          <h2>Today</h2>
          <p className="text-muted">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        <button className={`header-btn ${editing ? 'active' : ''}`} onClick={() => setEditing(e => !e)} title="Edit dashboard">
          {editing ? <X size={18} /> : <Pencil size={18} />}
        </button>
      </div>

      {/* Edit mode */}
      {editing && (
        <div className="card dash-edit-card">
          <div className="dash-widget-label">SHOW / HIDE</div>
          <div className="dash-edit-grid">
            {[...ALL_WIDGETS, ...ALL_MODULES].map(id => (
              <button
                key={id}
                className={`dash-edit-toggle ${isVis(id) ? 'dash-edit-toggle--on' : ''}`}
                onClick={() => toggleVis(id)}
              >
                {isVis(id) ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{ITEM_LABELS[id]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mood + Weather Widgets */}
      {(isVis('mood') || isVis('weather')) && (
        <div className="dash-widgets">
          {isVis('mood') && (
            <div className="card dash-widget dash-mood">
              <div className="dash-widget-label">MOOD CHECK-IN</div>
              <div className="dash-mood-picker">
                {MOODS.map(m => (
                  <button key={m.emoji} className={`dash-mood-btn ${myMood?.mood === m.emoji ? 'active' : ''}`} onClick={() => logMood(m.emoji)} title={m.label}>
                    {m.emoji}
                  </button>
                ))}
              </div>
              {myMood && (
                <div className="dash-mood-status">
                  <span>YOU: {myMood.mood}</span>
                  <span className="text-muted"> &mdash; {formatDistanceToNowStrict(new Date(myMood.created_at), { addSuffix: false }).toUpperCase()} AGO</span>
                </div>
              )}
              {partnerMoods.map(pm => (
                <div key={pm.profile_id} className="dash-mood-status">
                  <span>{pm.displayName.toUpperCase()}: {pm.mood}</span>
                  <span className="text-muted"> &mdash; {formatDistanceToNowStrict(new Date(pm.created_at), { addSuffix: false }).toUpperCase()} AGO</span>
                </div>
              ))}
              <div className="dash-mood-history">
                {historyStrip.map((m, i) => (
                  <div key={i} className="dash-mood-day">
                    <span className="dash-mood-day-label">{stripLabels[i]}</span>
                    <span className={`dash-mood-day-val ${m ? '' : 'empty'}`}>{m || '\u00B7'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isVis('weather') && (
            <div className="card dash-widget dash-weather">
              <div className="dash-widget-label">WEATHER</div>
              {weatherLoading ? (
                <div className="dash-weather-body"><span className="text-muted">LOADING...</span></div>
              ) : weatherError ? (
                <div className="dash-weather-body">
                  <span className="text-muted">LOCATION NEEDED</span>
                  <button className="btn btn-secondary dash-weather-retry" onClick={retryWeather}>RETRY</button>
                </div>
              ) : weather ? (
                <div className="dash-weather-body">
                  <span className="dash-weather-emoji">{weatherCodeToEmoji(weather.code).emoji}</span>
                  <span className="dash-weather-temp">{weather.temp}&deg;F</span>
                  <span className="dash-weather-desc">{weatherCodeToEmoji(weather.code).label}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <div className="dash-grid">
        {isVis('tasks') && (
          <div className="card dash-card" onClick={() => navigate('/tasks')}>
            <div className="dash-card-header"><CheckSquare size={18} /><span>Tasks</span><ChevronRight size={16} className="dash-chevron" /></div>
            {pendingTasks.length > 0 ? (
              <div className="dash-card-body">
                {pendingTasks.map(t => (
                  <div key={t.id} className="dash-task-item">
                    <span className="dash-task-dot" /><span>{t.title}</span>
                    {t.dueDate && <span className={`dash-due ${isBefore(parseISO(t.dueDate), today) ? 'overdue' : ''}`}>{isToday(parseISO(t.dueDate)) ? 'Today' : isTomorrow(parseISO(t.dueDate)) ? 'Tomorrow' : format(parseISO(t.dueDate), 'MMM d')}</span>}
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">All caught up!</p>}
          </div>
        )}

        {isVis('fitness') && (
          <div className="card dash-card" onClick={() => navigate('/fitness')}>
            <div className="dash-card-header"><Dumbbell size={18} /><span>Fitness</span><ChevronRight size={16} className="dash-chevron" /></div>
            {lastWorkout ? (
              <div className="dash-card-body">
                <p className="dash-highlight">{lastWorkout.name || 'Workout'}</p>
                <p className="text-muted">{lastWorkout.exercises?.length || 0} exercises &middot; {format(parseISO(lastWorkout.date), 'EEE')}</p>
              </div>
            ) : <p className="text-muted">Start your first workout</p>}
          </div>
        )}

        {isVis('meals') && (
          <div className="card dash-card" onClick={() => navigate('/meals')}>
            <div className="dash-card-header"><UtensilsCrossed size={18} /><span>Meals</span><ChevronRight size={16} className="dash-chevron" /></div>
            {hasMeals ? (
              <div className="dash-card-body dash-meals-list">
                {todayMeals.breakfast && <p><span className="dash-meal-label">B</span> {todayMeals.breakfast}</p>}
                {todayMeals.lunch && <p><span className="dash-meal-label">L</span> {todayMeals.lunch}</p>}
                {todayMeals.dinner && <p><span className="dash-meal-label">D</span> {todayMeals.dinner}</p>}
              </div>
            ) : <p className="text-muted">No meals planned today</p>}
            {uncheckedGroceries > 0 && <p className="dash-badge">{uncheckedGroceries} grocery items</p>}
          </div>
        )}

        {isVis('career') && (
          <div className="card dash-card" onClick={() => navigate('/career')}>
            <div className="dash-card-header"><Briefcase size={18} /><span>Career</span><ChevronRight size={16} className="dash-chevron" /></div>
            {activeGoals.length > 0 ? (
              <div className="dash-card-body">{activeGoals.map(g => (<div key={g.id} className="dash-task-item"><span className="dash-task-dot" /><span>{g.title}</span></div>))}</div>
            ) : recentMilestones.length > 0 ? (
              <div className="dash-card-body">{recentMilestones.map(m => (<p key={m.id} className="text-muted" style={{ fontSize: '0.85rem' }}>{m.title}</p>))}</div>
            ) : <p className="text-muted">Track your wins</p>}
          </div>
        )}

        {isVis('money') && (
          <div className="card dash-card" onClick={() => navigate('/money')}>
            <div className="dash-card-header"><Wallet size={18} /><span>Money</span><ChevronRight size={16} className="dash-chevron" /></div>
            {upcomingBills.length > 0 ? (
              <div className="dash-card-body">
                {upcomingBills.map(b => (<div key={b.id} className="dash-bill-item"><span>{b.name}</span><span className="text-accent">${Number(b.amount).toLocaleString()}</span><span className="text-muted">due {b.dueDay === currentDay ? 'today' : `in ${b.dueDay - currentDay}d`}</span></div>))}
              </div>
            ) : <p className="text-muted">No bills due soon</p>}
          </div>
        )}

        {isVis('hobbies') && (
          <div className="card dash-card" onClick={() => navigate('/hobbies')}>
            <div className="dash-card-header"><Gamepad2 size={18} /><span>Hobbies</span><ChevronRight size={16} className="dash-chevron" /></div>
            {currentMedia.length > 0 ? (
              <div className="dash-card-body">{currentMedia.map(m => (<p key={m.id}><span className="dash-media-type">{m.type}</span> {m.title}</p>))}</div>
            ) : <p className="text-muted">Nothing in progress</p>}
          </div>
        )}

        {isVis('weekend') && (
          <div className="card dash-card" onClick={() => navigate('/weekend')}>
            <div className="dash-card-header"><Sun size={18} /><span>Weekend</span><ChevronRight size={16} className="dash-chevron" /></div>
            {weekendPlans.length > 0 ? (
              <div className="dash-card-body">{weekendPlans.map(a => (<div key={a.id} className="dash-task-item"><span className="dash-task-dot" /><span>{a.title}</span>{a.time && <span className="dash-due">{a.time}</span>}</div>))}</div>
            ) : <p className="text-muted">No plans yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}
