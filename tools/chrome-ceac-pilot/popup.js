'use strict';
const $ = id => document.getElementById(id);
const pilot = window.VmCeacPilot;
let prepared = null;

function status(message) { $('status').textContent = message; }
function reset() {
  prepared = null; $('fill').disabled = true; $('confirm').checked = false;
  $('preview').style.display = 'none'; $('actions').replaceChildren();
  $('pending').replaceChildren();
}
function item(list, text) {
  const li = document.createElement('li'); li.textContent = text; list.appendChild(li);
}
function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function selectOption(options, action) {
  if (!options || !Array.isArray(options)) return false;
  const desired = normalize(action.value);
  return options.some(opt => {
    if (action.mode === 'selectValue') return opt.code === action.value;
    if (action.mode === 'selectMonth')
      return normalize(opt.code).slice(0, 3) === desired || normalize(opt.label).slice(0, 3) === desired;
    if (action.suffix === 'ddlDOBDay')
      return Number(opt.code) === Number(action.value) ||
        Number(opt.label) === Number(action.value);
    return normalize(opt.label) === desired;
  });
}
function compatibleAction(action, fields) {
  const found = fields.filter(f => f.id && f.id.endsWith('_' + action.suffix));
  if (found.length !== 1) return {ok:false, reason:'No se encontró un control único para ' + action.label};
  const field = found[0];
  if (action.mode === 'text' && !['input','textarea'].includes(field.tag))
    return {ok:false,reason:'Tipo inesperado en ' + action.label};
  if (action.mode !== 'text' && (field.tag !== 'select' || !selectOption(field.options,action)))
    return {ok:false,reason:'Opción exacta no encontrada en el catálogo CEAC: ' + action.label};
  return {ok:true};
}

// Función aislada ejecutada SOLO en la pestaña activa de CEAC, tras un clic.
function inspectCeac() {
  if (location.protocol !== 'https:' || location.hostname.toLowerCase() !== 'ceac.state.gov' ||
      !['/GenNIV/General/complete/complete_personal.aspx',
        '/GenNIV/General/complete/complete_personalcont.aspx'].includes(location.pathname))
    return {error:'Abre Datos personales 1 o 2 en CEAC.'};
  const fields = [...document.querySelectorAll('input,select,textarea')].filter(el => {
    const type = (el.getAttribute('type') || '').toLowerCase();
    const style = getComputedStyle(el);
    return !['hidden','password','submit','button','reset','image','file'].includes(type) &&
      !el.disabled && style.visibility !== 'hidden' && style.display !== 'none' && !!el.getClientRects().length;
  }).map(el => ({
    id:el.id || '',name:el.name || '',tag:el.tagName.toLowerCase(),
    type:(el.getAttribute('type') || '').toLowerCase(),
    options:el.tagName === 'SELECT'
      ? [...el.options].map(o => ({code:o.value,label:(o.textContent || '').trim()}))
      : undefined,
  }));
  return {schema:'vm-ceac-fields-inspection-v2',path:location.pathname,
    host:location.hostname,fields,safety:'METADATA_ONLY_NO_VALUES_NO_WRITES'};
}

