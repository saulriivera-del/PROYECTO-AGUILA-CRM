-- Proyecto Águila 5.4.5
-- Prospectos: hora + modalidad de atención.
-- Los recibos PDF se generan bajo demanda y no requieren tablas ni Storage.

alter table if exists public.prospects
  add column if not exists next_followup_mode text;

alter table if exists public.prospect_followups
  add column if not exists followup_mode text;

comment on column public.prospects.next_followup_mode is
  'Modalidad de la próxima atención: En oficina, Llamada, WhatsApp, Videollamada u Otro.';

comment on column public.prospect_followups.followup_mode is
  'Modalidad indicada al registrar el próximo seguimiento.';
