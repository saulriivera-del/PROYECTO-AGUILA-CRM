-- PROYECTO ÁGUILA — FASE 5.4.5.4
-- Renovaciones: resolución 20 días después del CAS y flujo posterior.
-- Ejecutar una sola vez en Supabase > SQL Editor.

begin;

alter table public.processes
  add column if not exists renewal_resolution text,
  add column if not exists renewal_approval_at timestamptz;

-- El recordatorio fijo de 40 días desde CAS deja de usarse.
delete from public.agenda_events
where automation_key like '%:renewal-status-40'
  and status = 'Pendiente';

-- Actualiza el flujo maestro de Renovación Visa Americana.
with flows as (
  select id
  from public.service_flows
  where service_name = 'Renovación Visa Americana'
)
delete from public.service_flow_steps s
using flows
where s.service_flow_id = flows.id
  and s.step_order >= 7;

with flows as (
  select id
  from public.service_flows
  where service_name = 'Renovación Visa Americana'
)
insert into public.service_flow_steps (
  service_flow_id, step_order, step_name, is_optional, creates_client_when_completed
)
select flows.id, x.step_order, x.step_name, false, false
from flows
cross join (values
  (7, 'Verificar estatus de renovación'),
  (8, 'Esperar entrega de visa'),
  (9, 'Trámite concluido')
) as x(step_order, step_name)
on conflict (service_flow_id, step_order)
do update set step_name = excluded.step_name, is_optional = false;

-- Ajusta renovaciones existentes que todavía siguen operativas.
do $aguila$
declare
  r record;
begin
  for r in
    select id, organization_id
    from public.processes
    where service_name = 'Renovación Visa Americana'
      and status not in ('Concluido', 'Cancelado', 'Rechazada')
  loop
    delete from public.process_steps
    where process_id = r.id
      and step_order >= 7;

    insert into public.process_steps (
      organization_id, process_id, step_order, step_name, status, is_optional
    ) values
      (r.organization_id, r.id, 7, 'Verificar estatus de renovación', 'Pendiente', false),
      (r.organization_id, r.id, 8, 'Esperar entrega de visa', 'Pendiente', false),
      (r.organization_id, r.id, 9, 'Trámite concluido', 'Pendiente', false);

    update public.processes
    set current_stage = 'Verificar estatus de renovación',
        status = 'Activo',
        closed_at = null
    where id = r.id
      and exists (
        select 1 from public.process_steps ps
        where ps.process_id = r.id
          and ps.step_order = 6
          and ps.status = 'Completado'
      );
  end loop;
end
$aguila$;

commit;
