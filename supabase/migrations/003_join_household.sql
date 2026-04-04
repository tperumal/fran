-- Allow any authenticated user to join a household by inserting their own membership
drop policy if exists "Owners can manage members" on household_members;

create policy "Users can join households"
  on household_members for insert with check (
    profile_id = auth.uid()
  );
