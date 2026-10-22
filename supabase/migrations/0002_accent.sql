-- Speak Sharp v0.03: per-user daily counter for precise accent scoring (written by the server only).
create table if not exists public.pron_usage (
  user_id uuid references auth.users on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.pron_usage enable row level security;
