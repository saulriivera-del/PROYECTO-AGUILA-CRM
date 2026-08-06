-- PROYECTO ÁGUILA — FASE 5.4.3
-- Prospectos 2.0: expediente, bitácora, próximos seguimientos y alertas.

begin;

alter table public.prospects
  add column if not exists last_followup_at timestamptz,
  add column if not exists followup_status text default 'Pendiente';

update public.prospects
set last_followup_at = coalesce(last_followup_at, updated_at, created_at)
where last_followup_at is null;

create table if not exists public.prospect_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  note text not null,
  outcome text,
  next_followup_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists prospect_followups_org_prospect_idx
  on public.prospect_followups(organization_id, prospect_id, created_at desc);

alter table public.prospect_followups enable row level security;

drop policy if exists "prospect_followups_select_org" on public.prospect_followups;
drop policy if exists "prospect_followups_insert_org" on public.prospect_followups;
drop policy if exists "prospect_followups_update_org" on public.prospect_followups;
drop policy if exists "prospect_followups_delete_admin" on public.prospect_followups;

create policy "prospect_followups_select_org"
on public.prospect_followups for select to authenticated
using (
  organization_id = (
    select p.organization_id from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  )
);

create policy "prospect_followups_insert_org"
on public.prospect_followups for insert to authenticated
with check (
  organization_id = (
    select p.organization_id from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  )
  and created_by = auth.uid()
);

create policy "prospect_followups_update_org"
on public.prospect_followups for update to authenticated
using (
  organization_id = (
    select p.organization_id from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  )
)
with check (
  organization_id = (
    select p.organization_id from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  )
);

create policy "prospect_followups_delete_admin"
on public.prospect_followups for delete to authenticated
using (
  organization_id = (
    select p.organization_id from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and lower(p.role) in ('admin','administrador','owner','director')
  )
);

commit;
