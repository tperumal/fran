import { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  CheckSquare,
  UtensilsCrossed,
  ShoppingBag,
  CalendarDays,
  Sun,
  Wallet,
  Target,
  Briefcase,
  Gamepad2,
  Loader2,
  ArrowLeft,
} from 'lucide-react'

const ACTION_META = {
  add_task:           { icon: CheckSquare,     label: 'Task' },
  add_grocery:        { icon: UtensilsCrossed, label: 'Grocery' },
  add_shopping:       { icon: ShoppingBag,     label: 'Shopping' },
  plan_meal:          { icon: UtensilsCrossed, label: 'Meal' },
  add_calendar_event: { icon: CalendarDays,    label: 'Event' },
  add_weekend:        { icon: Sun,             label: 'Weekend' },
  add_bill:           { icon: Wallet,          label: 'Bill' },
  add_goal:           { icon: Target,          label: 'Goal' },
  add_milestone:      { icon: Briefcase,       label: 'Milestone' },
  add_media:          { icon: Gamepad2,        label: 'Media' },
}

export default function MindDumpSheet({ isOpen, onClose, onApply }) {
  const [stage, setStage] = useState('input') // input | loading | review | applying | results
  const [text, setText] = useState('')
  const [summary, setSummary] = useState('')
  const [actions, setActions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null) // { applied: [...], failed: [{action, error}] }
  const textareaRef = useRef(null)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (isOpen && stage === 'input') {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen, stage])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e) {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  function reset() {
    setStage('input')
    setText('')
    setSummary('')
    setActions([])
    setSelected(new Set())
    setError(null)
    setResults(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setStage('loading')
    setError(null)
    try {
      const res = await fetch('/api/mind-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setStage('input')
        return
      }
      if (!data.actions || data.actions.length === 0) {
        setError(data.summary || "Didn't find anything to add. Try rephrasing.")
        setStage('input')
        return
      }
      setSummary(data.summary || '')
      setActions(data.actions)
      setSelected(new Set(data.actions.map(a => a.id)))
      setStage('review')
    } catch (err) {
      setError(err.message || 'Network error.')
      setStage('input')
    }
  }

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleApply() {
    const toApply = actions.filter(a => selected.has(a.id))
    if (toApply.length === 0) return
    setStage('applying')
    try {
      const result = await onApply(toApply)
      if (result?.failed?.length > 0) {
        setResults(result)
        setStage('results')
      } else {
        handleClose()
      }
    } catch (err) {
      setError(err.message || 'Failed to apply some actions.')
      setStage('review')
    }
  }

  if (!isOpen) return null

  return (
    <div className="more-backdrop">
      <div className="more-sheet mind-dump-sheet" ref={sheetRef}>
        <div className="more-sheet-header">
          <h3>
            {stage === 'review' ? 'REVIEW ACTIONS' : 'MIND DUMP'}
          </h3>
          <div className="more-sheet-actions">
            {stage === 'review' && (
              <button className="btn btn-ghost btn-sm" onClick={reset}>
                <ArrowLeft size={14} /> BACK
              </button>
            )}
            <button className="header-btn" onClick={handleClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {stage === 'input' && (
          <div className="mind-dump-input-stage">
            <p className="mind-dump-hint">
              Tell FRAN what's going on. Use your keyboard mic — dictate a brain dump, we'll sort it.
            </p>
            <textarea
              ref={textareaRef}
              className="mind-dump-textarea"
              placeholder="e.g. add milk and eggs to groceries, plan chicken stir-fry for wednesday dinner, remind me to call the dentist friday"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
            {error && <div className="mind-dump-error">{error}</div>}
            <button
              className="btn btn-primary mind-dump-submit"
              onClick={handleSubmit}
              disabled={!text.trim()}
            >
              <Send size={14} /> PARSE
            </button>
          </div>
        )}

        {stage === 'loading' && (
          <div className="mind-dump-loading">
            <Loader2 className="mind-dump-spinner" size={28} />
            <span>Thinking…</span>
          </div>
        )}

        {stage === 'review' && (
          <div className="mind-dump-review-stage">
            {summary && <p className="mind-dump-summary">{summary}</p>}
            <div className="mind-dump-actions-list">
              {actions.map(action => {
                const meta = ACTION_META[action.type] || { icon: CheckSquare, label: 'Action' }
                const Icon = meta.icon
                const isSelected = selected.has(action.id)
                return (
                  <button
                    key={action.id}
                    className={`mind-dump-action ${isSelected ? 'mind-dump-action--selected' : ''}`}
                    onClick={() => toggleSelected(action.id)}
                  >
                    <div className="mind-dump-action-icon">
                      <Icon size={18} />
                    </div>
                    <div className="mind-dump-action-body">
                      <span className="mind-dump-action-label">{meta.label}</span>
                      <span className="mind-dump-action-desc">{action.description}</span>
                    </div>
                    <div className="mind-dump-action-check">
                      {isSelected ? '✓' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
            {error && <div className="mind-dump-error">{error}</div>}
            <button
              className="btn btn-primary mind-dump-submit"
              onClick={handleApply}
              disabled={selected.size === 0}
            >
              APPLY {selected.size} ACTION{selected.size === 1 ? '' : 'S'}
            </button>
          </div>
        )}

        {stage === 'applying' && (
          <div className="mind-dump-loading">
            <Loader2 className="mind-dump-spinner" size={28} />
            <span>Applying…</span>
          </div>
        )}

        {stage === 'results' && results && (
          <div className="mind-dump-review-stage">
            <p className="mind-dump-summary">
              Applied {results.applied.length} of {results.applied.length + results.failed.length}.
            </p>
            <div className="mind-dump-actions-list">
              {results.failed.map((f, i) => {
                const meta = ACTION_META[f.action.type] || { icon: CheckSquare, label: f.action.type }
                const Icon = meta.icon
                return (
                  <div key={i} className="mind-dump-action mind-dump-action--failed">
                    <div className="mind-dump-action-icon">
                      <Icon size={18} />
                    </div>
                    <div className="mind-dump-action-body">
                      <span className="mind-dump-action-label">{meta.label} — FAILED</span>
                      <span className="mind-dump-action-desc">{f.action.description}</span>
                      <span className="mind-dump-action-err">{f.error}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-primary mind-dump-submit" onClick={handleClose}>
              DISMISS
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
