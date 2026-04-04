import useAuth from '../hooks/useAuth'
import supabase from '../lib/supabase'

export default function AuthGate({ children, fallback }) {
  const { user, loading } = useAuth()

  // No Supabase configured — skip auth, run in local-only mode
  if (!supabase) return children

  if (loading) {
    return (
      <div className="auth-loading">
        <h1 className="auth-loading-logo">FRAN</h1>
      </div>
    )
  }

  if (!user) return fallback

  return children
}
