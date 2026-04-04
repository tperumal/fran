import { useState, useRef } from 'react'
import {
  Dumbbell,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  ClipboardList,
  History,
  Play,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import useFitnessData from '../hooks/useFitnessData'
import './Fitness.css'

function uid() {
  return crypto.randomUUID()
}

// ─── Main Component ─────────────────────────────────────────

export default function Fitness() {
  const { workouts, templates, loading, saveWorkout, deleteWorkout: removeWorkout, saveTemplate, deleteTemplate: removeTemplate } = useFitnessData()
  const [tab, setTab] = useState('history')
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  function startBlankWorkout() {
    setActiveWorkout({
      id: uid(),
      name: '',
      exercises: [],
      notes: '',
      saveAsTemplate: false,
    })
  }

  function startFromTemplate(template) {
    setActiveWorkout({
      id: uid(),
      name: template.name,
      exercises: template.exercises.map(ex => ({
        name: ex.name,
        sets: Array.from({ length: ex.defaultSets || 3 }, () => ({
          reps: ex.defaultReps || 10,
          weight: ex.defaultWeight || 0,
        })),
      })),
      notes: '',
      saveAsTemplate: false,
    })
  }

  async function finishWorkout() {
    if (!activeWorkout) return
    const filtered = activeWorkout.exercises.filter(ex => ex.name.trim())
    if (filtered.length === 0) return

    const workout = {
      id: activeWorkout.id,
      name: activeWorkout.name.trim() || 'Workout',
      date: new Date().toISOString(),
      exercises: filtered.map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets.filter(s => s.reps > 0),
      })),
      notes: activeWorkout.notes.trim() || undefined,
    }

    await saveWorkout(workout)

    if (activeWorkout.saveAsTemplate) {
      const tmpl = {
        id: uid(),
        name: workout.name,
        exercises: workout.exercises.map(ex => ({
          name: ex.name,
          defaultSets: ex.sets.length,
          defaultReps: ex.sets[0]?.reps || 10,
          defaultWeight: ex.sets[0]?.weight || 0,
        })),
      }
      await saveTemplate(tmpl)
    }

    setActiveWorkout(null)
    setTab('history')
  }

  async function deleteWorkout(id) {
    await removeWorkout(id)
    if (expandedId === id) setExpandedId(null)
  }

  async function deleteTemplate(id) {
    await removeTemplate(id)
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page">
      <h2>Fitness</h2>
      <p className="text-muted">Track your workouts and progress.</p>

      {/* Tabs */}
      <div className="fitness-tabs">
        <button
          className={`fitness-tab ${tab === 'history' ? 'fitness-tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          <History size={16} /> History
        </button>
        <button
          className={`fitness-tab ${tab === 'templates' ? 'fitness-tab--active' : ''}`}
          onClick={() => setTab('templates')}
        >
          <ClipboardList size={16} /> Templates
        </button>
      </div>

      {/* Start Workout Button */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 20 }}
        onClick={startBlankWorkout}
      >
        <Play size={18} /> Start Workout
      </button>

      {/* Tab Content */}
      {tab === 'history' && (
        <HistoryTab
          workouts={workouts}
          expandedId={expandedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
          onDelete={deleteWorkout}
        />
      )}
      {tab === 'templates' && (
        <TemplatesTab
          templates={templates}
          onDelete={deleteTemplate}
          onAdd={saveTemplate}
          onUse={startFromTemplate}
        />
      )}

      {/* Active Workout Overlay */}
      {activeWorkout && (
        <ActiveWorkoutOverlay
          workout={activeWorkout}
          setWorkout={setActiveWorkout}
          templates={templates}
          onLoadTemplate={startFromTemplate}
          onFinish={finishWorkout}
          onCancel={() => setActiveWorkout(null)}
        />
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────

function HistoryTab({ workouts, expandedId, onToggle, onDelete }) {
  if (workouts.length === 0) {
    return (
      <div className="fitness-empty">
        <Dumbbell size={48} />
        <p>No workouts logged yet. Hit "Start Workout" to begin!</p>
      </div>
    )
  }

  return (
    <div className="fitness-history-list">
      {workouts.map(w => (
        <div key={w.id} className="fitness-history-item" onClick={() => onToggle(w.id)}>
          <div className="fitness-history-header">
            <span className="fitness-history-title">{w.name}</span>
            {expandedId === w.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          <div className="fitness-history-meta">
            <span><Clock size={13} style={{ verticalAlign: -2 }} /> {format(parseISO(w.date), 'MMM d, yyyy · h:mm a')}</span>
            <span>{w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}</span>
          </div>

          {expandedId === w.id && (
            <div className="fitness-history-detail" onClick={e => e.stopPropagation()}>
              {w.notes && <div className="fitness-history-notes">"{w.notes}"</div>}
              {w.exercises.map((ex, i) => (
                <div key={i} className="fitness-exercise-block">
                  <div className="fitness-exercise-name">{ex.name}</div>
                  <table className="fitness-sets-table">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Reps</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((s, j) => (
                        <tr key={j}>
                          <td className="set-number">{j + 1}</td>
                          <td>{s.reps}</td>
                          <td>{s.weight > 0 ? `${s.weight} kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <button
                className="btn btn-ghost"
                style={{ marginTop: 8, color: 'var(--danger)', fontSize: '0.8rem' }}
                onClick={() => onDelete(w.id)}
              >
                <Trash2 size={14} /> Delete Workout
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Templates Tab ────────────────────────────────────────────

function TemplatesTab({ templates, onDelete, onAdd, onUse }) {
  const [showForm, setShowForm] = useState(false)
  const [tmplName, setTmplName] = useState('')
  const [tmplExercises, setTmplExercises] = useState([
    { name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0 },
  ])

  function addExerciseRow() {
    setTmplExercises(prev => [...prev, { name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0 }])
  }

  function updateExercise(idx, field, value) {
    setTmplExercises(prev =>
      prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex)
    )
  }

  function removeExercise(idx) {
    setTmplExercises(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    const filtered = tmplExercises.filter(ex => ex.name.trim())
    if (!tmplName.trim() || filtered.length === 0) return
    onAdd({
      id: uid(),
      name: tmplName.trim(),
      exercises: filtered.map(ex => ({
        name: ex.name.trim(),
        defaultSets: Number(ex.defaultSets) || 3,
        defaultReps: Number(ex.defaultReps) || 10,
        defaultWeight: Number(ex.defaultWeight) || 0,
      })),
    })
    setTmplName('')
    setTmplExercises([{ name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0 }])
    setShowForm(false)
  }

  return (
    <div>
      <button
        className="btn btn-secondary"
        style={{ width: '100%', marginBottom: 16 }}
        onClick={() => setShowForm(!showForm)}
      >
        <Plus size={16} /> {showForm ? 'Cancel' : 'New Template'}
      </button>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <input
            placeholder="Template name (e.g. Push Day)"
            value={tmplName}
            onChange={e => setTmplName(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <p className="fitness-section-heading">Exercises</p>
          <div className="fitness-template-exercises">
            {tmplExercises.map((ex, i) => (
              <div key={i} className="fitness-template-exercise-row">
                <input
                  placeholder="Exercise name"
                  value={ex.name}
                  onChange={e => updateExercise(i, 'name', e.target.value)}
                />
                <input
                  className="small"
                  type="number"
                  placeholder="Sets"
                  value={ex.defaultSets}
                  onChange={e => updateExercise(i, 'defaultSets', e.target.value)}
                />
                <input
                  className="small"
                  type="number"
                  placeholder="Reps"
                  value={ex.defaultReps}
                  onChange={e => updateExercise(i, 'defaultReps', e.target.value)}
                />
                <input
                  className="small"
                  type="number"
                  placeholder="kg"
                  value={ex.defaultWeight}
                  onChange={e => updateExercise(i, 'defaultWeight', e.target.value)}
                />
                {tmplExercises.length > 1 && (
                  <button className="fitness-template-delete-btn" onClick={() => removeExercise(i)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="fitness-add-set-btn" onClick={addExerciseRow}>
            <Plus size={14} /> Add Exercise
          </button>

          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
              Save Template
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="fitness-empty">
          <ClipboardList size={48} />
          <p>No templates yet. Create one to quickly start your favorite workouts.</p>
        </div>
      ) : (
        <div className="fitness-template-list">
          {templates.map(t => (
            <div key={t.id} className="fitness-template-card">
              <div className="fitness-template-card-header">
                <h4>{t.name}</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={() => onUse(t)}
                  >
                    <Play size={13} /> Use
                  </button>
                  <button
                    className="fitness-template-delete-btn"
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="fitness-template-card-exercises">
                {t.exercises.map((ex, i) => (
                  <div key={i}>
                    {ex.name} — {ex.defaultSets}x{ex.defaultReps}
                    {ex.defaultWeight > 0 ? ` @ ${ex.defaultWeight} kg` : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Active Workout Overlay ───────────────────────────────────

function ActiveWorkoutOverlay({ workout, setWorkout, templates, onLoadTemplate, onFinish, onCancel }) {
  const [newExerciseName, setNewExerciseName] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(
    workout.exercises.length === 0 && templates.length > 0
  )
  const inputRef = useRef(null)

  function addExercise() {
    const name = newExerciseName.trim()
    if (!name) return
    setWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name, sets: [{ reps: 10, weight: 0 }] }],
    }))
    setNewExerciseName('')
    inputRef.current?.focus()
  }

  function removeExercise(idx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx),
    }))
  }

  function addSet(exIdx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        const lastSet = ex.sets[ex.sets.length - 1] || { reps: 10, weight: 0 }
        return { ...ex, sets: [...ex.sets, { ...lastSet }] }
      }),
    }))
  }

  function removeSet(exIdx, setIdx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
      }),
    }))
  }

  function updateSet(exIdx, setIdx, field, value) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        return {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx ? { ...s, [field]: Number(value) || 0 } : s
          ),
        }
      }),
    }))
  }

  return (
    <div className="fitness-overlay">
      <div className="fitness-overlay-header">
        <h3>Active Workout</h3>
        <button className="btn btn-ghost" onClick={onCancel} style={{ padding: 6 }}>
          <X size={22} />
        </button>
      </div>

      <div className="fitness-overlay-body">
        {/* Template Picker */}
        {showTemplatePicker && (
          <>
            <p className="fitness-section-heading">Start from a template</p>
            <div className="fitness-template-picker">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="fitness-template-option"
                  onClick={() => { onLoadTemplate(t); setShowTemplatePicker(false) }}
                >
                  <span className="fitness-template-option-name">{t.name}</span>
                  <span className="fitness-template-option-meta">
                    {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.85rem' }}
                onClick={() => setShowTemplatePicker(false)}
              >
                or start blank
              </button>
            </div>
          </>
        )}

        {!showTemplatePicker && (
          <>
            {/* Workout Name */}
            <input
              className="fitness-workout-name-input"
              placeholder="Workout name (e.g. Upper Body)"
              value={workout.name}
              onChange={e => setWorkout(prev => ({ ...prev, name: e.target.value }))}
            />

            {/* Add Exercise */}
            <div className="fitness-add-exercise-row">
              <input
                ref={inputRef}
                placeholder="Add exercise..."
                value={newExerciseName}
                onChange={e => setNewExerciseName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addExercise() }}
              />
              <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={addExercise}>
                <Plus size={18} />
              </button>
            </div>

            {/* Exercises List */}
            {workout.exercises.length === 0 && (
              <div className="fitness-empty" style={{ padding: '32px 0' }}>
                <Dumbbell size={36} />
                <p>Add your first exercise above to get started.</p>
              </div>
            )}

            {workout.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="fitness-active-exercise">
                <div className="fitness-active-exercise-header">
                  <h4>{ex.name}</h4>
                  <button className="fitness-template-delete-btn" onClick={() => removeExercise(exIdx)}>
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Sets Header */}
                <div className="fitness-set-row" style={{ marginBottom: 4 }}>
                  <span className="fitness-set-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Set</span>
                  <span style={{ width: 72, fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reps</span>
                  <span className="fitness-set-unit" />
                  <span style={{ width: 72, fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Weight</span>
                  <span className="fitness-set-unit" />
                  <span style={{ width: 26 }} />
                </div>

                {/* Set Rows */}
                {ex.sets.map((s, sIdx) => (
                  <div key={sIdx} className="fitness-set-row">
                    <span className="fitness-set-label">{sIdx + 1}</span>
                    <input
                      className="fitness-set-input"
                      type="number"
                      value={s.reps}
                      onChange={e => updateSet(exIdx, sIdx, 'reps', e.target.value)}
                      min={0}
                    />
                    <span className="fitness-set-unit">reps</span>
                    <input
                      className="fitness-set-input"
                      type="number"
                      value={s.weight}
                      onChange={e => updateSet(exIdx, sIdx, 'weight', e.target.value)}
                      min={0}
                      step={0.5}
                    />
                    <span className="fitness-set-unit">kg</span>
                    {ex.sets.length > 1 && (
                      <button className="fitness-set-delete" onClick={() => removeSet(exIdx, sIdx)}>
                        <X size={14} />
                      </button>
                    )}
                    {ex.sets.length <= 1 && <span style={{ width: 26 }} />}
                  </div>
                ))}

                <button className="fitness-add-set-btn" onClick={() => addSet(exIdx)}>
                  <Plus size={14} /> Add Set
                </button>
              </div>
            ))}

            {/* Notes */}
            <div className="fitness-notes">
              <label>Notes (optional)</label>
              <textarea
                placeholder="How did it feel?"
                value={workout.notes}
                onChange={e => setWorkout(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Save as Template */}
            <label className="fitness-save-template">
              <input
                type="checkbox"
                checked={workout.saveAsTemplate}
                onChange={e => setWorkout(prev => ({ ...prev, saveAsTemplate: e.target.checked }))}
              />
              Save as template for next time
            </label>
          </>
        )}
      </div>

      {/* Footer */}
      {!showTemplatePicker && (
        <div className="fitness-overlay-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={onFinish}
            disabled={workout.exercises.filter(ex => ex.name.trim()).length === 0}
          >
            Finish Workout
          </button>
        </div>
      )}
    </div>
  )
}
