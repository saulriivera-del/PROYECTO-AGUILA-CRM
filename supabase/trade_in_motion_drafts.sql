-- Captura DS-160/TN: borradores privados, separados de los expedientes existentes.
-- El navegador nunca accede a esta tabla directamente; solo endpoints del CRM,
-- tras validar supabase.auth.getUser() y el correo confirmado.
create table if not exists public.vm_trade_in_motion_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  company_id uuid not null references public.companies(id),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  applicant_email text not null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  people jsonb not null default '{"companions":[],"relatives":[]}'::jsonb check (jsonb_typeof(people) = 'object'),
  status text not null default 'Borrador' check (status in ('Borrador','Enviado')),
  submission_id uuid not null unique default gen_random_uuid(),
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (company_id, auth_user_id)
);
create index if not exists vm_trade_in_motion_drafts_company_updated_idx
on public.vm_trade_in_motion_drafts (company_id, updated_at desc);
create index if not exists vm_trade_in_motion_drafts_org_updated_idx
on public.vm_trade_in_motion_drafts (organization_id, updated_at desc);
alter table public.vm_trade_in_motion_drafts enable row level security;
revoke all on public.vm_trade_in_motion_drafts from PUBLIC, anon, authenticated;
grant select, insert, update on public.vm_trade_in_motion_drafts to service_role;
comment on table public.vm_trade_in_motion_drafts is
'Borradores privados verificados por Supabase Auth. No exponer en portal corporativo.';
