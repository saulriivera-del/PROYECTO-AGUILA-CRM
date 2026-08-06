-- PROYECTO ÁGUILA — FASE 5.4.1
-- Teléfono operativo por trámite y ajustes de contacto.

begin;

alter table public.processes
  add column if not exists contact_phone text;

-- Los trámites existentes heredan el teléfono actual del cliente.
update public.processes p
set contact_phone = c.phone
from public.clients c
where p.client_id = c.id
  and (p.contact_phone is null or btrim(p.contact_phone) = '');

commit;
