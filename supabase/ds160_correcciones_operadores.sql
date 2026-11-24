-- Correcciones de formularios DS-160 enviados. La captura original permanece inalterada.
create table if not exists public.vm_ds160_corrections (
  draft_id uuid primary key references public.vm_trade_in_motion_drafts(id) on delete restrict,
  organization_id uuid not null references public.organizations(id),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  people jsonb not null check (jsonb_typeof(people) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_by uuid not null references public.profiles(id),
  reason text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists vm_ds160_corrections_org_idx on public.vm_ds160_corrections(organization_id, updated_at desc);

create table if not exists public.vm_ds160_correction_history (
  id bigint generated always as identity primary key,
  draft_id uuid not null references public.vm_trade_in_motion_drafts(id) on delete restrict,
  organization_id uuid not null references public.organizations(id),
  editor_id uuid not null references public.profiles(id),
  version integer not null,
  before_answers jsonb not null,
  after_answers jsonb not null,
  before_people jsonb not null,
  after_people jsonb not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (draft_id, version)
);
create index if not exists vm_ds160_history_draft_idx on public.vm_ds160_correction_history(draft_id, created_at desc);
alter table public.vm_ds160_corrections enable row level security;
alter table public.vm_ds160_correction_history enable row level security;
revoke all on public.vm_ds160_corrections from public, anon, authenticated;
revoke all on public.vm_ds160_correction_history from public, anon, authenticated;
grant select, insert, update on public.vm_ds160_corrections to service_role;
grant select, insert on public.vm_ds160_correction_history to service_role;
grant usage, select on sequence public.vm_ds160_correction_history_id_seq to service_role;

-- Una sola transacción preserva la versión previa y evita sobrescribir cambios de otro operador.
create or replace function public.vm_ds160_save_correction(
  p_draft_id uuid,
  p_organization_id uuid,
  p_editor_id uuid,
  p_expected_version integer,
  p_answers jsonb,
  p_people jsonb,
  p_reason text
) returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  source_draft record;
  current_edit record;
  next_version integer;
  before_a jsonb;
  before_p jsonb;
begin
  if jsonb_typeof(p_answers) is distinct from 'object'
     or jsonb_typeof(p_people) is distinct from 'object'
     or length(btrim(coalesce(p_reason,''))) < 3
     or length(p_reason) > 500 then
    raise exception 'Datos de corrección inválidos';
  end if;
  select organization_id, status, answers, people
    into source_draft
    from public.vm_trade_in_motion_drafts
    where id = p_draft_id and organization_id = p_organization_id
    for update;
  if not found or source_draft.status <> 'Enviado' then
    raise exception 'El expediente no está disponible para corrección';
  end if;
  if not exists (
    select 1 from public.profiles where id=p_editor_id and organization_id=p_organization_id
      and is_active=true and role in ('admin','reception')
  ) then
    raise exception 'Operador sin autorización';
  end if;
  select version, answers, people into current_edit
    from public.vm_ds160_corrections where draft_id=p_draft_id and organization_id=p_organization_id for update;
  if coalesce(current_edit.version,0) <> p_expected_version then
    raise exception 'Versión desactualizada: vuelve a cargar el expediente';
  end if;
  next_version := coalesce(current_edit.version,0) + 1;
  before_a := coalesce(current_edit.answers, source_draft.answers);
  before_p := coalesce(current_edit.people, source_draft.people);
  if before_a = p_answers and before_p = p_people then
    return coalesce(current_edit.version,0);
  end if;
  insert into public.vm_ds160_correction_history
    (draft_id, organization_id, editor_id, version, before_answers, after_answers, before_people, after_people, reason)
    values (p_draft_id,p_organization_id,p_editor_id,next_version,before_a,p_answers,before_p,p_people,btrim(p_reason));
  insert into public.vm_ds160_corrections (draft_id,organization_id,answers,people,version,updated_by,reason,updated_at)
    values (p_draft_id,p_organization_id,p_answers,p_people,next_version,p_editor_id,btrim(p_reason),now())
    on conflict(draft_id) do update set
      answers=excluded.answers,people=excluded.people,version=excluded.version,
      updated_by=excluded.updated_by,reason=excluded.reason,updated_at=excluded.updated_at;
  return next_version;
end $$;
revoke all on function public.vm_ds160_save_correction(uuid,uuid,uuid,integer,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.vm_ds160_save_correction(uuid,uuid,uuid,integer,jsonb,jsonb,text) to service_role;
comment on table public.vm_ds160_corrections is 'Copia operativa corregida para revisión DS-160; nunca reemplaza las respuestas originales del cliente.';
