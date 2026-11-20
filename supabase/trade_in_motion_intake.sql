-- Visa Master / CRM Águila - recepción controlada de formularios Trade in Motion
-- No expone respuestas al navegador ni a los usuarios del portal empresarial.
-- Se activa solamente mediante una ruta de servidor autenticada con firma HMAC.
create table if not exists public.vm_form_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  organization_id uuid not null references public.organizations(id),
  company_id uuid not null references public.companies(id),
  client_id uuid references public.clients(id),
  process_id uuid references public.processes(id),
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text not null,
  answers jsonb not null,
  email_verified_at timestamptz not null,
  status text not null default 'Recibido'
    check (status in ('Procesando', 'Recibido', 'En revisión')),
  received_at timestamptz not null default now(),
  constraint vm_form_submissions_answers_object check (jsonb_typeof(answers) = 'object')
);

create index if not exists vm_form_submissions_company_received_idx
  on public.vm_form_submissions(company_id, received_at desc);
create index if not exists vm_form_submissions_process_idx
  on public.vm_form_submissions(process_id);

alter table public.vm_form_submissions enable row level security;
revoke all on public.vm_form_submissions from PUBLIC, anon, authenticated;
grant select, insert, update on public.vm_form_submissions to service_role;
comment on table public.vm_form_submissions is
  'Respuestas privadas del cuestionario; accesibles exclusivamente desde el servidor CRM autorizado.';

