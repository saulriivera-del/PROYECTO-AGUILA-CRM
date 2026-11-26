/* Visa Master · Recorrido supervisado de CEAC: solo páginas mapeadas. */
'use strict';
importScripts('mapping.js','workflow-logic.js');
const KEY='vm_ceac_autoflow_state_v1';
const active=new Set();
const P1=VmCeacAutoLogic.P1,P2=VmCeacAutoLogic.P2;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const jobGet=async ()=>(await chrome.storage.session.get(KEY))[KEY]||null;
const jobSet=async job=>chrome.storage.session.set({[KEY]:{...job,updatedAt:Date.now()}});
// Cada consulta tiene límite; ningún trabajo puede quedar indefinidamente en "Comprobando".
const INJECT_TIMEOUT_MS=12000;
const STALE_TIMEOUT_MS=18000;
async function pause(job,reason,status='paused'){
  const current=await jobGet();
  if(!current||current.tabId!==job.tabId||current.status==='stopped')return;
  await jobSet({...current,status,phase:'idle',message:reason});
}
function readCRMApproved(){
  if(location.protocol!=='https:'||!['crm.visamaster.com.mx','proyecto-aguila-crm-git-feature-ds160-persona-0e92fb-visamaster.vercel.app'].includes(location.hostname))return {error:'CRM no autorizado'};
  const m=location.pathname.match(/^\/admin\/formularios\/trade-in-motion\/([a-f0-9-]{36})\/?$/i);
  if(!m)return {error:'Abre una única ficha de candidato en Águila'};
  const controller=new AbortController();
  const limit=setTimeout(()=>controller.abort(),9000);
  return fetch('/api/admin/ds160/personal?draft_id='+encodeURIComponent(m[1]),{
    credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},
    signal:controller.signal
  }).then(async response=>{
    const payload=await response.json();
    if(!response.ok||payload.schema!=='vm-ds160-personal-v1'||payload.draftId!==m[1]||
       payload.scope!=='personal'||!payload.answers)return {error:'El expediente no tiene aprobación vigente'};
    return {draftId:payload.draftId,answers:payload.answers};
  }).catch(error=>({error:error?.name==='AbortError'
    ? 'La consulta a Águila superó 9 segundos; verifica sesión y conexión.'
    : 'Falló la lectura del expediente aprobado'})).finally(()=>clearTimeout(limit));
}
function inspectCEAC(){
  if(location.protocol!=='https:'||location.hostname!=='ceac.state.gov')return {error:'Dominio CEAC incorrecto'};
  const path=location.pathname;
  if(!['/GenNIV/General/complete/complete_personal.aspx',
        '/GenNIV/General/complete/complete_personalcont.aspx'].includes(path))return {error:'Página sin mapeo'};
  const fields=[...document.querySelectorAll('input,select,textarea')].filter(el=>{
    const t=(el.getAttribute('type')||'').toLowerCase();
    const style=getComputedStyle(el);
    return !['hidden','password','submit','button','reset','file','image'].includes(t)&&
      !el.disabled&&style.display!=='none'&&style.visibility!=='hidden'&&el.getClientRects().length;
  }).map(el=>({
    id:el.id||'',tag:el.tagName.toLowerCase(),type:(el.getAttribute('type')||'').toLowerCase(),
    optionLabel:['radio','checkbox'].includes(el.type)?[...(el.labels||[])].map(l=>(l.textContent||'').trim()).join(' '):undefined,
    options:el.tagName==='SELECT'?[...el.options].map(o=>({code:o.value,label:(o.textContent||'').trim()})):undefined
  }));
  return {path,fields}; // Solo metadatos, nunca valores elegidos.
}
function applyCEAC(request){
  const P1='/GenNIV/General/complete/complete_personal.aspx';
  const P2='/GenNIV/General/complete/complete_personalcont.aspx';
  if(location.protocol!=='https:'||location.hostname!=='ceac.state.gov'||location.pathname!==request.path||
     ![P1,P2].includes(request.path))return {error:'Cambió la pantalla CEAC'};
  const whitelist=request.path===P1?new Set([
    'tbxAPP_SURNAME','tbxAPP_GIVEN_NAME','cbxAPP_FULL_NAME_NATIVE_NA','rblOtherNames_1','rblTelecodeQuestion_1',
    'ddlAPP_GENDER','ddlAPP_MARITAL_STATUS','ddlDOBDay','ddlDOBMonth','tbxDOBYear',
    'tbxAPP_POB_CITY','tbxAPP_POB_ST_PROVINCE','ddlAPP_POB_CNTRY'
  ]):new Set([
    'ddlAPP_NATL','tbxAPP_NATIONAL_ID','rblAPP_OTHER_NATL_1',
    'rblAPP_PERM_RESIDENT_1','cbxAPP_SSN_NA','tbxAPP_SSN','cbxAPP_TAX_ID_NA'
  ]);
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const matches=[];
  for(const action of request.actions){
    if(!whitelist.has(action.suffix)||!['text','selectValue','radioNo','checkboxNA'].includes(action.mode))
      return {error:'Acción fuera de lista permitida'};
    const fields=[...document.querySelectorAll('input,select,textarea')].filter(el=>el.id&&
      el.id.endsWith('_'+action.suffix)&&!el.disabled&&el.getClientRects().length);
    if(fields.length!==1)return {error:'Control CEAC ausente o duplicado: '+action.label};
    const el=fields[0];
    if(action.mode==='text'){
      if(!['INPUT','TEXTAREA'].includes(el.tagName)||['hidden','password','file'].includes(el.type))
        return {error:'Tipo incorrecto en '+action.label};
    }else if(action.mode==='radioNo'||action.mode==='checkboxNA'){
      const labels=[...(el.labels||[])].map(l=>norm(l.textContent)).filter(Boolean);
      if(labels.length!==1||el.type!==(action.mode==='radioNo'?'radio':'checkbox')||
        (action.mode==='radioNo'?labels[0]!=='NO':!labels[0].startsWith('DOESNOTAPPLY')))
        return {error:'Etiqueta no verificada: '+action.label};
    }else{
      if(el.tagName!=='SELECT'||[...el.options].filter(o=>o.value===action.value&&
        (!action.expectedLabel||norm(o.textContent)===norm(action.expectedLabel))).length!==1)
        return {error:'Opción CEAC cambió: '+action.label};
    }
    matches.push({el,action});
  }
  matches.sort((a,b)=>Number(['radioNo','checkboxNA'].includes(a.action.mode))-
                       Number(['radioNo','checkboxNA'].includes(b.action.mode)));
  let applied=0;
  for(const {el,action} of matches){
    if(!el.isConnected||location.pathname!==request.path)return {error:'CEAC modificó la página mientras se escribía',applied};
    if(['radioNo','checkboxNA'].includes(action.mode)){if(!el.checked)el.click();applied++;continue}
    const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:
      el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(!setter)return {error:'No se pudo introducir un dato',applied};
    setter.call(el,action.value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    applied++;
  }
  return {applied,total:matches.length};
}
function verifyCEAC(request){
  if(location.protocol!=='https:'||location.hostname!=='ceac.state.gov'||location.pathname!==request.path)
    return {ok:false,reason:'CEAC cambió de pantalla antes de la verificación'};
  const failures=[];
  for(const action of request.actions){
    const found=[...document.querySelectorAll('input,select,textarea')].filter(el=>el.id&&el.id.endsWith('_'+action.suffix));
    if(found.length!==1){failures.push(action.suffix);continue}
    const el=found[0];
    if(['radioNo','checkboxNA'].includes(action.mode)){
      if(!el.checked)failures.push(action.suffix);
    }else if(String(el.value)!==String(action.value))failures.push(action.suffix);
  }
  const errorVisible=[...document.querySelectorAll('[aria-invalid="true"],.field-validation-error,.validation-summary-errors')]
    .some(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  return {ok:failures.length===0&&!errorVisible,failedCount:failures.length,validationError:errorVisible};
}
function clickNext(request){
  const allowed=[
    '/GenNIV/General/complete/complete_personal.aspx',
    '/GenNIV/General/complete/complete_personalcont.aspx'
  ];
  if(location.protocol!=='https:'||location.hostname!=='ceac.state.gov'||location.pathname!==request.path||
     !allowed.includes(request.path))
    return {clicked:false,reason:'Página no autorizada para Next automático'};
  const visible=el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  const buttons=[...document.querySelectorAll('input[type=submit],input[type=button],input[type=image],button')]
    .filter(visible).filter(el=>{
      const labels=[el.value,el.textContent,el.getAttribute?.('alt'),el.getAttribute?.('aria-label'),el.title]
        .map(v=>String(v||'').trim().toUpperCase()).filter(Boolean);
      return labels.includes('NEXT');
    });
  if(buttons.length!==1)return {clicked:false,reason:'No se encontró botón Next único y verificable'};
  buttons[0].click(); // Next oficial valida y guarda; jamás firma ni envía.
  return {clicked:true};
}
async function injected(tabId,fn,args=[],label='ejecutar la operación'){
  let timeoutHandle;
  try {
    const out=await Promise.race([
      chrome.scripting.executeScript({target:{tabId},func:fn,args}),
      new Promise((_,reject)=>{
        timeoutHandle=setTimeout(()=>reject(Error('Tiempo límite al '+label+' (12 segundos).')),INJECT_TIMEOUT_MS);
      })
    ]);
    if(!out||!out[0])throw Error('No fue posible ejecutar sobre la pestaña al '+label);
    return out[0].result;
  } finally {clearTimeout(timeoutHandle);}
}
async function processTab(tabId){
  if(active.has(tabId))return;
  active.add(tabId);
  try{
    let job=await jobGet();
    if(!job||job.tabId!==tabId||job.status!=='running')return;
    const tab=await chrome.tabs.get(tabId), url=new URL(tab.url||'');
    if(url.protocol!=='https:'||url.hostname!=='ceac.state.gov'){
      await pause(job,'La pestaña salió de CEAC; recorrido detenido.');return;
    }
    const path=url.pathname;
    if(![P1,P2].includes(path)){
      await pause(job,/review/i.test(path)?'Llegaste a una pantalla de revisión: debe revisarla el solicitante.':
        'Se llegó a una sección aún no mapeada ('+path.split('/').pop()+'). Revisión manual necesaria.');return;
    }
    if(job.phase==='await-nav'&&path===job.page){
      await pause(job,'CEAC no avanzó. Revisa los avisos y campos obligatorios de esta página.');return;
    }
    if(job.step>=2){await pause(job,'Límite del piloto: solo Datos personales 1 y 2.');return;}
    await jobSet({...job,phase:'checking_crm',message:'Consultando autorización de Águila para '+path.split('/').pop()});
    const crm=await injected(job.crmTabId,readCRMApproved,[],'consultar el expediente de Águila');
    if(!crm||crm.error||crm.draftId!==job.draftId){
      await pause(job,crm?.error||'No se pudieron confirmar datos aprobados del mismo candidato.');return;
    }
    job=await jobGet(); if(job?.status!=='running')return;
    await jobSet({...job,phase:'checking_ceac',message:'Inspeccionando los controles de '+path.split('/').pop()});
    const metadata=await injected(tabId,inspectCEAC,[],'inspeccionar controles de CEAC');
    if(!metadata||metadata.error||metadata.path!==path){await pause(job,'Estructura CEAC inesperada.');return;}
    const plan=VmCeacAutoLogic.plan(crm.answers,path,metadata.fields);
    if(!plan.actions.length){await pause(job,'No hay campos compatibles en esta pantalla: '+plan.pending.join(' | '));return;}
    job=await jobGet();if(job?.status!=='running')return;
    await jobSet({...job,phase:'writing',message:'Precargando '+plan.page});
    const written=await injected(tabId,applyCEAC,[{path,actions:plan.actions}],'precargar campos');
    if(!written||written.error||written.applied!==written.total){
      await pause(job,'El autollenado se interrumpió: '+(written?.error||'Cantidad de campos distinta'));return;
    }
    await sleep(300);
    job=await jobGet();if(job?.status!=='running')return;
    const result=await injected(tabId,verifyCEAC,[{path,actions:plan.actions}],'verificar campos precargados');
    if(!result?.ok){
      await pause(job,'Revisión requerida: CEAC no confirmó todos los campos o indicó errores.');return;
    }
    if(!plan.canAdvance){
      await pause(job,'Datos precargados; no se avanzó por pendientes: '+plan.pending.filter(p=>
        !p.startsWith('Revisa los valores predeterminados')&&!p.startsWith('Las opciones Yes/No')).join(' | '));return;
    }
    // El flujo solo continúa tras una validación de la estructura y las respuestas.
    job=await jobGet();if(job?.status!=='running')return;
    await jobSet({...job,phase:'await-nav',page:path,step:job.step+1,
      message:'Comprobado '+plan.page+'; avanzando mediante Next de CEAC'});
    const move=await injected(tabId,clickNext,[{path}],'pulsar Next de CEAC');
    if(!move?.clicked){await pause(job,'Next no disponible: '+(move?.reason||'verificar CEAC'));return;}
  }catch(error){
    const job=await jobGet();
    if(job?.tabId===tabId)await pause(job,'Recorrido interrumpido por problema de página o sesión: '+String(error?.message||'error').slice(0,140));
  }finally{
    active.delete(tabId);
    const job=await jobGet();
    if(job?.tabId===tabId&&job.status==='running'&&job.phase==='await-nav'){
      try{
        const tab=await chrome.tabs.get(tabId),url=new URL(tab.url||'');
        if(url.pathname!==job.page)void processTab(tabId);
      }catch{}
    }
  }
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(!msg||!['VM_AUTOFLOW_START','VM_AUTOFLOW_STATUS','VM_AUTOFLOW_STOP'].includes(msg.type))return;
  (async()=>{
    if(msg.type==='VM_AUTOFLOW_STATUS'){
      let j=await jobGet();
      if(j?.status==='running' && (!Number.isFinite(j.updatedAt) ||
          Date.now()-j.updatedAt>STALE_TIMEOUT_MS)){
        await pause(j,'Recorrido pausado: una comprobación dejó de responder. Revisa el expediente y vuelve a iniciar.');
        j=await jobGet();
      }
      return {ok:true,status:j?.status||'idle',message:j?.message||'No hay recorrido activo',phase:j?.phase||'idle'};
    }
    if(msg.type==='VM_AUTOFLOW_STOP'){
      const j=await jobGet();if(j)await jobSet({...j,status:'stopped',phase:'idle',message:'Detenido por el operador'});
      return {ok:true};
    }
    const old=await jobGet();
    if(old?.status==='running')return {ok:false,error:'Ya hay un recorrido activo. Detén el anterior.'};
    if(!Number.isInteger(msg.tabId)||!Number.isInteger(msg.crmTabId)||!/^[a-f0-9-]{36}$/i.test(msg.draftId||''))
      return {ok:false,error:'Expediente o pestaña inválidos'};
    const tab=await chrome.tabs.get(msg.tabId),url=new URL(tab.url||'');
    if(url.hostname!=='ceac.state.gov'||url.protocol!=='https:'||![P1,P2].includes(url.pathname))
      return {ok:false,error:'Abre Personal Information 1 o 2 de CEAC'};
    // No se almacenan datos del formulario ni tokens, solo metadatos del recorrido.
    await jobSet({tabId:msg.tabId,crmTabId:msg.crmTabId,draftId:msg.draftId,status:'running',
      phase:'ready',step:0,page:'',message:'Iniciando recorrido supervisado'});
    // Mantener vivo el canal del mensaje durante el primer llenado;
    // antes se contestaba inmediatamente y el service worker podía suspenderse.
    await processTab(msg.tabId);
    return {ok:true};
  })().then(reply).catch(e=>reply({ok:false,error:String(e?.message||'Error')}));return true;
});
chrome.tabs.onUpdated.addListener((tabId,info)=>{
  if(info.status==='complete')void processTab(tabId);
});
chrome.tabs.onRemoved.addListener(async tabId=>{
  const j=await jobGet();if(j?.tabId===tabId)await jobSet({...j,status:'stopped',phase:'idle',message:'Pestaña CEAC cerrada'});
});
