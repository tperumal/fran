-- ============================================================
-- Hive: Household OS — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type household_role    as enum ('owner', 'member');
create type meal_type         as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type media_type        as enum ('book', 'movie', 'tv_show', 'video_game', 'podcast');
create type media_status      as enum ('want', 'in_progress', 'done');
create type bill_frequency    as enum ('monthly', 'quarterly', 'yearly');
create type ai_message_role   as enum ('user', 'assistant');

-- ============================================================
-- CORE
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table households (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id) on delete set null
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  role         household_role not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (household_id, profile_id)
);

create index idx_household_members_profile on household_members(profile_id);

-- ============================================================
-- FITNESS
-- ============================================================

create table workout_templates (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index idx_workout_templates_profile on workout_templates(profile_id);

create table workout_template_exercises (
  id            uuid primary key default uuid_generate_v4(),
  template_id   uuid not null references workout_templates(id) on delete cascade,
  exercise_name text not null,
  sets          int,
  reps          int,
  weight        numeric,
  order_index   int not null default 0
);

create index idx_wt_exercises_template on workout_template_exercises(template_id);

create table workout_logs (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  template_id  uuid references workout_templates(id) on delete set null,
  name         text not null,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  notes        text
);

create index idx_workout_logs_profile on workout_logs(profile_id);

create table workout_log_exercises (
  id            uuid primary key default uuid_generate_v4(),
  log_id        uuid not null references workout_logs(id) on delete cascade,
  exercise_name text not null,
  sets          jsonb not null default '[]'::jsonb, -- [{reps, weight}, ...]
  order_index   int not null default 0
);

create index idx_wl_exercises_log on workout_log_exercises(log_id);

-- ============================================================
-- MEALS
-- ============================================================

create table recipes (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid references households(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  name          text not null,
  description   text,
  ingredients   jsonb,
  instructions  text,
  prep_time_min int,
  cook_time_min int,
  servings      int,
  tags          text[],
  created_at    timestamptz not null default now()
);

create index idx_recipes_profile   on recipes(profile_id);
create index idx_recipes_household on recipes(household_id);

create table meal_plans (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  week_start   date not null,
  created_at   timestamptz not null default now()
);

create index idx_meal_plans_profile   on meal_plans(profile_id);
create index idx_meal_plans_household on meal_plans(household_id);

create table meal_plan_items (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid not null references meal_plans(id) on delete cascade,
  recipe_id   uuid references recipes(id) on delete set null,
  meal_name   text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  meal_type   meal_type not null
);

create index idx_meal_plan_items_plan on meal_plan_items(plan_id);

create table grocery_items (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  quantity     text,
  category     text,
  checked      boolean not null default false,
  meal_plan_id uuid references meal_plans(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index idx_grocery_items_profile   on grocery_items(profile_id);
create index idx_grocery_items_household on grocery_items(household_id);

-- ============================================================
-- TASKS
-- ============================================================

create table task_lists (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  is_shared    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_task_lists_profile   on task_lists(profile_id);
create index idx_task_lists_household on task_lists(household_id);

create table tasks (
  id              uuid primary key default uuid_generate_v4(),
  list_id         uuid not null references task_lists(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        timestamptz,
  is_recurring    boolean not null default false,
  recurrence_rule text,
  completed       boolean not null default false,
  completed_at    timestamptz,
  assigned_to     uuid references profiles(id) on delete set null,
  created_by      uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index idx_tasks_list       on tasks(list_id);
create index idx_tasks_assigned   on tasks(assigned_to);
create index idx_tasks_created_by on tasks(created_by);

-- ============================================================
-- HOBBIES
-- ============================================================

create table media_items (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title      text not null,
  media_type media_type not null,
  status     media_status not null default 'want',
  rating     int check (rating between 1 and 10),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_media_items_profile on media_items(profile_id);

-- ============================================================
-- MONEY
-- ============================================================

create table bills (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  amount       decimal not null,
  due_day      int not null check (due_day between 1 and 31),
  frequency    bill_frequency not null default 'monthly',
  category     text,
  is_shared    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_bills_profile   on bills(profile_id);
create index idx_bills_household on bills(household_id);

create table savings_goals (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references households(id) on delete cascade,
  profile_id     uuid not null references profiles(id) on delete cascade,
  name           text not null,
  target_amount  decimal not null,
  current_amount decimal not null default 0,
  deadline       date,
  created_at     timestamptz not null default now()
);

create index idx_savings_goals_profile   on savings_goals(profile_id);
create index idx_savings_goals_household on savings_goals(household_id);

-- ============================================================
-- CAREER
-- ============================================================

create type milestone_category as enum ('promotion', 'achievement', 'goal');

create table career_milestones (
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

create index idx_career_milestones_profile on career_milestones(profile_id);

-- ============================================================
-- WEEKEND
-- ============================================================

create table weekend_activities (
  id          uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  week_key    date not null,
  title       text not null,
  day         text not null check (day in ('sat', 'sun')),
  time        text,
  location    text,
  who         text not null default 'both' check (who in ('both', 'solo')),
  tag         text,
  notes       text,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_weekend_activities_profile   on weekend_activities(profile_id);
create index idx_weekend_activities_household on weekend_activities(household_id);
create index idx_weekend_activities_week      on weekend_activities(week_key);

-- ============================================================
-- AI
-- ============================================================

create table ai_messages (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role       ai_message_role not null,
  content    text not null,
  intent     text,
  created_at timestamptz not null default now()
);

create index idx_ai_messages_profile on ai_messages(profile_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table profiles                  enable row level security;
alter table households                enable row level security;
alter table household_members         enable row level security;
alter table workout_templates         enable row level security;
alter table workout_template_exercises enable row level security;
alter table workout_logs              enable row level security;
alter table workout_log_exercises     enable row level security;
alter table recipes                   enable row level security;
alter table meal_plans                enable row level security;
alter table meal_plan_items           enable row level security;
alter table grocery_items             enable row level security;
alter table task_lists                enable row level security;
alter table tasks                     enable row level security;
alter table media_items               enable row level security;
alter table bills                     enable row level security;
alter table savings_goals             enable row level security;
alter table career_milestones          enable row level security;
alter table weekend_activities         enable row level security;
alter table ai_messages               enable row level security;

-- ============================================================
-- HELPER: is the current user a member of a given household?
-- ============================================================

create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid
      and profile_id = auth.uid()
  );
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ---------- profiles ----------
create policy "Users can view own profile"
  on profiles for select using (id = auth.uid());
create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());
create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());

-- ---------- households ----------
create policy "Members can view their households"
  on households for select using (is_household_member(id));
create policy "Any authenticated user can create a household"
  on households for insert with check (auth.uid() = created_by);
create policy "Owners can update household"
  on households for update using (
    exists (
      select 1 from household_members
      where household_id = id
        and profile_id = auth.uid()
        and role = 'owner'
    )
  );
create policy "Owners can delete household"
  on households for delete using (
    exists (
      select 1 from household_members
      where household_id = id
        and profile_id = auth.uid()
        and role = 'owner'
    )
  );

-- ---------- household_members ----------
create policy "Members can view fellow members"
  on household_members for select using (is_household_member(household_id));
create policy "Owners can manage members"
  on household_members for insert with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.profile_id = auth.uid()
        and hm.role = 'owner'
    )
    -- or the inserter is creating their own owner row (first member)
    or (profile_id = auth.uid() and role = 'owner')
  );
create policy "Owners can remove members"
  on household_members for delete using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.profile_id = auth.uid()
        and hm.role = 'owner'
    )
    -- members can leave
    or profile_id = auth.uid()
  );

-- ============================================================
-- MACRO: personal-or-household policy for tables with
--        household_id (nullable) and profile_id columns
-- ============================================================

-- We create a reusable function for the common pattern:
--   personal rows (household_id IS NULL) visible only to owner
--   shared rows visible to all household members

create or replace function _own_or_household(
  p_household_id uuid,
  p_profile_id   uuid
)
returns boolean
language sql
security definer
stable
as $$
  select
    case
      when p_household_id is null then p_profile_id = auth.uid()
      else is_household_member(p_household_id)
    end;
$$;

-- ---------- workout_templates ----------
create policy "Own workout templates"
  on workout_templates for select using (profile_id = auth.uid());
create policy "Insert own workout templates"
  on workout_templates for insert with check (profile_id = auth.uid());
create policy "Update own workout templates"
  on workout_templates for update using (profile_id = auth.uid());
create policy "Delete own workout templates"
  on workout_templates for delete using (profile_id = auth.uid());

-- ---------- workout_template_exercises ----------
create policy "View template exercises"
  on workout_template_exercises for select using (
    exists (select 1 from workout_templates t where t.id = template_id and t.profile_id = auth.uid())
  );
create policy "Manage template exercises"
  on workout_template_exercises for insert with check (
    exists (select 1 from workout_templates t where t.id = template_id and t.profile_id = auth.uid())
  );
create policy "Update template exercises"
  on workout_template_exercises for update using (
    exists (select 1 from workout_templates t where t.id = template_id and t.profile_id = auth.uid())
  );
create policy "Delete template exercises"
  on workout_template_exercises for delete using (
    exists (select 1 from workout_templates t where t.id = template_id and t.profile_id = auth.uid())
  );

-- ---------- workout_logs ----------
create policy "Own workout logs"
  on workout_logs for select using (profile_id = auth.uid());
create policy "Insert own workout logs"
  on workout_logs for insert with check (profile_id = auth.uid());
create policy "Update own workout logs"
  on workout_logs for update using (profile_id = auth.uid());
create policy "Delete own workout logs"
  on workout_logs for delete using (profile_id = auth.uid());

-- ---------- workout_log_exercises ----------
create policy "View log exercises"
  on workout_log_exercises for select using (
    exists (select 1 from workout_logs l where l.id = log_id and l.profile_id = auth.uid())
  );
create policy "Manage log exercises"
  on workout_log_exercises for insert with check (
    exists (select 1 from workout_logs l where l.id = log_id and l.profile_id = auth.uid())
  );
create policy "Update log exercises"
  on workout_log_exercises for update using (
    exists (select 1 from workout_logs l where l.id = log_id and l.profile_id = auth.uid())
  );
create policy "Delete log exercises"
  on workout_log_exercises for delete using (
    exists (select 1 from workout_logs l where l.id = log_id and l.profile_id = auth.uid())
  );

-- ---------- recipes ----------
create policy "View recipes"
  on recipes for select using (_own_or_household(household_id, profile_id));
create policy "Insert recipes"
  on recipes for insert with check (profile_id = auth.uid());
create policy "Update own recipes"
  on recipes for update using (profile_id = auth.uid());
create policy "Delete own recipes"
  on recipes for delete using (profile_id = auth.uid());

-- ---------- meal_plans ----------
create policy "View meal plans"
  on meal_plans for select using (_own_or_household(household_id, profile_id));
create policy "Insert meal plans"
  on meal_plans for insert with check (profile_id = auth.uid());
create policy "Update own meal plans"
  on meal_plans for update using (profile_id = auth.uid());
create policy "Delete own meal plans"
  on meal_plans for delete using (profile_id = auth.uid());

-- ---------- meal_plan_items ----------
create policy "View meal plan items"
  on meal_plan_items for select using (
    exists (
      select 1 from meal_plans mp
      where mp.id = plan_id
        and _own_or_household(mp.household_id, mp.profile_id)
    )
  );
create policy "Insert meal plan items"
  on meal_plan_items for insert with check (
    exists (select 1 from meal_plans mp where mp.id = plan_id and mp.profile_id = auth.uid())
  );
create policy "Update meal plan items"
  on meal_plan_items for update using (
    exists (select 1 from meal_plans mp where mp.id = plan_id and mp.profile_id = auth.uid())
  );
create policy "Delete meal plan items"
  on meal_plan_items for delete using (
    exists (select 1 from meal_plans mp where mp.id = plan_id and mp.profile_id = auth.uid())
  );

-- ---------- grocery_items ----------
create policy "View grocery items"
  on grocery_items for select using (_own_or_household(household_id, profile_id));
create policy "Insert grocery items"
  on grocery_items for insert with check (
    profile_id = auth.uid()
    and (household_id is null or is_household_member(household_id))
  );
create policy "Update grocery items"
  on grocery_items for update using (_own_or_household(household_id, profile_id));
create policy "Delete grocery items"
  on grocery_items for delete using (profile_id = auth.uid());

-- ---------- task_lists ----------
create policy "View task lists"
  on task_lists for select using (_own_or_household(household_id, profile_id));
create policy "Insert task lists"
  on task_lists for insert with check (profile_id = auth.uid());
create policy "Update own task lists"
  on task_lists for update using (profile_id = auth.uid());
create policy "Delete own task lists"
  on task_lists for delete using (profile_id = auth.uid());

-- ---------- tasks ----------
create policy "View tasks"
  on tasks for select using (
    exists (
      select 1 from task_lists tl
      where tl.id = list_id
        and _own_or_household(tl.household_id, tl.profile_id)
    )
  );
create policy "Insert tasks"
  on tasks for insert with check (created_by = auth.uid());
create policy "Update tasks in accessible lists"
  on tasks for update using (
    exists (
      select 1 from task_lists tl
      where tl.id = list_id
        and _own_or_household(tl.household_id, tl.profile_id)
    )
  );
create policy "Delete own tasks"
  on tasks for delete using (created_by = auth.uid());

-- ---------- media_items ----------
create policy "Own media items"
  on media_items for select using (profile_id = auth.uid());
create policy "Insert own media items"
  on media_items for insert with check (profile_id = auth.uid());
create policy "Update own media items"
  on media_items for update using (profile_id = auth.uid());
create policy "Delete own media items"
  on media_items for delete using (profile_id = auth.uid());

-- ---------- bills ----------
create policy "View bills"
  on bills for select using (_own_or_household(household_id, profile_id));
create policy "Insert bills"
  on bills for insert with check (profile_id = auth.uid());
create policy "Update own bills"
  on bills for update using (profile_id = auth.uid());
create policy "Delete own bills"
  on bills for delete using (profile_id = auth.uid());

-- ---------- savings_goals ----------
create policy "View savings goals"
  on savings_goals for select using (_own_or_household(household_id, profile_id));
create policy "Insert savings goals"
  on savings_goals for insert with check (profile_id = auth.uid());
create policy "Update own savings goals"
  on savings_goals for update using (profile_id = auth.uid());
create policy "Delete own savings goals"
  on savings_goals for delete using (profile_id = auth.uid());

-- ---------- career_milestones ----------
create policy "Own career milestones"
  on career_milestones for select using (profile_id = auth.uid());
create policy "Insert own career milestones"
  on career_milestones for insert with check (profile_id = auth.uid());
create policy "Update own career milestones"
  on career_milestones for update using (profile_id = auth.uid());
create policy "Delete own career milestones"
  on career_milestones for delete using (profile_id = auth.uid());

-- ---------- weekend_activities ----------
create policy "View weekend activities"
  on weekend_activities for select using (_own_or_household(household_id, profile_id));
create policy "Insert weekend activities"
  on weekend_activities for insert with check (profile_id = auth.uid());
create policy "Update weekend activities"
  on weekend_activities for update using (_own_or_household(household_id, profile_id));
create policy "Delete own weekend activities"
  on weekend_activities for delete using (profile_id = auth.uid());

-- ---------- ai_messages ----------
create policy "Own AI messages"
  on ai_messages for select using (profile_id = auth.uid());
create policy "Insert own AI messages"
  on ai_messages for insert with check (profile_id = auth.uid());
