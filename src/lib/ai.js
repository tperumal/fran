/**
 * Process voice input and determine intent + target module.
 *
 * For now this is a local mock parser. Later it will call /api/ai
 * backed by Claude to handle complex natural language.
 */

const MODULE_KEYWORDS = {
  fitness: ['log', 'workout', 'exercise', 'run', 'gym', 'lift', 'steps'],
  meals: ['plan', 'meal', 'cook', 'grocery', 'recipe', 'food', 'dinner', 'lunch', 'breakfast'],
  tasks: ['task', 'todo', 'clean', 'chore', 'remind', 'errand', 'fix'],
  money: ['bill', 'save', 'budget', 'spend', 'pay', 'expense', 'income'],
  hobbies: ['watch', 'read', 'play', 'book', 'movie', 'game', 'show', 'series', 'podcast'],
}

function detectModule(text) {
  const lower = text.toLowerCase()
  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return module
      }
    }
  }
  return null
}

export async function processVoiceInput(text, context = {}) {
  // In the future, this will POST to /api/ai:
  //
  // const res = await fetch('/api/ai', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text, context }),
  // })
  // return res.json()

  const module = detectModule(text)

  if (!module) {
    return {
      intent: 'unknown',
      module: null,
      rawText: text,
      response: "I'm not sure what you meant. Try saying something like \"log a workout\" or \"add a task\".",
    }
  }

  return {
    intent: 'add',
    module,
    rawText: text,
    response: `Got it! Adding to ${module}...`,
  }
}
