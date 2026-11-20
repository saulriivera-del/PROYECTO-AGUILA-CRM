-- Acceso privado por folio y clave; no sustituye ni altera las sesiones de empleados.
create table if not exists public.vm_trade_in_motion_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  company_id uuid not null references public.companies(id),
  folio text not null unique check (folio ~ '^VM-[A-F0-9]{12}$'),
  key_hash text not null,
  applicant_name text not null check (char_length(btrim(applicant_name)) between 2 and 180),
  created_by uuid not null references auth.users(id),
  is_active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vm_tn_access_org_idx on public.vm_trade_in_motion_access(organization_id,created_at desc);
create table if not exists public.vm_trade_in_motion_sessions (
  id uuid primary key default gen_random_uuid(),
  access_id uuid not null references public.vm_trade_in_motion_access(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash)=64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vm_tn_sessions_access_idx on public.vm_trade_in_motion_sessions(access_id,expires_at desc);
alter table public.vm_trade_in_motion_drafts alter column auth_user_id drop not null;
alter table public.vm_trade_in_motion_drafts add column if not exists access_id uuid references public.vm_trade_in_motion_access(id);
create unique index if not exists vm_tn_drafts_access_idx on public.vm_trade_in_motion_drafts(access_id) where access_id is not null;
alter table public.vm_trade_in_motion_access enable row level security;
alter table public.vm_trade_in_motion_sessions enable row level security;
revoke all on public.vm_trade_in_motion_access from public, anon, authenticated;
revoke all on public.vm_trade_in_motion_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.vm_trade_in_motion_access to service_role;
grant select, insert, update, delete on public.vm_trade_in_motion_sessions to service_role;
comment on table public.vm_trade_in_motion_access is 'Folio y hash de clave para candidatos; exclusivamente servidor CRM.';
comment on table public.vm_trade_in_motion_sessions is 'Tokens de sesión con hash SHA256, nunca credenciales en claro. Exclusivamente servidor CRM.';
