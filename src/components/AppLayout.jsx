import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import useVoice from '../hooks/useVoice'
import useAuth from '../hooks/useAuth'
import useHousehold from '../hooks/useHousehold'
import { processVoiceInput } from '../lib/ai'
import supabase from '../lib/supabase'

const ALL_NAV_ITEMS = [
  { id: 'dashboard', to: '/', label: 'Home', icon: LayoutDashboard },
  { id: 'fitness', to: '/fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'meals', to: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { id: 'tasks', to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'money', to: '/money', label: 'Money', icon: Wallet },
  { id: 'hobbies', to: '/hobbies', label: 'Hobbies', icon: Gamepad2 },
  { id: 'career', to: '/career', label: 'Career', icon: Briefcase },
  { id: 'weekend', to: '/weekend', label: 'Weekend', icon: Sun },
]

const DEFAULT_PINNED = ['dashboard', 'tasks', 'fitness', 'meals']
const NAV_KEY = 'hive-nav-pinned'

function loadPinned() {
  try {
    const stored = localStorage.getItem(NAV_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 4) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_PINNED
}

function savePinned(ids) {
  localStorage.setItem(NAV_KEY, JSON.stringify(ids))
}

export default function AppLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { isListening, transcript, startListening, stopListening, error } = useVoice()
  const [pinnedIds, setPinnedIds] = useState(loadPinned)
  const [showMore, setShowMore] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState(null)
  const [processing, setProcessing] = useState(false)
  const sheetRef = useRef(null)
  const toastTimer = useRef(null)

  useEffect(() => { savePinned(pinnedIds) }, [pinnedIds])

  // Process voice input
  useEffect(() => {
    if (!isListening && transcript && !processing) {
      handleVoiceResult(transcript)
    }
  }, [isListening, transcript])

  async function handleVoiceResult(text) {
    setProcessing(true)
    showToast(`"${text}"`, 2000)

    const result = await processVoiceInput(text)
    console.log('[FRAN Voice] Action:', result.action, result)

    await executeAction(result)
    setProcessing(false)
  }

  async function executeAction(result) {
    const { action } = result
    const isOnline = !!supabase && !!user

    try {
      switch (action) {
        case 'navigate':
          navigate(result.to)
          showToast(`Opened ${result.to.replace('/', '') || 'home'}`)
          break

        case 'add_task': {
          if (isOnline) {
            // Find the matching list
            const { data: lists } = await supabase
              .from('task_lists')
              .select('id, name')
              .eq('profile_id', user.id)
            const list = lists?.find(l => l.name.toLowerCase() === (result.list || 'personal').toLowerCase()) || lists?.[0]
            if (list) {
              const row = { list_id: list.id, title: result.title, created_by: user.id }
              if (householdId) row.household_id = householdId
              await supabase.from('tasks').insert(row)
            }
          }
          showToast(`Task added: ${result.title}`)
          navigate('/tasks')
          break
        }

        case 'add_grocery': {
          if (isOnline) {
            const row = { name: result.name, category: result.category || 'other', profile_id: user.id }
            if (householdId) row.household_id = householdId
            const { error } = await supabase.from('grocery_items').insert(row)
            if (error) { showToast(`Error: ${error.message}`); break }
          }
          showToast(`Grocery added: ${result.name}`)
          navigate('/meals')
          break
        }

        case 'add_weekend': {
          if (isOnline) {
            const now = new Date()
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
            const weekKey = weekStart.toISOString().split('T')[0]
            const row = {
              title: result.title,
              day: result.day || 'sat',
              time: result.time || null,
              tag: result.tag || null,
              week_key: weekKey,
              profile_id: user.id,
            }
            if (householdId) row.household_id = householdId
            await supabase.from('weekend_activities').insert(row)
          }
          showToast(`Weekend: ${result.title}`)
          navigate('/weekend')
          break
        }

        case 'add_bill': {
          if (isOnline) {
            const row = {
              name: result.name,
              amount: Number(result.amount),
              due_day: Number(result.dueDay || 1),
              frequency: result.frequency || 'monthly',
              category: 'Other',
              profile_id: user.id,
            }
            if (householdId) row.household_id = householdId
            await supabase.from('bills').insert(row)
          }
          showToast(`Bill added: ${result.name}`)
          navigate('/money')
          break
        }

        case 'add_milestone': {
          if (isOnline) {
            await supabase.from('career_milestones').insert({
              title: result.title,
              category: result.category || 'achievement',
              date: new Date().toISOString().split('T')[0],
              profile_id: user.id,
            })
          }
          showToast(`Milestone: ${result.title}`)
          navigate('/career')
          break
        }

        case 'add_media': {
          if (isOnline) {
            await supabase.from('media_items').insert({
              title: result.title,
              media_type: result.type || 'movie',
              status: result.status || 'want',
              profile_id: user.id,
            })
          }
          showToast(`Added: ${result.title}`)
          navigate('/hobbies')
          break
        }

        case 'plan_meal': {
          showToast(`Meal planned: ${result.name} for ${result.day} ${result.meal}`)
          navigate('/meals')
          break
        }

        case 'unknown':
        default:
          showToast(result.response || "Didn't catch that. Try again.")
          break
      }
    } catch (err) {
      console.error('[FRAN Voice] Action error:', err)
      showToast('Something went wrong.')
    }
  }

  function showToast(message, duration = 3000) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }

  useEffect(() => {
    if (!showMore) return
    function handleClick(e) {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setShowMore(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMore])

  const handleVoiceToggle = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const pinnedItems = pinnedIds
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter(Boolean)

  const unpinnedItems = ALL_NAV_ITEMS.filter(item => !pinnedIds.includes(item.id))

  function handleSwap(addId, removeId) {
    setPinnedIds(prev => prev.map(id => id === removeId ? addId : id))
  }

  function handleNavFromMore(to) {
    navigate(to)
    setShowMore(false)
    setEditing(false)
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <h1>FRAN</h1>
        </div>
        <div className="app-header-right">
          <button
            className={`header-btn ${isListening ? 'listening' : ''} ${processing ? 'processing' : ''}`}
            onClick={handleVoiceToggle}
            aria-label={isListening ? 'Stop listening' : 'Voice'}
            title={error || (isListening ? 'Listening...' : processing ? 'Processing...' : 'Voice command')}
            disabled={processing}
          >
            <Mic />
          </button>
          <NavLink to="/settings" className="header-btn" aria-label="Settings">
            <Settings size={20} />
          </NavLink>
          <button
            className="header-btn"
            onClick={() => setShowMore(v => !v)}
            aria-label="All modules"
          >
            <Menu />
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      {/* Voice Toast */}
      {toast && (
        <div className="voice-toast">
          <span>{toast}</span>
        </div>
      )}

      {/* More Sheet */}
      {showMore && (
        <div className="more-backdrop">
          <div className="more-sheet" ref={sheetRef}>
            <div className="more-sheet-header">
              <h3>{editing ? 'EDIT NAV' : 'MODULES'}</h3>
              <div className="more-sheet-actions">
                {!editing && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                    EDIT
                  </button>
                )}
                {editing && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                    DONE
                  </button>
                )}
                <button className="header-btn" onClick={() => { setShowMore(false); setEditing(false) }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {!editing ? (
              <div className="more-grid">
                {ALL_NAV_ITEMS.map(item => {
                  const Icon = item.icon
                  const isActive = item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)
                  const isPinned = pinnedIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      className={`more-grid-item ${isActive ? 'more-grid-item--active' : ''}`}
                      onClick={() => handleNavFromMore(item.to)}
                    >
                      <div className="more-grid-icon">
                        <Icon size={22} />
                      </div>
                      <span className="more-grid-label">{item.label}</span>
                      {isPinned && <span className="more-pinned-dot" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="more-edit">
                <p className="more-edit-hint">Tap to swap an unpinned module into your nav bar.</p>

                <div className="more-edit-section">
                  <span className="more-edit-label">PINNED</span>
                  <div className="more-edit-list">
                    {pinnedItems.map(item => {
                      const Icon = item.icon
                      return (
                        <div key={item.id} className="more-edit-item more-edit-item--pinned">
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="more-edit-section">
                  <span className="more-edit-label">AVAILABLE</span>
                  <div className="more-edit-list">
                    {unpinnedItems.map(item => {
                      const Icon = item.icon
                      return (
                        <div key={item.id} className="more-edit-item more-edit-item--unpinned">
                          <Icon size={16} />
                          <span>{item.label}</span>
                          <div className="more-swap-targets">
                            {pinnedItems.map(pinned => {
                              const PinnedIcon = pinned.icon
                              return (
                                <button
                                  key={pinned.id}
                                  className="more-swap-btn"
                                  onClick={() => handleSwap(item.id, pinned.id)}
                                  title={`Replace ${pinned.label}`}
                                >
                                  <PinnedIcon size={12} />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation — 4 pinned items only */}
      <nav className="bottom-nav">
        {pinnedItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
