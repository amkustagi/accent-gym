-- Speak Sharp v0.02 schema. Run once in the Supabase SQL editor (or `supabase db push`).

-- Purchases: written only by the Stripe webhook (service role); users can read their own.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_lifetime')),
  status text not null default 'none',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "entitlements: read own" on public.entitlements for select using (auth.uid() = user_id);

-- Synced app state (profile, progress, history without audio).
create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "state: read own" on public.user_state for select using (auth.uid() = user_id);
create policy "state: insert own" on public.user_state for insert with check (auth.uid() = user_id);
create policy "state: update own" on public.user_state for update using (auth.uid() = user_id);

-- Every rating, thumbs, transcript fix, check-in, bug report and idea.
create table if not exists public.feedback (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  kind text not null,
  target text,
  rating int,
  tags text[] not null default '{}',
  text text,
  meta jsonb not null default '{}'
);
alter table public.feedback enable row level security;
create policy "feedback: insert own" on public.feedback for insert with check (auth.uid() = user_id);
create policy "feedback: read own" on public.feedback for select using (auth.uid() = user_id);
create index if not exists feedback_created on public.feedback (created_at desc);
create index if not exists feedback_kind on public.feedback (kind);

-- Anonymous usage counters and recent errors (only with the user's consent).
create table if not exists public.usage (
  user_id uuid primary key references auth.users on delete cascade,
  counters jsonb not null default '{}',
  errors jsonb not null default '[]',
  app_version text,
  updated_at timestamptz not null default now()
);
alter table public.usage enable row level security;
create policy "usage: read own" on public.usage for select using (auth.uid() = user_id);
create policy "usage: insert own" on public.usage for insert with check (auth.uid() = user_id);
create policy "usage: update own" on public.usage for update using (auth.uid() = user_id);

-- AI calls per user per day, to cap costs.
create table if not exists public.ai_usage (
  user_id uuid references auth.users on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

-- Every new user starts on the free plan.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Owner dashboard views (visible in the Supabase table editor, not to app users).
create or replace view public.feedback_summary as
  select date_trunc('day', created_at) as day, kind, count(*) as items, round(avg(rating)::numeric, 2) as avg_rating
  from public.feedback group by 1, 2 order by 1 desc, 2;
create or replace view public.plan_summary as
  select plan, status, count(*) as users from public.entitlements group by 1, 2;
revoke all on public.feedback_summary, public.plan_summary from anon, authenticated;
