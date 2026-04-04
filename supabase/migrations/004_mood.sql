create table mood_logs (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  mood text not null,
  created_at timestamptz not null default now()
);

create index idx_mood_logs_profile on mood_logs(profile_id);
create index idx_mood_logs_household on mood_logs(household_id);

alter table mood_logs enable row level security;

create policy "View own and household moods"
  on mood_logs for select using (
    profile_id = auth.uid() or
    (household_id is not null and exists (
      select 1 from household_members where household_id = mood_logs.household_id and profile_id = auth.uid()
    ))
  );

create policy "Insert own mood"
  on mood_logs for insert with check (profile_id = auth.uid());
