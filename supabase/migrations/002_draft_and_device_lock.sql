-- TripSync update 2: draft trips + one-person-per-device answers.
-- Paste into Supabase → SQL editor → Run. Safe to run more than once.

-- Trips start as a private draft until the coordinator creates the share link.
alter table trips drop constraint if exists trips_status_check;
alter table trips add constraint trips_status_check
  check (status in ('draft', 'collecting', 'generated', 'decided'));
alter table trips alter column status set default 'draft';

-- Each answer is tied to the browser that submitted it (a hashed private token),
-- so nobody can fill in or overwrite someone else's answers.
alter table responses add column if not exists edit_token_hash text;
