-- ============================================================
-- Migration 002: Add Career + Weekend tables (idempotent)
-- ============================================================

-- Type (skip if exists)
do $$ begin
  create type milestone_category as enum ('promotion', 'achievement', 'goal');
exception when duplicate_object then null;
end $$;

-- Career table
create table if not exists career_milestones (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  category    milestone_category not null default 'achievement',
  date        date not null default current_date,
  description text,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_career_milestones_profile on career_milestones(profile_id);

-- Weekend table
create table if not exists weekend_activities (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  week_key     date not null,
  title        text not null,
  day          text not null check (day in ('sat', 'sun')),
  time         text,
  location     text,
  who          text not null default 'both' check (who in ('both', 'solo')),
  tag          text,
  notes        text,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_weekend_activities_profile   on weekend_activities(profile_id);
create index if not exists idx_weekend_activities_household on weekend_activities(household_id);
create index if not exists idx_weekend_activities_week      on weekend_activities(week_key);

-- RLS
alter table career_milestones  enable row level security;
alter table weekend_activities enable row level security;

-- Policies (drop first to avoid duplicates)
drop policy if exists "Own career milestones" on career_milestones;
drop policy if exists "Insert own career milestones" on career_milestones;
drop policy if exists "Update own career milestones" on career_milestones;
drop policy if exists "Delete own career milestones" on career_milestones;

create policy "Own career milestones"
  on career_milestones for select using (profile_id = auth.uid());
create policy "Insert own career milestones"
  on career_milestones for insert with check (profile_id = auth.uid());
create policy "Update own career milestones"
  on career_milestones for update using (profile_id = auth.uid());
create policy "Delete own career milestones"
  on career_milestones for delete using (profile_id = auth.uid());

drop policy if exists "View weekend activities" on weekend_activities;
drop policy if exists "Insert weekend activities" on weekend_activities;
drop policy if exists "Update weekend activities" on weekend_activities;
drop policy if exists "Delete own weekend activities" on weekend_activities;

create policy "View weekend activities"
  on weekend_activities for select using (_own_or_household(household_id, profile_id));
create policy "Insert weekend activities"
  on weekend_activities for insert with check (profile_id = auth.uid());
create policy "Update weekend activities"
  on weekend_activities for update using (_own_or_household(household_id, profile_id));
create policy "Delete own weekend activities"
  on weekend_activities for delete using (profile_id = auth.uid());
