import { useState } from 'react'
import useAuth from '../hooks/useAuth'
import './Auth.css'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setConfirmMsg('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        await signUp(email, password, name.trim())
        setConfirmMsg('Check your email to confirm your account.')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">FRAN</h1>
        <p className="auth-tagline">Your life, organized.</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'auth-tab--active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); setConfirmMsg('') }}
          >
            SIGN IN
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setConfirmMsg('') }}
          >
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />

          {error && <p className="auth-error">{error}</p>}
          {confirmMsg && <p className="auth-confirm">{confirmMsg}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? '...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  )
}
