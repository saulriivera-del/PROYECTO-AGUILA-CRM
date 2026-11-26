alter table public.vm_trade_in_motion_access
  add column if not exists auth_mode text not null default 'legacy_key' check (auth_mode in ('legacy_key','surname_year'));
alter table public.vm_trade_in_motion_access
  drop constraint vm_trade_in_motion_access_folio_check,
  add constraint vm_trade_in_motion_access_folio_check check (folio ~ '^([0-9]{6}|VM-([0-9]{6}|[A-F0-9]{12}))$');
create or replace function public.vm_claim_candidate_attempt(p_folio text)
returns table(id uuid, applicant_name text, key_hash text, auth_mode text)
language sql security invoker set search_path = '' as $$
 update public.vm_trade_in_motion_access a
 set failed_attempts = case when coalesce(a.failed_attempts,0) >= 4 then 0 else coalesce(a.failed_attempts,0)+1 end,
     locked_until = case when coalesce(a.failed_attempts,0) >= 4 then now()+interval '20 minutes' else null end
 where a.folio=p_folio and a.is_active=true and (a.locked_until is null or a.locked_until <= now())
 returning a.id,a.applicant_name,a.key_hash,a.auth_mode
$$;
revoke all on function public.vm_claim_candidate_attempt(text) from public, anon, authenticated;
grant execute on function public.vm_claim_candidate_attempt(text) to service_role;
