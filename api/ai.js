export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: 'Missing text field' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are FRAN, a voice assistant for a personal life management app. Parse the user's spoken command and return a JSON action.

Available actions:
- {"action": "add_task", "title": "...", "list": "Personal|Shared|Home"}
- {"action": "add_grocery", "name": "...", "category": "produce|protein|dairy|pantry|other"}
- {"action": "add_weekend", "title": "...", "day": "sat|sun", "time": "HH:MM" (optional), "tag": "Date Night|Outdoors|Social|Chill|Errands|Family|Adventure" (optional)}
- {"action": "add_bill", "name": "...", "amount": number, "dueDay": number (1-31), "frequency": "monthly|quarterly|yearly"}
- {"action": "add_milestone", "title": "...", "category": "promotion|achievement|goal"}
- {"action": "add_media", "title": "...", "type": "book|movie|tv|game|podcast", "status": "want|in_progress|done"}
- {"action": "plan_meal", "day": "mon|tue|wed|thu|fri|sat|sun", "meal": "breakfast|lunch|dinner", "name": "..."}
- {"action": "navigate", "to": "/fitness|/meals|/tasks|/money|/hobbies|/career|/weekend|/settings|/"}
- {"action": "unknown", "response": "..."}

Rules:
- Always respond with valid JSON only, no markdown, no explanation.
- Pick the most specific action that matches the user's intent.
- If the user says "go to X" or "open X" or "show me X", use navigate.
- If unclear, use {"action": "unknown", "response": "..."} with a helpful suggestion.
- For grocery items, infer the category from the item name.
- For tasks, infer the list (default to "Personal" if unclear, "Shared" if it involves the household).
- Keep it snappy — this is voice input, not a conversation.`,
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: `Claude API error: ${err}` })
    }

    const data = await response.json()
    let content = data.content?.[0]?.text || '{}'

    // Strip markdown code blocks if Claude wrapped the JSON
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    // Parse the JSON response
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      // Try to extract JSON from within the text
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          parsed = { action: 'unknown', response: content }
        }
      } else {
        parsed = { action: 'unknown', response: content }
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
