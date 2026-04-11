-- Function to look up a household by invite code (first 8 chars of UUID)
-- Runs as SECURITY DEFINER so it bypasses RLS for the lookup
create or replace function find_household_by_code(invite_code text)
returns table(id uuid, name text)
language sql
security definer
as $$
  select h.id, h.name
  from households h
  where replace(h.id::text, '-', '') ilike (invite_code || '%')
  limit 1;
$$;
