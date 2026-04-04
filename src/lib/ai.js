/**
 * Send voice transcript to the AI serverless function and get a structured action back.
 */
export async function processVoiceInput(text) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }))
      console.error('[FRAN AI]', err)
      return { action: 'unknown', response: 'Something went wrong. Try again.' }
    }

    return await res.json()
  } catch (err) {
    console.error('[FRAN AI]', err)
    return { action: 'unknown', response: 'Could not reach the server.' }
  }
}
