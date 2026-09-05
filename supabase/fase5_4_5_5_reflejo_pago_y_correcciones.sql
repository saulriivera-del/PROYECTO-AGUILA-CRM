-- Proyecto Águila 5.4.5.5
-- Inserta "Esperando reflejo de pago" después de Pago consular en trámites de visa.
-- Conserva el estado de las etapas existentes por nombre para no perder avance.

do $aguila$
declare
  v_services text[] := array['Visa americana','Renovación Visa Americana','Visa TN','Visa TD','Visa tipo H'];
  v_flow record;
  v_process record;
begin
  -- Plantillas: desplazar etapas posteriores e insertar la nueva etapa.
  for v_flow in select sf.id, sf.service_name from public.service_flows sf where sf.service_name = any(v_services)
  loop
    if not exists (select 1 from public.service_flow_steps s where s.service_flow_id=v_flow.id and s.step_name='Esperando reflejo de pago') then
      update public.service_flow_steps set step_order=step_order+1000 where service_flow_id=v_flow.id and step_order>5;
      update public.service_flow_steps set step_order=step_order-999 where service_flow_id=v_flow.id and step_order>1005;
      insert into public.service_flow_steps(service_flow_id,step_order,step_name,is_optional,creates_client_when_completed)
      values(v_flow.id,6,'Esperando reflejo de pago',false,false);
    end if;
  end loop;

  -- Expedientes existentes: insertar sin borrar ni reconstruir etapas.
  for v_process in select p.id,p.organization_id from public.processes p where p.service_name = any(v_services)
  loop
    if not exists (select 1 from public.process_steps ps where ps.process_id=v_process.id and ps.step_name='Esperando reflejo de pago') then
      update public.process_steps set step_order=step_order+1000 where process_id=v_process.id and step_order>5;
      update public.process_steps set step_order=step_order-999 where process_id=v_process.id and step_order>1005;
      insert into public.process_steps(organization_id,process_id,step_order,step_name,status,is_optional)
      values(v_process.organization_id,v_process.id,6,'Esperando reflejo de pago',
        case when exists(select 1 from public.process_steps later where later.process_id=v_process.id and later.step_order>6 and later.status='Completado') then 'Completado' else 'Pendiente' end,false);
    end if;
    update public.processes p set current_stage=coalesce((select ps.step_name from public.process_steps ps where ps.process_id=p.id and ps.status<>'Completado' order by ps.step_order limit 1),p.current_stage) where p.id=v_process.id;
  end loop;
end $aguila$;
