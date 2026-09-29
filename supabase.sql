create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit text not null default 'Unit 1', question text not null,
  options jsonb not null, answer text not null check (answer in ('A','B','C','D')),
  created_at timestamptz not null default now()
);
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null, unit text not null, score int not null, total int not null,
  percentage int not null, created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
alter table public.test_results enable row level security;
create policy "users read own questions" on public.questions for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own questions" on public.questions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users delete own questions" on public.questions for delete to authenticated using ((select auth.uid()) = user_id);
create policy "users read own results" on public.test_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own results" on public.test_results for insert to authenticated with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.questions to authenticated;
grant select, insert on public.test_results to authenticated;
