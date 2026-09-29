-- VISA MASTER - PORTAL EMPRESARIAL V3

alter table public.processes
  add column if not exists portal_group_label text,
  add column if not exists portal_applicant_count integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'processes_portal_applicant_count_check'
  ) then
    alter table public.processes
      add constraint processes_portal_applicant_count_check
      check (portal_applicant_count is null or portal_applicant_count >= 1);
  end if;
end $$;

create or replace view public.corporate_portal_processes
with (security_invoker = true)
as
select
  co.id as company_id,
  co.name as company_name,
  co.legal_name as company_legal_name,
  co.slug as company_slug,
  p.id as process_id,
  p.client_id,
  cl.full_name as client_name,
  p.service_name,
  p.public_status,
  p.public_status_label,
  p.public_note,
  p.public_next_step,
  p.requires_client_action,
  p.client_action_note,
  p.cas_appointment_at,
  p.consulate_appointment_at,
  p.result_status,
  p.portal_last_updated_at,
  p.portal_published_at,
  pcl.external_reference,
  coalesce(
    p.portal_group_label,
    case
      when coalesce(p.portal_applicant_count, ais.member_count, 1) > 1
        then 'Grupo · ' || coalesce(p.portal_applicant_count, ais.member_count, 1)::text || ' solicitantes'
      else 'Trámite individual'
    end
  ) as group_label,
  coalesce(p.portal_applicant_count, ais.member_count, 1) as applicant_count,
  ais.target_type as ais_target_type,
  ais.display_name as ais_reference_name,
  ais.current_cas_location as cas_location,
  ais.current_consulate as consulate_location,
  ais.synced_at as ais_synced_at,
  coalesce(p.portal_last_updated_at, ais.synced_at, p.updated_at) as last_visible_update_at
from public.process_company_links pcl
join public.companies co on co.id = pcl.company_id
join public.processes p on p.id = pcl.process_id
join public.clients cl on cl.id = p.client_id
left join lateral (
  select
    t.target_type,
    t.display_name,
    t.member_count,
    t.current_cas_location,
    t.current_consulate,
    t.synced_at
  from public.vm_appointment_clients mac
  join public.vm_ais_account_targets t on t.client_id = mac.id
  where mac.crm_process_id = p.id
  order by t.synced_at desc nulls last, t.id desc
  limit 1
) ais on true
where
  pcl.visible_in_portal = true
  and p.portal_visibility = true
  and co.is_active = true;

update public.processes
set
  portal_applicant_count = 4,
  portal_group_label = 'Grupo familiar · 4 solicitantes',
  portal_last_updated_at = now()
where id = '09a5c29a-566c-4c76-b684-5f3af5a5091b';

select
  client_name,
  service_name,
  group_label,
  applicant_count,
  cas_location,
  cas_appointment_at,
  consulate_location,
  consulate_appointment_at,
  last_visible_update_at
from public.corporate_portal_processes
order by client_name;
