import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './Help.css'

export default function Help() {
  const navigate = useNavigate()

  return (
    <div className="page help-page">
      <button className="btn btn-ghost help-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> BACK
      </button>

      <h2>HELP</h2>
      <p className="text-muted">Everything you need to know.</p>

      {/* Modules */}
      <section className="help-section">
        <h3>MODULES</h3>
        <div className="help-list">
          <div className="help-item">
            <span className="help-item-label">TASKS</span>
            <span className="help-item-desc">To-do lists, chores, and errands</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">FITNESS</span>
            <span className="help-item-desc">Log workouts, track progress</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">MEALS</span>
            <span className="help-item-desc">Meal plans and grocery lists</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">CAREER</span>
            <span className="help-item-desc">Goals, milestones, and wins</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">MONEY</span>
            <span className="help-item-desc">Bills, budgets, and spending</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">HOBBIES</span>
            <span className="help-item-desc">Movies, books, games, and media</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">WEEKEND</span>
            <span className="help-item-desc">Plan Saturday and Sunday activities</span>
          </div>
          <div className="help-item">
            <span className="help-item-label">DASHBOARD</span>
            <span className="help-item-desc">Today at a glance with mood and weather</span>
          </div>
        </div>
      </section>

      {/* Voice Commands */}
      <section className="help-section">
        <h3>VOICE COMMANDS</h3>
        <p className="help-desc">Tap the mic icon in the top right and say:</p>
        <div className="help-examples">
          <div className="help-example">"Add eggs to grocery list"</div>
          <div className="help-example">"Plan Saturday — dinner at 7"</div>
          <div className="help-example">"Log a workout — bench press 3x10"</div>
          <div className="help-example">"Open tasks"</div>
          <div className="help-example">"Add rent $1500 due on the 1st"</div>
        </div>
      </section>

      {/* Navigation */}
      <section className="help-section">
        <h3>NAVIGATION</h3>
        <div className="help-steps">
          <p className="help-step"><strong>BOTTOM NAV</strong> — 4 pinned module shortcuts. Tap to switch.</p>
          <p className="help-step"><strong>HAMBURGER MENU</strong> — Tap the menu icon (top right) to see all 8 modules.</p>
          <p className="help-step"><strong>CUSTOMIZE NAV</strong> — In the menu, tap "Edit" to swap which modules are pinned.</p>
        </div>
      </section>

      {/* Household Sharing */}
      <section className="help-section">
        <h3>HOUSEHOLD SHARING</h3>
        <div className="help-steps">
          <p className="help-step"><strong>1.</strong> Go to Settings (gear icon, top right).</p>
          <p className="help-step"><strong>2.</strong> Tap "Create Household" and name it.</p>
          <p className="help-step"><strong>3.</strong> Share the 6-character invite code with your partner.</p>
          <p className="help-step"><strong>4.</strong> Your partner signs up, goes to Settings, and enters the code under "Join Household".</p>
          <p className="help-step"><strong>5.</strong> Tasks, meals, grocery lists, bills, and weekend plans now sync between you.</p>
        </div>
      </section>

      {/* Dashboard */}
      <section className="help-section">
        <h3>DASHBOARD</h3>
        <div className="help-steps">
          <p className="help-step"><strong>CUSTOMIZE</strong> — Tap the pencil icon next to "Today" to show or hide modules and widgets.</p>
          <p className="help-step"><strong>MOOD</strong> — Tap an emoji on the dashboard to log how you feel. See your partner's mood too.</p>
          <p className="help-step"><strong>WEATHER</strong> — Auto-detects your location and shows current conditions.</p>
        </div>
      </section>
    </div>
  )
}
