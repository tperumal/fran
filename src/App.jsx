import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { HouseholdProvider } from './hooks/useHousehold'
import AuthGate from './components/AuthGate'
import AppLayout from './components/AppLayout'
import Tasks from './pages/Tasks'
import Meals from './pages/Meals'
import Fitness from './pages/Fitness'
import Money from './pages/Money'
import Hobbies from './pages/Hobbies'
import Career from './pages/Career'
import Weekend from './pages/Weekend'
import Goals from './pages/Goals'
import Week from './pages/Week'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Help from './pages/Help'
import Onboarding from './pages/Onboarding'

function AppInner() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('fran-onboarded') === '1'
  )

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  return (
    <HouseholdProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/money" element={<Money />} />
          <Route path="/hobbies" element={<Hobbies />} />
          <Route path="/career" element={<Career />} />
          <Route path="/weekend" element={<Weekend />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/week" element={<Week />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </AppLayout>
    </HouseholdProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate fallback={<Auth />}>
        <AppInner />
      </AuthGate>
    </AuthProvider>
  )
}
