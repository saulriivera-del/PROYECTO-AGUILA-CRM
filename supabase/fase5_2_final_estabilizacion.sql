-- PROYECTO ÁGUILA — FASE 5.2 FINAL
-- Estabilización: fotografía histórica de bonos y auditoría administrativa.
-- Ejecutar UNA sola vez después de fase5_2_1_aguila_insights.sql.

begin;

alter table public.bonus_history
  add column if not exists threshold_snapshot numeric(14,2),
  add column if not exists base_bonus_snapshot numeric(14,2),
  add column if not exists step_amount_snapshot numeric(14,2),
  add column if not exists step_bonus_snapshot numeric(14,2),
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.profiles(id) on delete set null,
  add column if not exists paid_by uuid references public.profiles(id) on delete set null;

create table if not exists public.insight_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists insight_audit_log_org_created_idx
  on public.insight_audit_log(organization_id, created_at desc);

commit;
