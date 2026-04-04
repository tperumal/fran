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
} from 'lucide-react'
import useVoice from '../hooks/useVoice'
import { processVoiceInput } from '../lib/ai'

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
  const { isListening, transcript, startListening, stopListening, error } = useVoice()
  const [pinnedIds, setPinnedIds] = useState(loadPinned)
  const [showMore, setShowMore] = useState(false)
  const [editing, setEditing] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => { savePinned(pinnedIds) }, [pinnedIds])

  useEffect(() => {
    if (!isListening && transcript) {
      processVoiceInput(transcript, { currentPath: location.pathname }).then(
        (result) => { console.log('[FRAN Voice]', result) }
      )
    }
  }, [isListening, transcript, location.pathname])

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
            className={`header-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceToggle}
            aria-label={isListening ? 'Stop listening' : 'Voice'}
            title={error || (isListening ? 'Listening...' : 'Voice command')}
          >
            <Mic />
          </button>
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
