-- PROYECTO ÁGUILA — FASE 5.2.1
-- Infraestructura de Águila Insights, metas y bonos configurables.
-- Ejecutar UNA sola vez en Supabase > SQL Editor.

begin;

create table if not exists public.insight_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  metric text not null,
  period text not null default 'Mensual',
  target_value numeric(14,2) not null check (target_value > 0),
  assigned_to uuid references public.profiles(id) on delete set null,
  starts_at date not null default current_date,
  ends_at date,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bonus_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Bono semanal',
  period text not null default 'Semanal',
  revenue_source text not null default 'Dinero cobrado',
  threshold_amount numeric(14,2) not null check (threshold_amount > 0),
  base_bonus numeric(14,2) not null default 0,
  step_amount numeric(14,2) not null check (step_amount > 0),
  step_bonus numeric(14,2) not null default 0,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, period)
);

create table if not exists public.bonus_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bonus_rule_id uuid not null references public.bonus_rules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  collected_revenue numeric(14,2) not null default 0,
  calculated_bonus numeric(14,2) not null default 0,
  status text not null default 'Pendiente',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bonus_rule_id, period_start)
);

create index if not exists insight_goals_org_idx on public.insight_goals(organization_id, is_active, period);
create index if not exists bonus_rules_org_idx on public.bonus_rules(organization_id, is_active, user_id);
create index if not exists bonus_history_org_period_idx on public.bonus_history(organization_id, period_start desc);

-- Configuración inicial de Mariana. Solo se crea cuando existe un perfil activo cuyo nombre contiene Mariana.
insert into public.bonus_rules (organization_id, user_id, name, threshold_amount, base_bonus, step_amount, step_bonus)
select p.organization_id, p.id, 'Bono semanal de Mariana', 17000, 1000, 1000, 100
from public.profiles p
where p.is_active = true and lower(coalesce(p.full_name,'')) like '%mariana%'
on conflict (organization_id, user_id, period) do nothing;

commit;
