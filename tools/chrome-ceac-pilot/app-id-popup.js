/* Función independiente del autollenado: detecta y vincula ID solo con aprobación humana. */
(function(){
  'use strict';
  const node = id => document.getElementById(id);
  const helper = window.VmCeacAppId;
  let prepared = null;
  function message(s) { node('link-status').textContent=s; }
  function reset() {
    prepared=null;
    node('link-preview').hidden=true;
    node('link-confirm').checked=false;
    node('link-save').disabled=true;
  }
  function visibleApplicationIds(pattern) {
    if (location.protocol!=='https:' || location.hostname!=='ceac.state.gov' ||
        !/^\/GenNIV\//i.test(location.pathname))
      return {error:'Esta pestaña no es CEAC DS-160.'};
    // innerText contiene únicamente texto visible; nunca leemos inputs, cookies o respuestas.
    const text=String(document.body?.innerText || '').replace(/[\s\u00a0]+/g,' ').slice(0,100000);
    const regex=new RegExp(pattern,'gi');
    return {ids:[...new Set([...text.matchAll(regex)].map(m=>m[1].toUpperCase()))]};
  }
  async function activeCEACTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    let url;
    try { url=new URL(tab?.url || ''); } catch {throw Error('Abre una pestaña de CEAC.');}
    if (url.protocol!=='https:' || url.hostname!=='ceac.state.gov' ||
        !/^\/GenNIV\//i.test(url.pathname))
      throw Error('Deja CEAC DS-160 como pestaña activa para detectar el Application ID.');
    return tab;
  }
  async function detect(tabId) {
    const result=await chrome.scripting.executeScript({
      target:{tabId},func:visibleApplicationIds,args:[helper.pattern],
    });
    const value=result?.[0]?.result;
    if (!value || value.error) throw Error(value?.error || 'No fue posible leer el encabezado de CEAC.');
    if (value.ids.length!==1 || !helper.valid(value.ids[0]))
      throw Error(value.ids.length ? 'Se detectaron varios IDs; verifica la página antes de vincular.' :
        'Aún no aparece un Application ID identificable. Avanza hasta que CEAC lo muestre.');
    return value.ids[0];
  }
  async function crmInfoOnTab() {
    if(location.protocol!=='https:' || location.hostname!=='crm.visamaster.com.mx')
      return {error:'Origen CRM no válido.'};
    const match=location.pathname.match(/^\/admin\/formularios\/trade-in-motion\/([a-f0-9-]{36})\/?$/i);
    if(!match) return {error:'Abre la ficha del candidato en Águila.'};
    try {
      const response=await fetch('/api/admin/ds160/application-id?draft_id='+encodeURIComponent(match[1]),{
        credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},
      });
      const value=await response.json();
      if(!response.ok) return {error:value.error || 'El CRM no autorizó la consulta.'};
      if(value.schema!=='vm-ds160-application-link-v1'||value.draftId!==match[1])
        return {error:'Respuesta de identificación no válida.'};
      return value;
    } catch { return {error:'No se pudo comprobar la sesión de Águila.'}; }
  }
  async function saveOnCRM(request) {
    if(location.protocol!=='https:' || location.hostname!=='crm.visamaster.com.mx')
      return {error:'Origen CRM no válido.'};
    const match=location.pathname.match(/^\/admin\/formularios\/trade-in-motion\/([a-f0-9-]{36})\/?$/i);
    if(!match || match[1]!==request.draftId) return {error:'Cambió la ficha de Águila.'};
    try {
      const response=await fetch('/api/admin/ds160/application-id',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({
          schema:'vm-ds160-application-link-v1',
          draftId:request.draftId,applicationId:request.applicationId,confirmed:true,
        }),
      });
      const value=await response.json();
      if(!response.ok) return {error:value.error || 'El CRM rechazó la vinculación.'};
      return value;
    } catch { return {error:'No se pudo guardar el identificador en Águila.'}; }
  }
  async function crmTab(){
    // La versión piloto evita asociar por accidente un ID con la ficha equivocada.
    const tabs=await chrome.tabs.query({url:'https://crm.visamaster.com.mx/admin/formularios/trade-in-motion/*'});
    const selected=tabs.filter(t=>{
      try { return /^\/admin\/formularios\/trade-in-motion\/[a-f0-9-]{36}\/?$/i.test(new URL(t.url).pathname); }
      catch {return false;}
    });
    if(selected.length!==1) throw Error('Deja abierta una única ficha de candidato en Águila.');
    return selected[0];
  }
  async function info(tabId) {
    const result=await chrome.scripting.executeScript({target:{tabId},func:crmInfoOnTab});
    const value=result?.[0]?.result;
    if(!value || value.error) throw Error(value?.error || 'La ficha no está disponible.');
    return value;
  }
  node('link-detect').addEventListener('click',async()=>{
    reset();node('link-detect').disabled=true;message('Buscando un Application ID visible...');
    try {
      const ceac=await activeCEACTab(), crm=await crmTab();
      const applicationId=await detect(ceac.id);
      const meta=await info(crm.id);
      prepared={ceacTab:ceac.id,crmTab:crm.id,draftId:meta.draftId,applicationId};
      node('link-client').textContent=meta.applicantName;
      node('link-id').textContent=applicationId;
      node('link-prior').textContent=meta.latestApplicationId ?
        'Último ID registrado: '+meta.latestApplicationId : 'Este expediente no tiene Application ID registrado.';
      node('link-preview').hidden=false;
      message('Verifica el identificador y el expediente antes de guardar.');
    } catch(e) {message(e.message || 'Falló la detección.');}
    finally {node('link-detect').disabled=false;}
  });
  node('link-confirm').addEventListener('change',()=>{
    node('link-save').disabled=!prepared || !node('link-confirm').checked;
  });
  node('link-save').addEventListener('click',async()=>{
    if(!prepared || !node('link-confirm').checked) return;
    node('link-save').disabled=true;
    message('Comprobando que el ID y la ficha no cambiaron...');
    try {
      const ceac=await activeCEACTab();
      if(ceac.id!==prepared.ceacTab || (await detect(ceac.id))!==prepared.applicationId)
        throw Error('La pantalla CEAC cambió. Vuelve a detectar el identificador.');
      const meta=await info(prepared.crmTab);
      if(meta.draftId!==prepared.draftId) throw Error('Cambió el expediente; vuelve a detectar.');
      const result=await chrome.scripting.executeScript({
        target:{tabId:prepared.crmTab},func:saveOnCRM,args:[{draftId:prepared.draftId,applicationId:prepared.applicationId}],
      });
      const response=result?.[0]?.result;
      if(!response || response.error || !response.saved)
        throw Error(response?.error || 'Águila no confirmó el guardado.');
      message('Application ID '+prepared.applicationId+' vinculado en Águila. Puedes verlo en la ficha del cliente.');
      reset();
    } catch(e) {message(e.message || 'No se guardó el Application ID.');}
  });
})();
