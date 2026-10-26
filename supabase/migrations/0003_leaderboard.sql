-- Speakco v0.10: opt-in weekly leaderboard. Each user writes only their own row; everyone signed in can read it.
create table if not exists public.leaderboard (
  user_id uuid references auth.users on delete cascade,
  week date not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  xp int not null default 0 check (xp >= 0 and xp < 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.leaderboard enable row level security;
create policy "leaderboard readable by signed-in users" on public.leaderboard for select to authenticated using (true);
create policy "write own leaderboard row" on public.leaderboard for insert to authenticated with check (auth.uid() = user_id);
create policy "update own leaderboard row" on public.leaderboard for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own leaderboard row" on public.leaderboard for delete to authenticated using (auth.uid() = user_id);
create index if not exists leaderboard_week_xp on public.leaderboard (week, xp desc);
