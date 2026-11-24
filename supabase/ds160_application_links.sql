-- Registro privado del Application ID de CEAC, independiente del mapeo de páginas.
-- Una solicitud puede tener varios IDs históricos, pero un mismo ID no puede vincularse a dos expedientes.
create table if not exists public.vm_ds160_application_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  draft_id uuid not null references public.vm_trade_in_motion_drafts(id) on delete restrict,
  application_id text not null unique check (application_id ~ '^AA[A-Z0-9]{8}$'),
  status text not null default 'En elaboración' check (status in ('En elaboración','Enviada','Sustituida')),
  linked_by uuid not null references auth.users(id),
  linked_at timestamptz not null default now()
);
create index if not exists vm_ds160_app_links_draft_idx
  on public.vm_ds160_application_links (organization_id, draft_id, linked_at desc);
alter table public.vm_ds160_application_links enable row level security;
revoke all on public.vm_ds160_application_links from public, anon, authenticated;
grant select, insert, update on public.vm_ds160_application_links to service_role;
comment on table public.vm_ds160_application_links is
  'Application IDs vinculados por un operador autenticado a expedientes DS-160; no implica firma ni envio oficial de CEAC.';
