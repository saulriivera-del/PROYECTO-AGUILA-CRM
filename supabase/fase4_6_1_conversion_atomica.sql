
-- PROYECTO ÁGUILA — FASE 4.6.1
-- Conversión atómica de prospecto a cliente.
-- Ejecutar una sola vez en Supabase > SQL Editor.

begin;

create or replace function public.convert_prospect_to_client(
  p_prospect_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_prospect public.prospects%rowtype;
  v_client_id uuid;
begin
  v_user_id := auth.uid();
  v_org_id := public.current_organization_id();

  if v_user_id is null or v_org_id is null then
    raise exception 'Sesión u organización no válida';
  end if;

  select *
  into v_prospect
  from public.prospects
  where id = p_prospect_id
    and organization_id = v_org_id
  for update;

  if not found then
    raise exception 'No se encontró el prospecto';
  end if;

  if v_prospect.converted_client_id is not null then
    return v_prospect.converted_client_id;
  end if;

  -- Reutiliza un cliente existente con el mismo teléfono.
  select id
  into v_client_id
  from public.clients
  where organization_id = v_org_id
    and phone = v_prospect.phone
  order by created_at asc
  limit 1;

  if v_client_id is null then
    insert into public.clients (
      organization_id,
      full_name,
      phone,
      whatsapp,
      email,
      city,
      state,
      country,
      origin,
      notes,
      assigned_to,
      created_by
    )
    values (
      v_org_id,
      v_prospect.full_name,
      v_prospect.phone,
      coalesce(v_prospect.whatsapp, v_prospect.phone),
      v_prospect.email,
      v_prospect.city,
      v_prospect.state,
      coalesce(v_prospect.country, 'México'),
      v_prospect.origin,
      v_prospect.notes,
      coalesce(v_prospect.assigned_to, v_user_id),
      v_user_id
    )
    returning id into v_client_id;
  end if;

  update public.prospects
  set
    status = 'Convertido',
    converted_client_id = v_client_id,
    updated_at = now()
  where id = p_prospect_id;

  insert into public.activity_log (
    organization_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  )
  values (
    v_org_id,
    v_user_id,
    'client',
    v_client_id,
    'prospect_converted',
    v_prospect.full_name || ' fue convertido en cliente',
    jsonb_build_object('prospect_id', p_prospect_id)
  );

  return v_client_id;
end;
$$;

grant execute on function public.convert_prospect_to_client(uuid) to authenticated;

commit;
