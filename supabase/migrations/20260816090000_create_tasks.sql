-- Migration: create the tasks table.
--
-- Migrations are code. They live in git, they get reviewed in a pull request,
-- and they are applied to production by the CD pipeline — never by a human
-- clicking around in the Supabase dashboard. That is how you keep the schema
-- in production identical to the schema in the repository.

create type task_status as enum ('todo', 'doing', 'done');

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null check (char_length(trim(title)) between 1 and 120),
  description  text,
  status       task_status not null default 'todo',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.tasks is 'Tasks managed by the TaskFlow demo app.';

-- Index the column we sort by, so `order by created_at desc` stays fast.
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);
create index if not exists tasks_status_idx on public.tasks (status);

-- Row Level Security is ON by default in Supabase and should stay on.
-- With RLS enabled and no policy, nobody can read or write anything.
alter table public.tasks enable row level security;

-- Demo policy: the anon key may read and write tasks.
-- In a real product you would scope this to `auth.uid()` instead.
create policy "anon can read tasks"
  on public.tasks for select
  to anon, authenticated
  using (true);

create policy "anon can insert tasks"
  on public.tasks for insert
  to anon, authenticated
  with check (true);

create policy "anon can update tasks"
  on public.tasks for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "anon can delete tasks"
  on public.tasks for delete
  to anon, authenticated
  using (true);
