-- Surat Home Index — initial schema.
-- Apply with the Supabase SQL editor or `supabase db push`.
-- All writes go through server routes using the service-role key. Row Level Security is enabled
-- on every table; anonymous clients can only read PUBLISHED projects and nothing else.

create table if not exists public.projects (
  id               text primary key,
  slug             text not null unique,
  name             text not null,
  developer_name   text not null,
  locality_id      text not null,
  rera_number      text,
  status           text not null check (status in ('under_construction','completed','ready_to_move','possession_available','unverified')),
  publication      text not null default 'draft' check (publication in ('draft','published','needs_review','archived')),
  data_quality     text not null check (data_quality in ('source_checked','third_party_source','has_conflicts','incomplete')),
  updated_at       timestamptz not null default now(),
  last_reviewed_at timestamptz,
  doc              jsonb not null           -- full typed Project record incl. per-field provenance, sources, media
);
create index if not exists projects_publication_idx on public.projects (publication);
create index if not exists projects_locality_idx    on public.projects (locality_id);
create index if not exists projects_rera_idx        on public.projects (rera_number);
create index if not exists projects_updated_idx     on public.projects (updated_at desc);

create table if not exists public.leads (
  id               uuid primary key,
  created_at       timestamptz not null default now(),
  project_id       text references public.projects(id) on delete set null,
  project_name     text,
  source_path      text not null,
  name             text not null,
  mobile           text not null,
  budget           text,
  visit_preference text,
  preferred_date   date,
  message          text,
  consent          boolean not null check (consent),
  idempotency_key  text not null unique,     -- prevents duplicate submissions
  status           text not null default 'new' check (status in ('new','contacted','closed','spam'))
);
create index if not exists leads_created_idx on public.leads (created_at desc);

create table if not exists public.corrections (
  id             uuid primary key,
  created_at     timestamptz not null default now(),
  project_id     text references public.projects(id) on delete set null,
  source_path    text not null,
  field          text,
  details        text not null,
  evidence_url   text,
  submitter_role text,
  contact        text,
  status         text not null default 'open' check (status in ('open','resolved','rejected'))
);

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  entity     text not null,
  entity_id  text not null,
  action     text not null,
  detail     jsonb
);

alter table public.projects    enable row level security;
alter table public.leads       enable row level security;
alter table public.corrections enable row level security;
alter table public.audit_log   enable row level security;

-- Public read of published projects only (useful if a client-side reader is added later).
drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public" on public.projects
  for select to anon, authenticated using (publication = 'published');

-- No policies on leads / corrections / audit_log: with RLS enabled, anon and authenticated
-- roles have no access at all. Only the service role (server-side) can read or write them.
