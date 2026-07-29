-- PROYECTO ÁGUILA — FASE 5.3
-- Usuarios, roles y limpieza controlada para inicio del beta.
-- Ejecutar UNA sola vez en Supabase > SQL Editor.

begin;

-- Asegura el estado activo para cuentas existentes.
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Limpieza operativa restringida al administrador autenticado y a su organización.
create or replace function public.reset_demo_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_role text;
  v_counts jsonb := '{}'::jsonb;
  v_count integer;
begin
  select organization_id, lower(coalesce(role,''))
    into v_org, v_role
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_org is null or v_role not in ('administrador','admin','owner','propietario','director') then
    raise exception 'Acceso reservado para administradores';
  end if;

  delete from public.followups where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('followups', v_count);

  delete from public.agenda_events where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('agenda_events', v_count);

  delete from public.activity_log where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('activity_log', v_count);

  delete from public.bonus_history where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('bonus_history', v_count);

  delete from public.payments where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('payments', v_count);

  delete from public.process_steps where process_id in (select id from public.processes where organization_id = v_org);
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('process_steps', v_count);

  delete from public.process_charges where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('process_charges', v_count);

  delete from public.processes where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('processes', v_count);

  delete from public.prospects where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('prospects', v_count);

  delete from public.clients where organization_id = v_org;
  get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('clients', v_count);

  insert into public.insight_audit_log (organization_id, actor_id, action, entity_type, details)
  values (v_org, auth.uid(), 'beta.operational_data_reset', 'organization', v_counts);

  return v_counts;
end;
$$;

revoke all on function public.reset_demo_operational_data() from public;
grant execute on function public.reset_demo_operational_data() to authenticated;

commit;
