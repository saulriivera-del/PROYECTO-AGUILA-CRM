-- Etapa 1 DS-160: autorización explícita de datos personales por personal de Visa Master.
-- Migración opt-in; NO implica habilitar autollenado CEAC ni modificar políticas RLS.
-- Los expedientes existentes quedan sin aprobar hasta revisión manual.
alter table public.vm_trade_in_motion_drafts
  add column if not exists ds160_personal_approved_at timestamptz,
  add column if not exists ds160_personal_approved_by uuid references auth.users(id),
  add column if not exists ds160_personal_approved_digest text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vm_drafts_ds160_personal_digest_check'
      and conrelid = 'public.vm_trade_in_motion_drafts'::regclass
  ) then
    alter table public.vm_trade_in_motion_drafts
      add constraint vm_drafts_ds160_personal_digest_check
      check (ds160_personal_approved_digest is null
        or ds160_personal_approved_digest ~ '^[a-f0-9]{64}$');
  end if;
end $$;
comment on column public.vm_trade_in_motion_drafts.ds160_personal_approved_at
  is 'Aprobación MANUAL específica de datos personales para propuesta de autollenado; no significa envío a CEAC.';
comment on column public.vm_trade_in_motion_drafts.ds160_personal_approved_digest
  is 'Sello hash del subconjunto de respuestas aprobado; si difiere, rechazar transferencia.';