create or replace function public.create_vm_trade_in_motion_case(
  p_submission_id uuid,
  p_answers jsonb,
  p_verified_email text,
  p_verified_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_org uuid;
  v_company uuid;
  v_flow uuid;
  v_intake uuid;
  v_client uuid;
  v_process uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_birth date;
  v_reused boolean := false;
begin
  if p_submission_id is null or p_answers is null or
     coalesce(pg_catalog.jsonb_typeof(p_answers), '') <> 'object' then
    raise exception 'Solicitud inválida' using errcode = '22023';
  end if;

  if pg_catalog.octet_length(p_answers::text) > 131072 then
    raise exception 'Formulario demasiado extenso' using errcode = '22023';
  end if;

  v_name := pg_catalog.btrim(coalesce(p_answers->>'full_name', ''));
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_answers->>'email', '')));
  v_phone := pg_catalog.regexp_replace(coalesce(p_answers->>'phone', ''), '[^0-9]', '', 'g');
  if pg_catalog.length(v_name) < 3 or pg_catalog.length(v_name) > 180
     or pg_catalog.length(v_email) > 250
     or v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'
     or v_phone !~ '^[0-9]{10,15}$' then
    raise exception 'Nombre, correo o teléfono inválidos' using errcode = '22023';
  end if;

  -- Una firma del servidor de origen NO sustituye la verificación de correo.
  -- El sistema que genera la firma debe verificar previamente al solicitante.
  if p_verified_at is null or
     p_verified_at < now() - interval '24 hours' or
     p_verified_at > now() + interval '5 minutes' or
     pg_catalog.lower(pg_catalog.btrim(coalesce(p_verified_email, ''))) <> v_email then
    raise exception 'Correo no verificado' using errcode = '28000';
  end if;

  v_birth := nullif(pg_catalog.btrim(coalesce(p_answers->>'birth_date', '')), '')::date;

  select o.id into v_org
  from public.organizations o
  where o.name = 'Visa Master' limit 1;

  select c.id into v_company
  from public.companies c
  where c.slug = 'trade-in-motion' and c.is_active = true limit 1;

  select f.id into v_flow
  from public.service_flows f
  where f.service_name = 'Visa TN'
    and f.is_active = true
    and (f.organization_id = v_org or f.organization_id is null)
  order by f.organization_id nulls last limit 1;

  if v_org is null or v_company is null or v_flow is null then
    raise exception 'Configuración CRM incompleta para Trade in Motion';
  end if;

  -- Serializa simultáneos del mismo candidato para evitar duplicación por reintentos.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_org::text || ':' || pg_catalog.lower(v_name) || ':' || v_phone, 0)
  );

  insert into public.vm_form_submissions (
    submission_id, organization_id, company_id,
    applicant_name, applicant_email, applicant_phone,
    answers, email_verified_at, status
  )
  values (
    p_submission_id, v_org, v_company,
    v_name, v_email, v_phone,
    p_answers, p_verified_at, 'Procesando'
  )
  on conflict (submission_id) do nothing
  returning id into v_intake;

  if v_intake is null then
    select s.client_id, s.process_id into v_client, v_process
    from public.vm_form_submissions s
    where s.submission_id = p_submission_id
      and s.company_id = v_company;
    if v_process is null then
      raise exception 'Folio ocupado por otra solicitud';
    end if;
    return pg_catalog.jsonb_build_object(
      'processId', v_process, 'clientId', v_client,
      'duplicate', true, 'reusedProcess', true
    );
  end if;

  select c.id into v_client
  from public.clients c
  where c.organization_id = v_org
    and c.phone = v_phone
    and pg_catalog.lower(pg_catalog.btrim(c.full_name)) = pg_catalog.lower(v_name)
    and (v_birth is null or c.birth_date is null or c.birth_date = v_birth)
  order by c.created_at asc
  limit 1;

  if v_client is null then
    insert into public.clients (
      organization_id, full_name, birth_date, phone, whatsapp,
      email, city, state, country, origin, notes
    ) values (
      v_org, v_name, v_birth, v_phone, v_phone,
      v_email, nullif(p_answers->>'home_city', ''),
      nullif(p_answers->>'home_state', ''),
      coalesce(nullif(p_answers->>'home_country', ''), 'México'),
      'Trade in Motion · formulario',
      'Datos recibidos por formulario, pendientes de revisión'
    ) returning id into v_client;
  end if;

  -- Nunca se mezclan dos trámites TN activos del mismo candidato y empresa.
  select p.id into v_process
  from public.processes p
  inner join public.process_company_links l on l.process_id = p.id
  where p.client_id = v_client
    and p.organization_id = v_org
    and p.service_name = 'Visa TN'
    and p.status in ('Activo', 'En espera')
    and l.company_id = v_company
  order by p.created_at desc limit 1;

  if v_process is null then
    insert into public.processes (
      organization_id, client_id, service_flow_id, service_name,
      status, priority, current_stage, contact_phone,
      notes, public_status, public_status_label,
      public_note, public_next_step, portal_visibility,
      portal_published_at, portal_last_updated_at
    ) values (
      v_org, v_client, v_flow, 'Visa TN',
      'Activo', 'Media', 'Formulario recibido', v_phone,
      'Recepción automática Trade in Motion. Revisar información y documentación.',
      'formulario_recibido', 'Formulario recibido · Pendiente de revisión',
      'Visa Master revisará la información proporcionada.',
      'Revisión del expediente por Visa Master',
      true, now(), now()
    ) returning id into v_process;
  else
    v_reused := true;
  end if;

  insert into public.process_company_links (
    process_id, company_id, visible_in_portal
  ) values (v_process, v_company, true)
  on conflict (process_id, company_id)
  do update set visible_in_portal = true;

  update public.vm_form_submissions
  set client_id = v_client, process_id = v_process, status = 'Recibido'
  where id = v_intake;

  return pg_catalog.jsonb_build_object(
    'processId', v_process, 'clientId', v_client,
    'duplicate', false, 'reusedProcess', v_reused
  );
end
$function$;

revoke all on function public.create_vm_trade_in_motion_case(uuid, jsonb, text, timestamptz)
  from PUBLIC, anon, authenticated;
grant execute on function public.create_vm_trade_in_motion_case(uuid, jsonb, text, timestamptz)
  to service_role;