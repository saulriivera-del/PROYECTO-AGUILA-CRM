-- PROYECTO ÁGUILA — FASE 4.8.3
-- Migración robusta sin tablas temporales ni tablas auxiliares.
-- Ejecutar TODO este archivo de una sola vez.

begin;

alter table public.processes
  add column if not exists cas_appointment_at timestamptz,
  add column if not exists consulate_appointment_at timestamptz,
  add column if not exists interview_preparation_at timestamptz,
  add column if not exists result_status text;

alter table public.agenda_events
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists process_id uuid references public.processes(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null,
  add column if not exists whatsapp_message text,
  add column if not exists automation_key text;

create unique index if not exists agenda_events_org_automation_key_uidx
  on public.agenda_events(organization_id, automation_key)
  where automation_key is not null;

insert into public.service_flows (organization_id, service_name, is_system, is_active)
values
  (null, 'Adelanto de cita', true, true),
  (null, 'Visa americana', true, true),
  (null, 'Renovación Visa Americana', true, true),
  (null, 'Pasaporte mexicano', true, true),
  (null, 'Visa TN', true, true),
  (null, 'Visa TD', true, true),
  (null, 'Visa tipo H', true, true),
  (null, 'eTA Canadá', true, true),
  (null, 'I-94', true, true),
  (null, 'Reporte de extravío', true, true)
on conflict (
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  service_name
) do update set is_active = true;

do $aguila$
declare
  v_steps jsonb := $json$[{"service_name": "Adelanto de cita", "step_order": 1, "step_name": "Cliente da accesos", "is_optional": false}, {"service_name": "Adelanto de cita", "step_order": 2, "step_name": "Visa Master lo mete al sistema de adelanto", "is_optional": false}, {"service_name": "Adelanto de cita", "step_order": 3, "step_name": "Espera de cita", "is_optional": false}, {"service_name": "Adelanto de cita", "step_order": 4, "step_name": "Cita encontrada", "is_optional": false}, {"service_name": "Adelanto de cita", "step_order": 5, "step_name": "Aprobada o rechazada", "is_optional": false}, {"service_name": "Visa americana", "step_order": 1, "step_name": "Formulario terminado", "is_optional": false}, {"service_name": "Visa americana", "step_order": 2, "step_name": "Información revisada", "is_optional": false}, {"service_name": "Visa americana", "step_order": 3, "step_name": "DS-160 capturado", "is_optional": false}, {"service_name": "Visa americana", "step_order": 4, "step_name": "Cuenta creada", "is_optional": false}, {"service_name": "Visa americana", "step_order": 5, "step_name": "Pago consular", "is_optional": false}, {"service_name": "Visa americana", "step_order": 6, "step_name": "Proceso de adelanto de cita", "is_optional": true}, {"service_name": "Visa americana", "step_order": 7, "step_name": "Cita agendada", "is_optional": false}, {"service_name": "Visa americana", "step_order": 8, "step_name": "Preparación entrevista", "is_optional": false}, {"service_name": "Visa americana", "step_order": 9, "step_name": "Aprobada o rechazada", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 1, "step_name": "Formulario terminado", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 2, "step_name": "Información revisada", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 3, "step_name": "DS-160 capturado", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 4, "step_name": "Cuenta creada", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 5, "step_name": "Pago consular", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 6, "step_name": "Cita ante el CAS creada", "is_optional": false}, {"service_name": "Renovación Visa Americana", "step_order": 7, "step_name": "Trámite concluido", "is_optional": false}, {"service_name": "Pasaporte mexicano", "step_order": 1, "step_name": "Recepción de documentación", "is_optional": false}, {"service_name": "Pasaporte mexicano", "step_order": 2, "step_name": "Programación de cita", "is_optional": false}, {"service_name": "Pasaporte mexicano", "step_order": 3, "step_name": "Seguimiento para Visa Americana o conclusión", "is_optional": true}, {"service_name": "Visa TN", "step_order": 1, "step_name": "Formulario terminado", "is_optional": false}, {"service_name": "Visa TN", "step_order": 2, "step_name": "Información revisada", "is_optional": false}, {"service_name": "Visa TN", "step_order": 3, "step_name": "DS-160 capturado", "is_optional": false}, {"service_name": "Visa TN", "step_order": 4, "step_name": "Cuenta creada", "is_optional": false}, {"service_name": "Visa TN", "step_order": 5, "step_name": "Pago consular", "is_optional": false}, {"service_name": "Visa TN", "step_order": 6, "step_name": "Proceso de adelanto de cita", "is_optional": true}, {"service_name": "Visa TN", "step_order": 7, "step_name": "Cita agendada", "is_optional": false}, {"service_name": "Visa TN", "step_order": 8, "step_name": "Preparación entrevista", "is_optional": false}, {"service_name": "Visa TN", "step_order": 9, "step_name": "Aprobada o rechazada", "is_optional": false}, {"service_name": "Visa TD", "step_order": 1, "step_name": "Formulario terminado", "is_optional": false}, {"service_name": "Visa TD", "step_order": 2, "step_name": "Información revisada", "is_optional": false}, {"service_name": "Visa TD", "step_order": 3, "step_name": "DS-160 capturado", "is_optional": false}, {"service_name": "Visa TD", "step_order": 4, "step_name": "Cuenta creada", "is_optional": false}, {"service_name": "Visa TD", "step_order": 5, "step_name": "Pago consular", "is_optional": false}, {"service_name": "Visa TD", "step_order": 6, "step_name": "Proceso de adelanto de cita", "is_optional": true}, {"service_name": "Visa TD", "step_order": 7, "step_name": "Cita agendada", "is_optional": false}, {"service_name": "Visa TD", "step_order": 8, "step_name": "Preparación entrevista", "is_optional": false}, {"service_name": "Visa TD", "step_order": 9, "step_name": "Aprobada o rechazada", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 1, "step_name": "Formulario terminado", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 2, "step_name": "Información revisada", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 3, "step_name": "DS-160 capturado", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 4, "step_name": "Cuenta creada", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 5, "step_name": "Pago consular", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 6, "step_name": "Cita ante el CAS creada", "is_optional": false}, {"service_name": "Visa tipo H", "step_order": 7, "step_name": "Trámite concluido", "is_optional": false}, {"service_name": "eTA Canadá", "step_order": 1, "step_name": "Recibir información", "is_optional": false}, {"service_name": "eTA Canadá", "step_order": 2, "step_name": "Capturar eTA", "is_optional": false}, {"service_name": "eTA Canadá", "step_order": 3, "step_name": "Pagar eTA", "is_optional": false}, {"service_name": "eTA Canadá", "step_order": 4, "step_name": "Verificar recepción de eTA", "is_optional": false}, {"service_name": "eTA Canadá", "step_order": 5, "step_name": "Trámite concluido", "is_optional": false}, {"service_name": "I-94", "step_order": 1, "step_name": "Verificar documentación", "is_optional": false}, {"service_name": "I-94", "step_order": 2, "step_name": "Capturar documentación", "is_optional": false}, {"service_name": "I-94", "step_order": 3, "step_name": "Hacer el pago", "is_optional": false}, {"service_name": "I-94", "step_order": 4, "step_name": "Enviar documentación", "is_optional": false}, {"service_name": "I-94", "step_order": 5, "step_name": "Trámite concluido", "is_optional": false}, {"service_name": "Reporte de extravío", "step_order": 1, "step_name": "Recibir información", "is_optional": false}, {"service_name": "Reporte de extravío", "step_order": 2, "step_name": "Capturar información", "is_optional": false}, {"service_name": "Reporte de extravío", "step_order": 3, "step_name": "Enviar formulario y reenviarlo al cliente", "is_optional": false}, {"service_name": "Reporte de extravío", "step_order": 4, "step_name": "Trámite concluido", "is_optional": false}]$json$::jsonb;
  v_service record;
  v_process record;
  v_completed_count integer;
  v_flow_id uuid;
begin
  -- Actualiza las plantillas de cada servicio.
  for v_service in
    select distinct x.service_name
    from jsonb_to_recordset(v_steps) as x(
      service_name text,
      step_order integer,
      step_name text,
      is_optional boolean
    )
  loop
    select id
      into v_flow_id
    from public.service_flows
    where organization_id is null
      and service_name = v_service.service_name
    limit 1;

    if v_flow_id is null then
      raise exception 'No se encontró el flujo: %', v_service.service_name;
    end if;

    delete from public.service_flow_steps
    where service_flow_id = v_flow_id;

    insert into public.service_flow_steps (
      service_flow_id,
      step_order,
      step_name,
      is_optional,
      creates_client_when_completed
    )
    select
      v_flow_id,
      x.step_order,
      x.step_name,
      x.is_optional,
      false
    from jsonb_to_recordset(v_steps) as x(
      service_name text,
      step_order integer,
      step_name text,
      is_optional boolean
    )
    where x.service_name = v_service.service_name
    order by x.step_order;
  end loop;

  -- Sincroniza trámites existentes conservando cuántas etapas estaban completas.
  for v_process in
    select p.id, p.organization_id, p.service_name
    from public.processes p
    where p.service_name in (
      select distinct x.service_name
      from jsonb_to_recordset(v_steps) as x(
        service_name text,
        step_order integer,
        step_name text,
        is_optional boolean
      )
    )
  loop
    select count(*) filter (where ps.status = 'Completado')::integer
      into v_completed_count
    from public.process_steps ps
    where ps.process_id = v_process.id;

    delete from public.process_steps
    where process_id = v_process.id;

    insert into public.process_steps (
      organization_id,
      process_id,
      step_order,
      step_name,
      status,
      is_optional,
      completed_at
    )
    select
      v_process.organization_id,
      v_process.id,
      x.step_order,
      x.step_name,
      case
        when x.step_order <= coalesce(v_completed_count, 0)
          then 'Completado'
        else 'Pendiente'
      end,
      x.is_optional,
      case
        when x.step_order <= coalesce(v_completed_count, 0)
          then now()
        else null
      end
    from jsonb_to_recordset(v_steps) as x(
      service_name text,
      step_order integer,
      step_name text,
      is_optional boolean
    )
    where x.service_name = v_process.service_name
    order by x.step_order;

    update public.processes
    set current_stage = coalesce((
      select ps.step_name
      from public.process_steps ps
      where ps.process_id = v_process.id
        and ps.status <> 'Completado'
      order by ps.step_order
      limit 1
    ), 'Concluido')
    where id = v_process.id;
  end loop;
end
$aguila$;

commit;
