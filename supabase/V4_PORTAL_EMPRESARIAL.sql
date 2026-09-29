-- ============================================================
-- VISA MASTER - PORTAL EMPRESARIAL V4
-- Documentos públicos + control administrativo + actualizaciones manuales
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.corporate_portal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null,
  description text,
  document_type text not null default 'Documento',
  external_url text not null,
  visible_to_company boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists corporate_portal_documents_process_idx
  on public.corporate_portal_documents(process_id, created_at desc);

create table if not exists public.corporate_portal_manual_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null,
  description text not null,
  visible_to_company boolean not null default true,
  created_by uuid,
  event_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists corporate_portal_manual_updates_process_idx
  on public.corporate_portal_manual_updates(process_id, event_date desc);

alter table public.corporate_portal_documents enable row level security;
alter table public.corporate_portal_manual_updates enable row level security;

drop policy if exists corporate_portal_documents_internal_all
on public.corporate_portal_documents;

create policy corporate_portal_documents_internal_all
on public.corporate_portal_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = corporate_portal_documents.organization_id
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = corporate_portal_documents.organization_id
      and p.is_active = true
  )
);

drop policy if exists corporate_portal_manual_updates_internal_all
on public.corporate_portal_manual_updates;

create policy corporate_portal_manual_updates_internal_all
on public.corporate_portal_manual_updates
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = corporate_portal_manual_updates.organization_id
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = corporate_portal_manual_updates.organization_id
      and p.is_active = true
  )
);

create or replace function public.get_my_corporate_documents(
  target_process_id uuid default null
)
returns table (
  id uuid,
  process_id uuid,
  client_name text,
  service_name text,
  title text,
  description text,
  document_type text,
  external_url text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    d.id,
    d.process_id,
    cl.full_name as client_name,
    p.service_name,
    d.title,
    d.description,
    d.document_type,
    d.external_url,
    d.created_at
  from public.corporate_portal_documents d
  join public.processes p on p.id = d.process_id
  join public.clients cl on cl.id = p.client_id
  join public.process_company_links pcl
    on pcl.process_id = p.id
   and pcl.visible_in_portal = true
  join public.company_users cu
    on cu.company_id = pcl.company_id
   and cu.auth_user_id = auth.uid()
   and cu.is_active = true
  join public.companies co
    on co.id = cu.company_id
   and co.is_active = true
  where d.visible_to_company = true
    and p.portal_visibility = true
    and (target_process_id is null or d.process_id = target_process_id)
  order by d.created_at desc;
$$;

revoke all
on function public.get_my_corporate_documents(uuid)
from public;

grant execute
on function public.get_my_corporate_documents(uuid)
to authenticated;

create or replace function public.get_my_corporate_manual_updates(
  target_process_id uuid default null
)
returns table (
  update_id uuid,
  process_id uuid,
  client_name text,
  service_name text,
  title text,
  description text,
  event_date timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id as update_id,
    u.process_id,
    cl.full_name as client_name,
    p.service_name,
    u.title,
    u.description,
    u.event_date
  from public.corporate_portal_manual_updates u
  join public.processes p on p.id = u.process_id
  join public.clients cl on cl.id = p.client_id
  join public.process_company_links pcl
    on pcl.process_id = p.id
   and pcl.visible_in_portal = true
  join public.company_users cu
    on cu.company_id = pcl.company_id
   and cu.auth_user_id = auth.uid()
   and cu.is_active = true
  join public.companies co
    on co.id = cu.company_id
   and co.is_active = true
  where u.visible_to_company = true
    and p.portal_visibility = true
    and (target_process_id is null or u.process_id = target_process_id)
  order by u.event_date desc;
$$;

revoke all
on function public.get_my_corporate_manual_updates(uuid)
from public;

grant execute
on function public.get_my_corporate_manual_updates(uuid)
to authenticated;

select 'V4 OK' as status;
