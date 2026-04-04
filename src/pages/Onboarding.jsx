import { useState } from 'react'
import './Onboarding.css'

const STEPS = [
  {
    title: 'WELCOME TO FRAN',
    body: 'Your life, organized. One app for tasks, meals, fitness, money, and more.',
    button: 'NEXT',
  },
  {
    title: 'TALK TO FRAN',
    body: 'Tap the mic and say things like:',
    examples: [
      '"Add milk to the grocery list"',
      '"Plan Saturday — dinner at 7"',
      '"Log a workout — bench press 3x10"',
    ],
    button: 'NEXT',
  },
  {
    title: 'MAKE IT YOURS',
    lines: [
      'Your bottom nav shows 4 modules. Tap the menu icon to see all 8 and swap them.',
      'Tap the pencil on the home screen to show or hide cards.',
    ],
    button: 'NEXT',
  },
  {
    title: 'SHARE WITH YOUR PARTNER',
    lines: [
      'Go to Settings \u2192 Create Household \u2192 Share the invite code.',
      'Tasks, meals, grocery lists, bills, and weekend plans sync between you.',
    ],
    button: 'GET STARTED',
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('fran-onboarded', '1')
      onComplete()
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <h1 className="onboarding-title">{current.title}</h1>

        {current.body && (
          <p className="onboarding-body">{current.body}</p>
        )}

        {current.examples && (
          <div className="onboarding-examples">
            {current.examples.map((ex, i) => (
              <div key={i} className="onboarding-example">{ex}</div>
            ))}
          </div>
        )}

        {current.lines && (
          <div className="onboarding-lines">
            {current.lines.map((line, i) => (
              <p key={i} className="onboarding-line">{line}</p>
            ))}
          </div>
        )}

        <button className="btn btn-primary onboarding-btn" onClick={advance}>
          {current.button}
        </button>
      </div>

      <div className="onboarding-dots">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`onboarding-dot ${i <= step ? 'onboarding-dot--filled' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
