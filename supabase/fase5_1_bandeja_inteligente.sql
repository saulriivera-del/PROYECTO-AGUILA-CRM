-- PROYECTO ÁGUILA — FASE 5.1
-- Bandeja inteligente, estado operativo y control de movimiento.
-- Ejecutar UNA sola vez en Supabase > SQL Editor.

begin;

alter table public.processes
  add column if not exists operational_status text not null default 'Automático';

alter table public.processes
  add column if not exists last_movement_at timestamptz not null default now();

create index if not exists processes_operational_status_idx
  on public.processes(organization_id, operational_status, status);

create index if not exists processes_last_movement_idx
  on public.processes(organization_id, last_movement_at)
  where status not in ('Concluido', 'Cancelado');

update public.processes
set last_movement_at = coalesce(created_at, now())
where last_movement_at is null;

commit;
