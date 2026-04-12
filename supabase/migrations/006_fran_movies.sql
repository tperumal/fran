-- Pre-fill Fran's movie watchlist
-- Run this in Supabase SQL Editor
-- First, find Fran's profile ID from her email

DO $$
DECLARE
  fran_id uuid;
BEGIN
  SELECT id INTO fran_id FROM auth.users WHERE email = 'fmach002@gmail.com';

  IF fran_id IS NULL THEN
    RAISE EXCEPTION 'User fmach002@gmail.com not found';
  END IF;

  -- Ensure profile exists
  INSERT INTO profiles (id, display_name)
  VALUES (fran_id, 'Fran')
  ON CONFLICT (id) DO NOTHING;

  -- Insert movies (status = done for watched, want for no date)
  INSERT INTO media_items (profile_id, title, media_type, status, notes, created_at) VALUES
    (fran_id, 'Roofman', 'movie', 'done', 'Watched 1/2/26', '2026-01-02'),
    (fran_id, 'After the Hunt', 'movie', 'done', 'Watched 1/3/26', '2026-01-03'),
    (fran_id, 'Marty Supreme', 'movie', 'want', NULL, now()),
    (fran_id, 'If I Had Legs I''d Kick You', 'movie', 'done', 'Watched 1/10/26', '2026-01-10'),
    (fran_id, 'La Cocina', 'movie', 'done', 'Watched 2/5/26', '2026-02-05'),
    (fran_id, 'Goat', 'movie', 'done', 'Watched 2/14/26', '2026-02-14'),
    (fran_id, 'The Housemaid', 'movie', 'done', 'Watched 2/21/26', '2026-02-21'),
    (fran_id, 'The Moment', 'movie', 'done', 'Watched 3/7/26', '2026-03-07'),
    (fran_id, 'Wuthering Heights', 'movie', 'done', 'Watched 3/8/26', '2026-03-08'),
    (fran_id, 'The Revenant', 'movie', 'done', 'Watched 3/13/26', '2026-03-13'),
    (fran_id, 'Hamnet', 'movie', 'done', 'Watched 3/14/26', '2026-03-14'),
    (fran_id, 'Hoppers', 'movie', 'done', 'Watched 3/25/26', '2026-03-25'),
    (fran_id, 'Sentimental Value', 'movie', 'done', 'Watched 3/29/26', '2026-03-29'),
    (fran_id, 'The Drama', 'movie', 'done', 'Watched 4/2/26', '2026-04-02'),
    (fran_id, 'No Other Choice', 'movie', 'done', 'Watched 4/5/26', '2026-04-05');
END $$;
