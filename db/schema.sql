create table if not exists users (
  id text primary key,
  username text not null unique,
  email text unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  user_agent text,
  ip_address text
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists dream_records (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  emotion text not null,
  dream_text text not null,
  reality_trigger text,
  excerpt text not null,
  dream_summary text,
  keywords jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  mood text,
  coordinate_x numeric not null default 50,
  coordinate_y numeric not null default 50,
  interpretation_json jsonb,
  imagery_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists dream_records_user_created_idx on dream_records(user_id, created_at desc);

create table if not exists dream_cards (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  dream_record_id text references dream_records(id) on delete set null,
  title text not null,
  short_reading text not null,
  east_tip text,
  west_tip text,
  color_theme text,
  symbol_emoji text,
  image_url text,
  image_prompt text,
  emotion text,
  dream_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists dream_cards_user_created_idx on dream_cards(user_id, created_at desc);

create table if not exists dream_weekly_reports (
  user_id text not null references users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  analysis_json jsonb,
  dream_count integer not null default 0,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists dream_weekly_reports_user_generated_idx
  on dream_weekly_reports(user_id, generated_at desc);
