-- Hussaini Project Hub — Supabase schema
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.

-- ───────────────────────── Tables ─────────────────────────

create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null default '',
  status     text not null default 'lead',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  description text not null default '',
  status      text not null default 'lead',
  tags        text not null default '',
  start_date    date,
  delivery_date date,

  quoted_amount    double precision not null default 0,
  final_amount     double precision not null default 0,
  amount_collected double precision not null default 0,
  payment_status   text not null default 'unpaid',

  account_used       text not null default '',
  repo_url           text not null default '',
  hosting            text not null default '',
  architecture_notes text not null default '',
  backend_notes      text not null default '',

  maintenance_status    text not null default 'none',
  maintenance_amount    double precision not null default 0,
  maintenance_cycle     text not null default 'monthly',
  maintenance_next_due  date,
  maintenance_coverage  text not null default '',

  last_touched timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists projects_client_id_idx on public.projects(client_id);

create table if not exists public.credentials (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  key_name        text not null,
  encrypted_value text not null,   -- encrypted by the app (AES-256-GCM, MASTER_KEY) before it reaches Supabase
  created_at      timestamptz not null default now()
);
create index if not exists credentials_project_id_idx on public.credentials(project_id);

create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  original_name text not null,
  storage_path  text not null,     -- path inside the "project-files" storage bucket
  size          bigint not null default 0,
  mime_type     text,
  uploaded_at   timestamptz not null default now()
);
create index if not exists files_project_id_idx on public.files(project_id);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  amount       double precision not null default 0,
  category     text not null default 'general',
  expense_date date not null default current_date,
  created_at   timestamptz not null default now()
);

create table if not exists public.settings (
  key   text primary key,
  value text not null
);

-- ───────────────────── Row Level Security ─────────────────────
-- Only a signed-in user can read or write anything. Anonymous visitors get nothing.
-- (Also turn OFF "Allow new users to sign up" in Authentication settings, so you stay the only user.)

alter table public.clients     enable row level security;
alter table public.projects    enable row level security;
alter table public.credentials enable row level security;
alter table public.accounts    enable row level security;
alter table public.files       enable row level security;
alter table public.expenses    enable row level security;
alter table public.settings    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clients','projects','credentials','accounts','files','expenses','settings']
  loop
    execute format('drop policy if exists "signed in users only" on public.%I', t);
    execute format(
      'create policy "signed in users only" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ───────────────────────── File storage ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)   -- private, 50 MB per file
on conflict (id) do nothing;

drop policy if exists "signed in users manage project files" on storage.objects;
create policy "signed in users manage project files"
  on storage.objects for all to authenticated
  using (bucket_id = 'project-files')
  with check (bucket_id = 'project-files');
