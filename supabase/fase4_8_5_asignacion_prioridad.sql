-- PROYECTO ÁGUILA — FASE 4.8.5
-- Asignación de trámites, prioridad operativa y ajustes de agenda.
-- Ejecutar UNA sola vez en Supabase > SQL Editor.

begin;

alter table public.processes
  add column if not exists priority_attention_at timestamptz;

alter table public.agenda_events
  add column if not exists priority text not null default 'Normal';

create index if not exists processes_org_status_assigned_idx
  on public.processes(organization_id, status, assigned_to);

create index if not exists processes_priority_attention_idx
  on public.processes(organization_id, priority_attention_at)
  where priority_attention_at is not null;

commit;
