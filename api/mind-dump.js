export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { text } = req.body
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or empty text field' })
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
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `You are FRAN's mind-dump parser. The user dictated a free-form brain dump. Extract every discrete action they want to take and return them as a structured list.

Return ONLY valid JSON in this exact shape:
{
  "summary": "one short sentence recapping what they said",
  "actions": [
    { "id": "a1", "type": "<action_type>", "description": "<human-readable line>", ...fields }
  ]
}

Action types and their fields:

- add_task: { title: string, list: "Personal" | "Shared" | "Home", dueDate?: "YYYY-MM-DD" }
- add_grocery: { name: string, category: "produce" | "protein" | "dairy" | "pantry" | "frozen" | "other" }
- add_shopping: { name: string, notes?: string }
- plan_meal: { day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", meal: "breakfast" | "lunch" | "dinner", name: string }
- add_calendar_event: { day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", title: string, startTime?: "HH:MM", endTime?: "HH:MM", recurring?: boolean }
- add_weekend: { title: string, day: "sat" | "sun", time?: "HH:MM", tag?: "Date Night" | "Outdoors" | "Social" | "Chill" | "Errands" | "Family" | "Adventure" }
- add_bill: { name: string, amount: number, dueDay: number, frequency: "monthly" | "quarterly" | "yearly" }
- add_goal: { title: string, parentTitle?: string }
- add_milestone: { title: string, category: "promotion" | "achievement" | "goal" }
- add_media: { title: string, mediaType: "book" | "movie" | "tv" | "game" | "podcast", status: "want" | "in_progress" | "done" }

Rules:
- Output raw JSON only. No markdown fences, no prose.
- Give every action a unique id ("a1", "a2", ...).
- Every action must have a concise "description" field (imperative phrasing, e.g. "Add 'milk' to groceries", "Plan chicken stir-fry for Wednesday dinner", "Schedule dentist appointment on Tuesday").
- Split multi-item statements into separate actions ("milk and eggs" → two add_grocery actions).
- Distinguish groceries (food/consumables) from shopping (clothes, household goods, non-grocery).
- For tasks, default list to "Personal"; use "Shared" for anything involving the household/partner; use "Home" for chores/errands tied to the house.
- For groceries, infer the category from the item name.
- Interpret relative dates/days ("this Friday", "next week", "tomorrow") as the correct weekday token. If a specific date is mentioned, include it as dueDate.
- If a statement doesn't map cleanly to any action type, skip it — don't invent actions. Better to return fewer than to guess wrong.
- If the input is empty or nothing actionable is found, return { "summary": "Nothing actionable found.", "actions": [] }.`,
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: `Claude API error: ${err}` })
    }

    const data = await response.json()
    let content = data.content?.[0]?.text || '{}'

    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return res.status(500).json({ error: 'Could not parse model response', raw: content })
        }
      } else {
        return res.status(500).json({ error: 'Model returned no JSON', raw: content })
      }
    }

    if (!parsed || !Array.isArray(parsed.actions)) {
      return res.status(500).json({ error: 'Malformed response shape', raw: parsed })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
