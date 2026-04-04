import { useState } from 'react'
import { Copy, LogOut, Plus, UserPlus, Users, Crown, User } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import useHousehold from '../hooks/useHousehold'
import './Settings.css'

export default function Settings() {
  const { user, profile, signOut } = useAuth()
  const {
    household,
    members,
    inviteCode,
    loading,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  } = useHousehold()

  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!householdName.trim()) return
    setError(null)
    setCreating(true)
    try {
      await createHousehold(householdName.trim())
      setHouseholdName('')
    } catch (err) {
      setError(err.message)
    }
    setCreating(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setError(null)
    setJoining(true)
    try {
      await joinHousehold(joinCode.trim())
      setJoinCode('')
    } catch (err) {
      setError(err.message)
    }
    setJoining(false)
  }

  async function handleLeave() {
    if (!confirm('Leave this household? You can rejoin with the invite code.')) return
    setError(null)
    try {
      await leaveHousehold()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleCopy() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Settings</h2>
      <p className="text-muted">Profile and household.</p>

      {/* Profile Section */}
      <div className="card settings-section">
        <h3>Profile</h3>
        <div className="settings-profile-info">
          <div className="settings-avatar">
            <User size={24} />
          </div>
          <div className="settings-profile-text">
            <span className="settings-display-name">
              {profile?.display_name || 'Anonymous'}
            </span>
            <span className="settings-email">{user?.email}</span>
          </div>
        </div>
        <button className="btn btn-ghost settings-signout" onClick={signOut}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {error && (
        <div className="settings-error">{error}</div>
      )}

      {/* Household Section */}
      {household ? (
        <div className="card settings-section">
          <h3>
            <Users size={16} /> Household
          </h3>
          <div className="settings-household-name">{household.name}</div>

          {/* Invite Code */}
          <div className="settings-invite">
            <span className="settings-invite-label">Invite Code</span>
            <div className="settings-invite-row">
              <span className="settings-invite-code">{inviteCode}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="settings-members">
            <span className="settings-members-label">Members</span>
            {members.map(m => (
              <div key={m.profileId} className="settings-member">
                <div className="settings-member-icon">
                  {m.role === 'owner' ? <Crown size={14} /> : <User size={14} />}
                </div>
                <span className="settings-member-name">{m.displayName}</span>
                <span className="settings-member-role">{m.role}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost settings-leave" onClick={handleLeave}>
            Leave Household
          </button>
        </div>
      ) : (
        <>
          {/* Create Household */}
          <div className="card settings-section">
            <h3>
              <Plus size={16} /> Create Household
            </h3>
            <form onSubmit={handleCreate} className="settings-form">
              <input
                type="text"
                placeholder="Household name"
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !householdName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>

          {/* Join Household */}
          <div className="card settings-section">
            <h3>
              <UserPlus size={16} /> Join Household
            </h3>
            <form onSubmit={handleJoin} className="settings-form">
              <input
                type="text"
                placeholder="6-character invite code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={joining || joinCode.length !== 6}
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
