# Goals Module Design

## Overview
A new FRAN module for personal and shared goals with nested sub-items. Sub-items can be daily trackable habits (checkable, reset daily) or static reference notes (mantras, reminders). Private by default, shareable via household toggle.

## Data Model

### `goals` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default uuid_generate_v4() |
| profile_id | uuid FK → profiles | NOT NULL |
| household_id | uuid FK → households | nullable — null = private |
| title | text | NOT NULL |
| description | text | nullable |
| order | int | for manual sorting, default 0 |
| created_at | timestamptz | default now() |

### `goal_items` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default uuid_generate_v4() |
| goal_id | uuid FK → goals | NOT NULL, ON DELETE CASCADE |
| text | text | NOT NULL |
| type | text | 'habit' or 'note' (check constraint) |
| order | int | for manual sorting, default 0 |
| created_at | timestamptz | default now() |

### `goal_check_ins` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default uuid_generate_v4() |
| goal_item_id | uuid FK → goal_items | NOT NULL, ON DELETE CASCADE |
| profile_id | uuid FK → profiles | NOT NULL |
| date | date | NOT NULL |
| checked | boolean | default true |
| UNIQUE | (goal_item_id, profile_id, date) | one check per person per day |

## RLS Policies

### goals
- SELECT: `_own_or_household(household_id, profile_id)`
- INSERT: `profile_id = auth.uid()`
- UPDATE: `_own_or_household(household_id, profile_id)`
- DELETE: `profile_id = auth.uid()`

### goal_items
- SELECT: via join to goals — if user can see the goal, they can see its items
- INSERT: user must own the parent goal or be in its household
- UPDATE: same as select
- DELETE: user must own the parent goal

### goal_check_ins
- SELECT: `profile_id = auth.uid()` (only see your own check-ins)
- INSERT: `profile_id = auth.uid()`
- UPDATE: `profile_id = auth.uid()`
- DELETE: `profile_id = auth.uid()`

## UI

### Goals Page (`/goals`)
- Header: "GOALS" with subtitle
- List of goal cards, each showing:
  - Goal title (bold, uppercase)
  - Optional description (muted text below)
  - Expand/collapse chevron
  - Share toggle (people icon)
  - Delete button
- Expanded goal shows sub-items:
  - **Habit items**: checkbox + text. Checkbox reflects today's check-in. Tapping toggles `goal_check_ins` for today.
  - **Note items**: bullet + text. No checkbox. Static reference.
- Add goal button at top (opens inline form: title, description)
- Add sub-item inline within each expanded goal (text input + type toggle: habit/note)
- Edit goal title/description inline

### Dashboard Card
- Card header: Target icon + "Goals"
- Shows today's habit progress: "3/5 habits today"
- Lists unchecked habits for quick access
- Tapping navigates to `/goals`

### Navigation
- Added to `ALL_NAV_ITEMS` in AppLayout.jsx with Target icon
- Pinnable to bottom nav via hamburger menu edit mode

## File Structure
- `src/pages/Goals.jsx` — main page component
- `src/pages/Goals.css` — styles
- `supabase/migrations/009_goals.sql` — schema + RLS
- Updates to: `AppLayout.jsx` (nav item), `Dashboard.jsx` (goals card)

## Patterns
- Uses `useStore` hook for goals list (same as all other modules)
- Check-ins use a separate `useStore` instance filtered by today's date
- Goal items fetched as part of the goal (or separate store with `goal_id` filter)
- Share toggle reuses `ShareToggle` component
- Follows existing brutalist card/form patterns from Tasks and Career modules
