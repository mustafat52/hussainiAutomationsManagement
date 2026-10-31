-- ADD-ON: Personal vault + Maintenance tracker
-- Run this ONCE in Supabase → SQL Editor if you have ALREADY run schema.sql.
-- (If you haven't run schema.sql yet, just run schema.sql — it already includes this.)
-- Safe to re-run.

-- Personal credentials vault (separate from the per-project credentials)
create table if not exists public.vault_entries (
  id                uuid primary key default gen_random_uuid(),
  category          text not null default 'Other',
  title             text not null,
  username          text not null default '',
  url               text not null default '',
  encrypted_password text not null default '',  -- encrypted by the app (AES-256-GCM, MASTER_KEY)
  encrypted_notes    text not null default '',  -- encrypted by the app too
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One row = "this project's maintenance for this month has been received"
create table if not exists public.maintenance_payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  month       text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),   -- e.g. '2026-11'
  amount      double precision not null default 0,                         -- what was actually received
  received_at timestamptz not null default now(),
  unique (project_id, month)
);
create index if not exists maintenance_payments_month_idx on public.maintenance_payments(month);

alter table public.vault_entries        enable row level security;
alter table public.maintenance_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['vault_entries','maintenance_payments']
  loop
    execute format('drop policy if exists "signed in users only" on public.%I', t);
    execute format(
      'create policy "signed in users only" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;