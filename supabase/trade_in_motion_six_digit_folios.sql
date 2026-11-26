-- Expand the accepted format before deploying the new generator.
alter table public.vm_trade_in_motion_access
  drop constraint vm_trade_in_motion_access_folio_check,
  add constraint vm_trade_in_motion_access_folio_check
    check (folio ~ '^([0-9]{6}|VM-[A-F0-9]{12})$');
