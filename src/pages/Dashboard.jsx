import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, CheckSquare, Wallet, Gamepad2, Briefcase, Sun, ChevronRight, Calendar } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, startOfWeek, addDays, isBefore } from 'date-fns'
import './Dashboard.css'

function loadJSON(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch { return fallback }
}

export default function Dashboard() {
  const navigate = useNavigate()
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

  return (
    <div className="page">
      <h2>Today</h2>
      <p className="text-muted">{format(today, 'EEEE, MMMM d')}</p>

      <div className="dash-grid">
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
