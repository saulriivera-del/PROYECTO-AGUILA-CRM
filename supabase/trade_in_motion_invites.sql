-- Permite que recepción autorice candidatos antes de que el formulario público
-- genere borradores o expedientes de visa TN para Trade in Motion.
create table if not exists public.vm_trade_in_motion_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  company_id uuid not null references public.companies(id),
  applicant_email text not null check (
    applicant_email = lower(btrim(applicant_email))
    and applicant_email ~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'
  ),
  applicant_name text,
  invited_by uuid references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, applicant_email)
);
create index if not exists vm_trade_in_motion_invites_org_idx
  on public.vm_trade_in_motion_invites(organization_id, created_at desc);
alter table public.vm_trade_in_motion_invites enable row level security;
revoke all on public.vm_trade_in_motion_invites from public, anon, authenticated;
grant select, insert, update on public.vm_trade_in_motion_invites to service_role;
comment on table public.vm_trade_in_motion_invites is
'Lista privada de correos habilitados para capturar formulario TN; no visible en el portal empresarial.';
