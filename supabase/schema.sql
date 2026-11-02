-- Baron Habits database schema
-- Run this file in Supabase Dashboard > SQL Editor.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Personal',
  icon text not null default '✦',
  color text not null default '#aab4bf',
  target integer not null default 1 check (target > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on),
  constraint habit_logs_habit_user_fk
    foreign key (habit_id, user_id)
    references public.habits(id, user_id)
    on delete cascade
);

create index if not exists habits_user_id_idx on public.habits(user_id);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, completed_on);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists "Users manage their own habits" on public.habits;
create policy "Users manage their own habits"
on public.habits for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own habit logs" on public.habit_logs;
create policy "Users manage their own habit logs"
on public.habit_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
