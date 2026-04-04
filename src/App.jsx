import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Tasks from './pages/Tasks'
import Meals from './pages/Meals'
import Fitness from './pages/Fitness'
import Money from './pages/Money'
import Hobbies from './pages/Hobbies'
import Career from './pages/Career'
import Weekend from './pages/Weekend'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
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
      </Routes>
    </AppLayout>
  )
}
