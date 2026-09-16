-- ============================================================
-- VISA MASTER / PROYECTO ÁGUILA
-- Centro de Oportunidades V3
-- Ejecutar DESPUÉS de vm_ais_verified_opportunities_migration.sql
-- ============================================================

alter table public.vm_client_appointment_matches
    add column if not exists discarded_at timestamptz null;

create index if not exists vm_matches_discarded_idx
on public.vm_client_appointment_matches(discarded_at)
where discarded_at is not null;

create or replace view public.vm_opportunity_center_app_view as
select
    v.*,
    m.discarded_at,
    case
        when m.discarded_at is not null then 'DESCARTADA'
        when m.used_at is not null then 'UTILIZADA'
        when m.notified_at is not null then 'NOTIFICADA'
        when m.reviewed_at is not null then 'EN_REVISION'
        else 'NUEVA'
    end as ui_status
from public.vm_opportunity_center_verified_view v
join public.vm_client_appointment_matches m
    on m.id = v.opportunity_id;

-- Verificación:
select
    opportunity_id,
    full_name,
    opportunity_consulate,
    opportunity_date,
    ui_status,
    ais_verified,
    consular_time,
    cas_location,
    cas_date,
    cas_gap_days
from public.vm_opportunity_center_app_view
order by ais_verified desc, opportunity_date asc
limit 50;
