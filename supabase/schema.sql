-- TripSync schema. Paste into Supabase → SQL editor → Run.
-- All access goes through the Next.js server using the service-role key,
-- so RLS is enabled with NO public policies (anon key can read/write nothing).

create extension if not exists "pgcrypto";

create table if not exists trips (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  date_start        date not null,
  date_end          date not null,
  min_days          int  not null check (min_days >= 1),
  max_days          int  not null check (max_days >= min_days),
  participants      text[] not null,
  deadline          timestamptz,
  admin_key         text not null check (char_length(admin_key) >= 24),
  status            text not null default 'draft'
                    check (status in ('draft', 'collecting', 'generated', 'decided')),
  decided_option_id text,
  created_at        timestamptz not null default now(),
  check (date_end >= date_start)
);

create table if not exists responses (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references trips(id) on delete cascade,
  participant_name  text not null,
  home_city         text not null,
  budget_min        int  not null check (budget_min >= 0),
  budget_max        int  not null check (budget_max >= budget_min),
  available_dates   date[] not null default '{}',
  dest_types        text[] not null default '{}',   -- ordered: [#1, #2, #3]
  dealbreakers      text[] not null default '{}',
  dealbreaker_other text,
  note              text,
  edit_token_hash   text,            -- sha256 of the private token held by the answering browser
  updated_at        timestamptz not null default now(),
  unique (trip_id, participant_name)
);

create table if not exists results (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips(id) on delete cascade,
  constraints           jsonb not null,
  options               jsonb not null,
  recommended_option_id text,
  recommendation_reason text,
  model                 text,
  created_at            timestamptz not null default now()
);
create index if not exists results_trip_latest on results (trip_id, created_at desc);

create table if not exists votes (
  trip_id          uuid not null references trips(id) on delete cascade,
  participant_name text not null,
  option_id        text not null,
  updated_at       timestamptz not null default now(),
  unique (trip_id, participant_name)
);

alter table trips     enable row level security;
alter table responses enable row level security;
alter table results   enable row level security;
alter table votes     enable row level security;
-- Intentionally no policies: only the service role (server) can access these tables.
