-- Week module: calendar_events table + RLS
-- Run in Supabase SQL Editor

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time text,
  recurring boolean NOT NULL DEFAULT true,
  week_key date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_profile ON calendar_events(profile_id);
CREATE INDEX idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX idx_calendar_events_week ON calendar_events(week_key);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View calendar events" ON calendar_events FOR SELECT
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert calendar events" ON calendar_events FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update calendar events" ON calendar_events FOR UPDATE
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete calendar events" ON calendar_events FOR DELETE
  USING (profile_id = auth.uid());
