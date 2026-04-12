# Week Module Design

## Overview
A Mon-Sun weekly calendar view showing calendar events and tasks with due dates. Events can be recurring (every week) or one-off (specific week). Household-shared via toggle. Tasks with due dates are auto-pulled from the Tasks module.

## Data Model

### `calendar_events` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default uuid_generate_v4() |
| profile_id | uuid FK → profiles | NOT NULL |
| household_id | uuid FK → households | nullable — null = private |
| title | text | NOT NULL |
| day_of_week | int | 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun |
| time | text | nullable — e.g. "9:00 AM", free-form |
| recurring | boolean | default true — shows every week |
| week_key | date | nullable — for one-off events, yyyy-MM-dd of week start (Monday). Null if recurring |
| created_at | timestamptz | default now() |

### Event logic
- **Recurring:** `recurring = true`, `week_key = null`. Displayed every week on `day_of_week`.
- **One-off:** `recurring = false`, `week_key = '2026-04-07'`. Only displayed when viewing that specific week.
- **Tasks:** Not stored in this table. Pulled from the `tasks` table where `due_date` falls within the displayed week. Rendered with a different visual style.

## RLS Policies

- SELECT: `_own_or_household(household_id, profile_id)`
- INSERT: `profile_id = auth.uid()`
- UPDATE: `_own_or_household(household_id, profile_id)`
- DELETE: `profile_id = auth.uid()`

## UI

### Week Page (`/week`)
- **Header:** "WEEK" with week navigation — left arrow, "APR 7 - APR 13, 2026", right arrow
- **Seven day sections** (Mon-Sun), each showing:
  - Day header: "MON, APR 7"
  - Calendar events for that day, sorted by time (time-less events first)
    - Event row: title + optional time badge + share toggle + delete button
  - Tasks due that day (auto-pulled from tasks store)
    - Task row: checkbox (toggles completed) + title, styled differently (muted border or dotted)
  - Inline add: text input + optional time input + recurring checkbox + add button
- Empty days show a subtle "No events" or are just empty

### Dashboard Card
- Card header: CalendarDays icon + "Week"
- Shows today's events and tasks due today
- Tapping navigates to `/week`

### Navigation
- Added to `ALL_NAV_ITEMS` in AppLayout.jsx with CalendarDays icon
- Pinnable to bottom nav

## File Structure
- `src/pages/Week.jsx` — main page component
- `src/pages/Week.css` — styles
- `supabase/migrations/010_week.sql` — schema + RLS
- Updates to: `AppLayout.jsx` (nav item), `App.jsx` (route), `Dashboard.jsx` (week card)

## Patterns
- Uses `useStore` for calendar_events with household support
- Tasks pulled from existing tasks `useStore` instance, filtered by due date within displayed week
- Week navigation via `weekOffset` state (0 = current week, -1 = last week, +1 = next week)
- `startOfWeek` from date-fns with `weekStartsOn: 1` (Monday)
- Share toggle reuses `ShareToggle` component
- Follows existing brutalist card patterns
