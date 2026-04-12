-- Goals module tables + RLS
-- Run in Supabase SQL Editor

-- Goals table
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_profile ON goals(profile_id);
CREATE INDEX idx_goals_household ON goals(household_id);

-- Goal items (sub-items within a goal)
CREATE TABLE goal_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text NOT NULL DEFAULT 'habit' CHECK (type IN ('habit', 'note')),
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_items_goal ON goal_items(goal_id);

-- Goal check-ins (daily habit tracking)
CREATE TABLE goal_check_ins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_item_id uuid NOT NULL REFERENCES goal_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  checked boolean NOT NULL DEFAULT true,
  UNIQUE (goal_item_id, profile_id, date)
);

CREATE INDEX idx_goal_check_ins_item ON goal_check_ins(goal_item_id);
CREATE INDEX idx_goal_check_ins_profile ON goal_check_ins(profile_id);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;

-- Goals RLS
CREATE POLICY "View goals" ON goals FOR SELECT
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert goals" ON goals FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update goals" ON goals FOR UPDATE
  USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete goals" ON goals FOR DELETE
  USING (profile_id = auth.uid());

-- Goal items RLS (access via parent goal)
CREATE POLICY "View goal items" ON goal_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Insert goal items" ON goal_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Update goal items" ON goal_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND _own_or_household(g.household_id, g.profile_id)
  ));
CREATE POLICY "Delete goal items" ON goal_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM goals g
    WHERE g.id = goal_items.goal_id
    AND g.profile_id = auth.uid()
  ));

-- Goal check-ins RLS (personal only)
CREATE POLICY "View own check-ins" ON goal_check_ins FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY "Insert own check-ins" ON goal_check_ins FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update own check-ins" ON goal_check_ins FOR UPDATE
  USING (profile_id = auth.uid());
CREATE POLICY "Delete own check-ins" ON goal_check_ins FOR DELETE
  USING (profile_id = auth.uid());