// Función aislada en la página autenticada de Águila. Nunca copia cookies a la extensión.
async function readCRMApproved() {
  if (location.protocol !== 'https:' || location.hostname !== 'crm.visamaster.com.mx')
    return {error:'Solo se permite leer la sesión del CRM oficial.'};
  const match = location.pathname.match(/^\/admin\/formularios\/trade-in-motion\/([a-f0-9-]{36})\/?$/i);
  if (!match) return {error:'Abre en otra pestaña la ficha de un candidato de Águila.'};
  try {
    const response = await fetch('/api/admin/ds160/personal?draft_id=' + encodeURIComponent(match[1]), {
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},
    });
    const payload = await response.json();
    if (!response.ok) return {error:payload.error || ('El CRM rechazó la consulta (' + response.status + ').')};
    if (payload.schema !== 'vm-ds160-personal-v1' || payload.draftId !== match[1] ||
        !payload.answers || payload.scope !== 'personal')
      return {error:'Formato inesperado en respuesta del CRM.'};
    return {draftId:payload.draftId,answers:payload.answers};
  } catch { return {error:'No fue posible consultar la sesión autorizada de Águila.'}; }
}
async function currentCEAC() {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  let url;
  try { url = new URL(tab?.url || ''); } catch { throw Error('Abre una pestaña CEAC válida.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'ceac.state.gov' ||
      ![pilot.P1,pilot.P2].includes(url.pathname)) throw Error('Abre Datos personales 1 o 2 del DS-160 en CEAC.');
  return tab;
}
async function scanCEAC(tabId) {
  const r = await chrome.scripting.executeScript({target:{tabId},func:inspectCeac});
  const data = r?.[0]?.result;
  if (!data || data.error) throw Error(data?.error || 'Falló la inspección CEAC.');
  return data;
}
async function findCRMTab() {
  const tabs = await chrome.tabs.query({url:'https://crm.visamaster.com.mx/admin/formularios/trade-in-motion/*'});
  const candidates = tabs.filter(t => {
    try { return /^\/admin\/formularios\/trade-in-motion\/[a-f0-9-]{36}\/?$/i.test(new URL(t.url).pathname); }
    catch { return false; }
  });
  if (candidates.length !== 1)
    throw Error(candidates.length
      ? 'Hay varias fichas de candidatos abiertas. Deja solo una pestaña de expediente aprobado.'
      : 'No encontré una ficha de candidato abierta en crm.visamaster.com.mx.');
  return candidates[0];
}
async function approvedFrom(tabId) {
  const r = await chrome.scripting.executeScript({target:{tabId},func:readCRMApproved});
  const d = r?.[0]?.result;
  if (!d || d.error) throw Error(d?.error || 'No se pudieron recuperar respuestas aprobadas.');
  return d;
}

// Función aislada en CEAC. SOLO sufijos y tipos permitidos para estas dos pantallas.
function fillCeacPage(request) {
  const p1='/GenNIV/General/complete/complete_personal.aspx';
  const p2='/GenNIV/General/complete/complete_personalcont.aspx';
  if (location.protocol !== 'https:' || location.hostname !== 'ceac.state.gov' ||
      location.pathname !== request.path || ![p1,p2].includes(request.path))
    return {error:'La pestaña cambió; no se realizó ninguna escritura.'};
  const allowed = request.path === p1
    ? new Set(['tbxAPP_SURNAME','tbxAPP_GIVEN_NAME','ddlAPP_GENDER','ddlAPP_MARITAL_STATUS',
      'ddlDOBDay','ddlDOBMonth','tbxDOBYear','tbxAPP_POB_CITY','tbxAPP_POB_ST_PROVINCE','ddlAPP_POB_CNTRY'])
    : new Set(['ddlAPP_NATL','tbxAPP_NATIONAL_ID']);
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9]/g,'');
  const candidates = [];
  for (const action of request.actions) {
    if (!allowed.has(action.suffix) || !['text','selectValue','selectText','selectMonth'].includes(action.mode))
      return {error:'Acción no permitida: se canceló toda la operación.'};
    const found = [...document.querySelectorAll('input,select,textarea')]
      .filter(el => el.id && el.id.endsWith('_'+action.suffix) && !el.disabled && el.getClientRects().length);
    if (found.length !== 1) return {error:'Campo no encontrado o duplicado: '+action.label+'. Ningún dato aplicado.'};
    const el=found[0];
    if (action.mode === 'text') {
      if (!['INPUT','TEXTAREA'].includes(el.tagName) || el.type === 'hidden') return {error:'Tipo inesperado en '+action.label};
      candidates.push({el,action,value:action.value});
    } else {
      if (el.tagName !== 'SELECT') return {error:'Control inesperado en '+action.label};
      const option=[...el.options].find(o => {
        if(action.mode==='selectValue') return o.value===action.value;
        if(action.mode==='selectMonth') return norm(o.value).slice(0,3)===norm(action.value) || norm(o.textContent).slice(0,3)===norm(action.value);
        if(action.suffix==='ddlDOBDay') return Number(o.value)===Number(action.value) || Number(o.textContent)===Number(action.value);
        return norm(o.textContent)===norm(action.value);
      });
      if(!option) return {error:'Valor CEAC no disponible: '+action.label+'. Ningún dato aplicado.'};
      candidates.push({el,action,value:option.value});
    }
  }
  // No envía formularios, no cambia de página, no pulsa Next/Sign/Submit.
  // Verificar valores después: algunos selects CEAC pueden desencadenar un postback.
  let applied=0;
  for (const {el,value} of candidates) {
    const proto=el.tagName==='SELECT' ? HTMLSelectElement.prototype :
      el.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if (!setter) return {error:'No fue posible escribir todos los campos.',applied};
    setter.call(el,value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    applied++;
  }
  return {applied,total:candidates.length,path:location.pathname};
}

