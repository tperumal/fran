-- Add household_id to media_items and career_milestones for sharing support

-- media_items
ALTER TABLE media_items ADD COLUMN household_id uuid REFERENCES households(id) ON DELETE CASCADE;
CREATE INDEX idx_media_items_household ON media_items(household_id);

-- career_milestones
ALTER TABLE career_milestones ADD COLUMN household_id uuid REFERENCES households(id) ON DELETE CASCADE;
CREATE INDEX idx_career_milestones_household ON career_milestones(household_id);

-- Update RLS policies for media_items
DROP POLICY IF EXISTS "Own media items" ON media_items;
DROP POLICY IF EXISTS "Insert own media items" ON media_items;
DROP POLICY IF EXISTS "Update own media items" ON media_items;
DROP POLICY IF EXISTS "Delete own media items" ON media_items;

CREATE POLICY "View media items" ON media_items FOR SELECT USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert media items" ON media_items FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update media items" ON media_items FOR UPDATE USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete media items" ON media_items FOR DELETE USING (profile_id = auth.uid());

-- Update RLS policies for career_milestones
DROP POLICY IF EXISTS "Own career milestones" ON career_milestones;
DROP POLICY IF EXISTS "Insert own career milestones" ON career_milestones;
DROP POLICY IF EXISTS "Update own career milestones" ON career_milestones;
DROP POLICY IF EXISTS "Delete own career milestones" ON career_milestones;

CREATE POLICY "View career milestones" ON career_milestones FOR SELECT USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Insert career milestones" ON career_milestones FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Update career milestones" ON career_milestones FOR UPDATE USING (_own_or_household(household_id, profile_id));
CREATE POLICY "Delete career milestones" ON career_milestones FOR DELETE USING (profile_id = auth.uid());
