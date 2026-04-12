-- Share Fran's existing meal plans and recipes with household
-- Run in Supabase SQL Editor

DO $$
DECLARE
  fran_id uuid;
  hh_id uuid;
BEGIN
  SELECT id INTO fran_id FROM auth.users WHERE email = 'fmach002@gmail.com';
  SELECT household_id INTO hh_id FROM household_members WHERE profile_id = fran_id LIMIT 1;

  IF hh_id IS NULL THEN
    RAISE EXCEPTION 'No household found for Fran';
  END IF;

  UPDATE meal_plans SET household_id = hh_id WHERE profile_id = fran_id AND household_id IS NULL;
  UPDATE recipes SET household_id = hh_id WHERE profile_id = fran_id AND household_id IS NULL;

  RAISE NOTICE 'Updated meal plans and recipes for household %', hh_id;
END $$;
