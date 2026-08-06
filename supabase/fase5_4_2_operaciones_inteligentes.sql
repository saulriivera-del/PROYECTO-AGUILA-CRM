-- PROYECTO ÁGUILA 5.4.2
-- Índices para filtros y supervisión. Las fechas se muestran en America/Hermosillo desde la aplicación.
begin;
create index if not exists processes_org_status_idx on public.processes(organization_id, status);
create index if not exists processes_org_last_movement_idx on public.processes(organization_id, last_movement_at);
create index if not exists processes_org_assigned_idx on public.processes(organization_id, assigned_to);
create index if not exists processes_org_consulate_date_idx on public.processes(organization_id, consulate_appointment_at);
create index if not exists agenda_events_org_starts_idx on public.agenda_events(organization_id, starts_at);
create index if not exists payments_org_date_idx on public.payments(organization_id, payment_date);
commit;
