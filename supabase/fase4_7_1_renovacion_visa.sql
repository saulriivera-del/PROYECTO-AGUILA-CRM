-- PROYECTO ÁGUILA — FASE 4.7.1
-- Agrega el flujo Renovación Visa Americana.
-- Ejecutar una sola vez en Supabase > SQL Editor.

begin;

insert into public.service_flows (
  organization_id,
  service_name,
  is_system,
  is_active
)
select
  null,
  'Renovación Visa Americana',
  true,
  true
where not exists (
  select 1
  from public.service_flows
  where organization_id is null
    and service_name = 'Renovación Visa Americana'
);

with flow as (
  select id
  from public.service_flows
  where organization_id is null
    and service_name = 'Renovación Visa Americana'
  limit 1
)
insert into public.service_flow_steps (
  service_flow_id,
  step_order,
  step_name,
  is_optional,
  creates_client_when_completed
)
select flow.id, step_order, step_name, is_optional, creates_client
from flow
cross join (
  values
    (1, 'Formulario terminado', false, true),
    (2, 'Información y visa anterior revisadas', false, false),
    (3, 'DS-160 capturado', false, false),
    (4, 'Pago consular', false, false),
    (5, 'Cita o exención de entrevista confirmada', false, false),
    (6, 'Documentos enviados o entregados', false, false),
    (7, 'Resultado registrado', false, false),
    (8, 'Trámite concluido', false, false)
) as steps(step_order, step_name, is_optional, creates_client)
on conflict (service_flow_id, step_order) do nothing;

commit;