$('inspect').addEventListener('click',async () => {
  reset(); $('inspect').disabled=true;
  try {
    const tab=await currentCEAC(), data=await scanCEAC(tab.id);
    $('output').textContent=JSON.stringify(data,null,2);
    status(data.fields.length+' controles inspeccionados. No se leyeron respuestas.');
  } catch (e) { status(e.message || 'Falló la inspección.'); }
  finally { $('inspect').disabled=false; }
});
$('prepare').addEventListener('click',async () => {
  reset(); $('prepare').disabled=true; status('Verificando autorización y campos...');
  try {
    const ceac=await currentCEAC(), cm=await findCRMTab();
    const result=await approvedFrom(cm.id);
    const scanned=await scanCEAC(ceac.id);
    const plan=pilot.buildPlan(result.answers,scanned.path);
    const actions=[], pending=[...plan.pending];
    for (const action of plan.actions) {
      const check=compatibleAction(action,scanned.fields);
      if(check.ok) actions.push(action); else pending.push(check.reason);
    }
    if (!actions.length) pending.unshift('No hay campos compatibles para llenar en esta pantalla.');
    $('page').textContent=plan.page+' · Vista previa';
    $('count').textContent=String(actions.length);
    actions.forEach(a=>item($('actions'),a.label+' → '+a.value));
    pending.forEach(msg=>item($('pending'),msg));
    $('preview').style.display='block';
    $('output').textContent=JSON.stringify(scanned,null,2);
    prepared={ceacTab:ceac.id,crmTab:cm.id,draftId:result.draftId,
      approved:JSON.stringify(result.answers),path:scanned.path,actions};
    status('Lista preparada. Confirma los campos antes de continuar.');
  }catch(e){status(e.message || 'No se pudo preparar la transferencia.');}
  finally{$('prepare').disabled=false;}
});
$('confirm').addEventListener('change',() => {
  $('fill').disabled = !prepared || !prepared.actions.length || !$('confirm').checked;
});
$('fill').addEventListener('click',async () => {
  if(!prepared || !$('confirm').checked) return;
  $('fill').disabled=true;status('Validando autorización antes de escribir...');
  try {
    const tab=await currentCEAC();
    if(tab.id!==prepared.ceacTab) throw Error('Cambió la pestaña CEAC. Vuelve a preparar la lista.');
    const fresh=await approvedFrom(prepared.crmTab);
    if(fresh.draftId!==prepared.draftId || JSON.stringify(fresh.answers)!==prepared.approved)
      throw Error('La autorización o el expediente cambiaron. Vuelve a preparar la lista.');
    const r=await chrome.scripting.executeScript({
      target:{tabId:tab.id},func:fillCeacPage,
      args:[{path:prepared.path,actions:prepared.actions}],
    });
    const data=r?.[0]?.result;
    if(!data || data.error) throw Error(data?.error || 'No se obtuvo confirmación de la escritura.');
    status(data.applied+' campos aplicados en '+prepared.path+'. Revisa cada dato en CEAC y avanza manualmente.');
  } catch(e) {status(e.message || 'No se pudo aplicar el llenado.');}
  finally {reset();}
});
