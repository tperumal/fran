import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, CheckSquare, Wallet, Gamepad2, Briefcase, Sun, ChevronRight, Calendar } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, startOfWeek, addDays, isBefore, formatDistanceToNowStrict } from 'date-fns'
import useMood from '../hooks/useMood'
import './Dashboard.css'

function loadJSON(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch { return fallback }
}

/* ---- Weather helpers ---- */

const WEATHER_CACHE_KEY = 'fran-weather-cache'
const GEO_CACHE_KEY = 'fran-geo-cache'
const WEATHER_TTL = 30 * 60 * 1000 // 30 minutes

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
      const result = {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        fetchedAt: Date.now(),
      }
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(result))
      setWeather(result)
      setLoading(false)
    } catch (err) {
      setError('FETCH_FAILED')
      setLoading(false)
    }
  }, [])

  const requestLocation = useCallback(() => {
    setError(null)
    setLoading(true)

    // Check cached geo
    const cachedGeo = localStorage.getItem(GEO_CACHE_KEY)
    if (cachedGeo) {
      const { lat, lng } = JSON.parse(cachedGeo)
      // Check cached weather
      const cachedWeather = localStorage.getItem(WEATHER_CACHE_KEY)
      if (cachedWeather) {
        const parsed = JSON.parse(cachedWeather)
        if (Date.now() - parsed.fetchedAt < WEATHER_TTL) {
          setWeather(parsed)
          setLoading(false)
          return
        }
      }
      fetchWeather(lat, lng)
      return
    }

    if (!navigator.geolocation) {
      setError('NO_GEO')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo))
        fetchWeather(geo.lat, geo.lng)
      },
      () => {
        setError('DENIED')
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }, [fetchWeather])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return { weather, error, loading, retry: requestLocation }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { myMood, partnerMoods, historyStrip, logMood, loading: moodLoading, moodError } = useMood()
  const { weather, error: weatherError, loading: weatherLoading, retry: retryWeather } = useWeather()
  const [data, setData] = useState({ workouts: [], tasks: [], bills: [], mealPlan: null, media: [], groceryItems: [], milestones: [], weekendActivities: [] })

  useEffect(() => {
    const workouts = loadJSON('hive-workouts')
    const tasks = loadJSON('hive-tasks')
    const bills = loadJSON('hive-bills')
    const media = loadJSON('hive-media-items')
    const groceryItems = loadJSON('hive-grocery-items')
    const milestones = loadJSON('hive-career-milestones')
    const weekendActivities = loadJSON('hive-weekend-activities')

    // Find this week's meal plan
    const plans = loadJSON('hive-meal-plans')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const mealPlan = plans.find(p => p.weekStart === weekStart) || null

    setData({ workouts, tasks, bills, mealPlan, media, groceryItems, milestones, weekendActivities })
  }, [])

  const today = new Date()
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]

  // Recent workout
  const lastWorkout = data.workouts.sort((a, b) => new Date(b.date) - new Date(a.date))[0]

  // Today's meals
  const todayMeals = data.mealPlan?.meals?.[dayKey] || {}
  const hasMeals = todayMeals.breakfast || todayMeals.lunch || todayMeals.dinner

  // Pending tasks
  const pendingTasks = data.tasks.filter(t => !t.completed).sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  }).slice(0, 5)

  // Upcoming bills (due within 7 days)
  const currentDay = today.getDate()
  const upcomingBills = data.bills.filter(b => {
    const diff = b.dueDay - currentDay
    return diff >= 0 && diff <= 7
  }).sort((a, b) => a.dueDay - b.dueDay)

  // Currently consuming media
  const currentMedia = data.media.filter(m => m.status === 'in_progress').slice(0, 3)

  // Unchecked grocery items
  const uncheckedGroceries = data.groceryItems.filter(g => !g.checked).length

  // Career — recent milestones & active goals
  const recentMilestones = data.milestones
    .filter(m => m.category !== 'goal' || m.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 2)
  const activeGoals = data.milestones.filter(m => m.category === 'goal' && !m.completed).slice(0, 3)

  // Weekend — this week's activities
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekendPlans = data.weekendActivities
    .filter(a => a.weekKey === weekStart && !a.done)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day === 'sat' ? -1 : 1
      return (a.time || '').localeCompare(b.time || '')
    })
    .slice(0, 4)

  const MOODS = [
    { emoji: '\uD83D\uDE34', label: 'Tired' },
    { emoji: '\uD83D\uDE24', label: 'Frustrated' },
    { emoji: '\uD83D\uDE10', label: 'Neutral' },
    { emoji: '\uD83D\uDE42', label: 'Good' },
    { emoji: '\uD83D\uDD25', label: 'Great' },
  ]

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  // historyStrip is last 7 days starting 6 days ago
  // We need to figure out labels starting from 6 days ago
  const todayIdx = (new Date().getDay() + 6) % 7 // 0=Mon
  const stripLabels = []
  for (let i = 6; i >= 0; i--) {
    stripLabels.push(DAY_LABELS[((todayIdx - i + 7) % 7)])
  }

  return (
    <div className="page">
      <h2>Today</h2>
      <p className="text-muted">{format(today, 'EEEE, MMMM d')}</p>

      {/* Mood + Weather Widgets */}
      <div className="dash-widgets">
        {/* Mood Check-in */}
        <div className="card dash-widget dash-mood">
          <div className="dash-widget-label">MOOD CHECK-IN</div>
          <div className="dash-mood-picker">
            {MOODS.map(m => (
              <button
                key={m.emoji}
                className={`dash-mood-btn ${myMood?.mood === m.emoji ? 'active' : ''}`}
                onClick={() => logMood(m.emoji)}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          {moodError && (
            <div className="dash-mood-status" style={{ color: 'var(--danger)' }}>
              <span>ERROR: {moodError}</span>
            </div>
          )}
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

        {/* Weather */}
        <div className="card dash-widget dash-weather">
          <div className="dash-widget-label">WEATHER</div>
          {weatherLoading ? (
            <div className="dash-weather-body">
              <span className="text-muted">LOADING...</span>
            </div>
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
      </div>

      <div className="dash-grid">
        {/* Tasks Card */}
        <div className="card dash-card" onClick={() => navigate('/tasks')}>
          <div className="dash-card-header">
            <CheckSquare size={18} />
            <span>Tasks</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {pendingTasks.length > 0 ? (
            <div className="dash-card-body">
              {pendingTasks.map(t => (
                <div key={t.id} className="dash-task-item">
                  <span className="dash-task-dot" />
                  <span>{t.title}</span>
                  {t.dueDate && (
                    <span className={`dash-due ${isBefore(parseISO(t.dueDate), today) ? 'overdue' : ''}`}>
                      {isToday(parseISO(t.dueDate)) ? 'Today' : isTomorrow(parseISO(t.dueDate)) ? 'Tomorrow' : format(parseISO(t.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">All caught up!</p>
          )}
        </div>

        {/* Fitness Card */}
        <div className="card dash-card" onClick={() => navigate('/fitness')}>
          <div className="dash-card-header">
            <Dumbbell size={18} />
            <span>Fitness</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {lastWorkout ? (
            <div className="dash-card-body">
              <p className="dash-highlight">{lastWorkout.name || 'Workout'}</p>
              <p className="text-muted">{lastWorkout.exercises?.length || 0} exercises &middot; {format(parseISO(lastWorkout.date), 'EEE')}</p>
            </div>
          ) : (
            <p className="text-muted">Start your first workout</p>
          )}
        </div>

        {/* Meals Card */}
        <div className="card dash-card" onClick={() => navigate('/meals')}>
          <div className="dash-card-header">
            <UtensilsCrossed size={18} />
            <span>Meals</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {hasMeals ? (
            <div className="dash-card-body dash-meals-list">
              {todayMeals.breakfast && <p><span className="dash-meal-label">B</span> {todayMeals.breakfast}</p>}
              {todayMeals.lunch && <p><span className="dash-meal-label">L</span> {todayMeals.lunch}</p>}
              {todayMeals.dinner && <p><span className="dash-meal-label">D</span> {todayMeals.dinner}</p>}
            </div>
          ) : (
            <p className="text-muted">No meals planned today</p>
          )}
          {uncheckedGroceries > 0 && (
            <p className="dash-badge">{uncheckedGroceries} grocery items</p>
          )}
        </div>

        {/* Career Card */}
        <div className="card dash-card" onClick={() => navigate('/career')}>
          <div className="dash-card-header">
            <Briefcase size={18} />
            <span>Career</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {activeGoals.length > 0 ? (
            <div className="dash-card-body">
              {activeGoals.map(g => (
                <div key={g.id} className="dash-task-item">
                  <span className="dash-task-dot" />
                  <span>{g.title}</span>
                </div>
              ))}
            </div>
          ) : recentMilestones.length > 0 ? (
            <div className="dash-card-body">
              {recentMilestones.map(m => (
                <p key={m.id} className="text-muted" style={{ fontSize: '0.85rem' }}>{m.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted">Track your wins</p>
          )}
        </div>

        {/* Money Card */}
        <div className="card dash-card" onClick={() => navigate('/money')}>
          <div className="dash-card-header">
            <Wallet size={18} />
            <span>Money</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {upcomingBills.length > 0 ? (
            <div className="dash-card-body">
              {upcomingBills.map(b => (
                <div key={b.id} className="dash-bill-item">
                  <span>{b.name}</span>
                  <span className="text-accent">${Number(b.amount).toLocaleString()}</span>
                  <span className="text-muted">due {b.dueDay === currentDay ? 'today' : `in ${b.dueDay - currentDay}d`}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No bills due soon</p>
          )}
        </div>

        {/* Hobbies Card */}
        <div className="card dash-card" onClick={() => navigate('/hobbies')}>
          <div className="dash-card-header">
            <Gamepad2 size={18} />
            <span>Hobbies</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {currentMedia.length > 0 ? (
            <div className="dash-card-body">
              {currentMedia.map(m => (
                <p key={m.id}><span className="dash-media-type">{m.type}</span> {m.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted">Nothing in progress</p>
          )}
        </div>

        {/* Weekend Card */}
        <div className="card dash-card" onClick={() => navigate('/weekend')}>
          <div className="dash-card-header">
            <Sun size={18} />
            <span>Weekend</span>
            <ChevronRight size={16} className="dash-chevron" />
          </div>
          {weekendPlans.length > 0 ? (
            <div className="dash-card-body">
              {weekendPlans.map(a => (
                <div key={a.id} className="dash-task-item">
                  <span className="dash-task-dot" />
                  <span>{a.title}</span>
                  {a.time && <span className="dash-due">{a.time}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No plans yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
