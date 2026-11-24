/* Visa Master DS-160 · Mapeador de estructura v1.
 * Solo lee controles, etiquetas y catálogos. Nunca valores escritos, marcados,
 * seleccionados, Application ID, cookies ni datos de sesión.
 */
(function (root) {
  'use strict';

  // Esta función es autosuficiente: Chrome la ejecuta en la pestaña CEAC
  // después de un clic del operador, sin importar variables del popup.
  function inspectCeacPageMetadata() {
    const path = location.pathname;
    if (location.protocol !== 'https:' ||
        location.hostname.toLowerCase() !== 'ceac.state.gov' ||
        !/^\/GenNIV\/General\/complete\/[a-z0-9_-]+\.aspx$/i.test(path)) {
      return { error: 'Abre una sección del DS-160 en ceac.state.gov/GenNIV/General/complete/.' };
    }
    const redact = text => String(text || '')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[correo oculto]')
      .replace(/\bAA[A-Z0-9]{8}\b/gi,'[identificador oculto]')
      .replace(/\b\+?\d(?:[\d\s().-]{8,}\d)\b/g,'[número oculto]')
      .replace(/\s+/g,' ').trim().slice(0,180);
    const fields = [...document.querySelectorAll('input,select,textarea')]
      .filter(el => {
        const type = (el.getAttribute('type') || '').toLowerCase();
        const style = getComputedStyle(el);
        return !['hidden','password','submit','button','reset','image','file'].includes(type) &&
          !el.disabled && style.visibility !== 'hidden' && style.display !== 'none' &&
          Boolean(el.getClientRects().length);
      })
      .slice(0,350)
      .map((el,index) => {
        const type = (el.getAttribute('type') || '').toLowerCase();
        const labelElements = [...(el.labels || [])];
        const aria = el.getAttribute('aria-label') || '';
        const name = el.getAttribute('name') || '';
        const entry = {
          index,
          id: redact(el.id || ''),
          name: redact(name),
          tag: el.tagName.toLowerCase(),
          type,
          label: redact(labelElements.map(label=>label.textContent || '').join(' ') || aria),
          maxLength: Number(el.getAttribute('maxlength')) > 0
            ? Number(el.getAttribute('maxlength')) : undefined,
          options: el.tagName === 'SELECT'
            ? [...el.options].slice(0,600).map(option => ({
                code: redact(option.value),
                label: redact(option.textContent || '')
              }))
            : undefined,
        };
        return entry;
      });
    return {
      schema: 'vm-ceac-page-structure-v1',
      path,
      pageKey: path.split('/').pop(),
      visibleFieldCount: fields.length,
      fields,
      safety: 'METADATA_ONLY_NO_CURRENT_VALUES_NO_WRITES',
      notes: 'Repetir inspección si aparecen campos condicionales; no se leen valores ni respuestas.'
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { inspectCeacPageMetadata };
    return;
  }

  const BASELINE_KEY = 'vm_ceac_conditional_baseline_v1';
  const PROFILE_KEY = 'vm_ceac_visa_profile_v1';
  const diffEngine = root.VmCeacDiff;
  let lastReport = null;
  let lastDiff = null;
  const $ = id => document.getElementById(id);

  async function inspectActive() {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab?.url || '');
    if (url.protocol !== 'https:' || url.hostname !== 'ceac.state.gov' ||
        !/^\/GenNIV\/General\/complete\/[a-z0-9_-]+\.aspx$/i.test(url.pathname)) {
      throw Error('Abre primero una página del formulario DS-160 en CEAC.');
    }
    const result = await chrome.scripting.executeScript({
      target:{tabId:tab.id},func:inspectCeacPageMetadata
    });
    const report = result?.[0]?.result;
    if (!report || report.error) throw Error(report?.error || 'Falló la lectura de estructura CEAC.');
    return {tabId:tab.id,report};
  }

  $('inspect-all').addEventListener('click', async () => {
    lastReport = null;
    $('inspect-copy').disabled = true;
    $('inspect-all').disabled = true;
    $('inspect-report').textContent = '';
    $('inspect-all-status').textContent = 'Leyendo solo la estructura visible de CEAC…';
    try {
      const {report}=await inspectActive();
      lastReport=JSON.stringify(report,null,2);
      $('inspect-report').textContent=lastReport;
      $('inspect-copy').disabled=false;
      $('inspect-all-status').textContent=report.pageKey+': '+report.visibleFieldCount+
        ' campos visibles registrados, sin respuestas personales.';
    } catch(error) {
      $('inspect-all-status').textContent=error?.message || 'No se pudo inspeccionar la página.';
    } finally {
      $('inspect-all').disabled=false;
    }
  });
  $('inspect-copy').addEventListener('click', async () => {
    if (!lastReport) return;
    try {
      await navigator.clipboard.writeText(lastReport);
      $('inspect-all-status').textContent='Estructura copiada. Puedes pegarla aquí para mapear esta página.';
    } catch {
      $('inspect-all-status').textContent='No se pudo copiar automáticamente. Selecciona y copia el JSON visible.';
    }
  });

  async function getBaseline() {
    return (await chrome.storage.session.get(BASELINE_KEY))[BASELINE_KEY] || null;
  }
  async function showBaselineStatus() {
    try {
      const prior=await getBaseline();
      $('branch-status').textContent=prior
        ? 'Guardada: '+prior.profile+' · '+prior.report.pageKey+
          '. Modifica la respuesta en CEAC (puedes avanzar de página) y pulsa Registrar DESPUÉS.'
        : 'Sin estructura inicial guardada.';
    } catch {
      $('branch-status').textContent='No se pudo consultar la estructura inicial en esta sesión.';
    }
  }
  chrome.storage.session.get(PROFILE_KEY).then(data => {
    const saved=data[PROFILE_KEY];
    if (diffEngine.PROFILES.includes(saved)) $('visa-profile').value=saved;
    return showBaselineStatus();
  }).catch(() => {
    $('branch-status').textContent='Almacenamiento temporal no disponible.';
  });
  $('visa-profile').addEventListener('change', async () => {
    lastDiff=null;
    $('branch-results').hidden=true;
    await chrome.storage.session.set({[PROFILE_KEY]:$('visa-profile').value});
    await showBaselineStatus();
  });
  $('branch-before').addEventListener('click', async () => {
    $('branch-before').disabled=true;
    lastDiff=null;
    $('branch-results').hidden=true;
    $('branch-status').textContent='Guardando estructura previa…';
    try {
      const {tabId,report}=await inspectActive();
      const profile=$('visa-profile').value;
      if (!diffEngine.PROFILES.includes(profile)) throw Error('Selecciona TN, TD o B1/B2.');
      await chrome.storage.session.set({
        [BASELINE_KEY]:{profile,tabId,report},
        [PROFILE_KEY]:profile
      });
      $('branch-status').textContent='Guardado: '+profile+' · '+report.pageKey+' · '+
        report.visibleFieldCount+' controles. Cambia una respuesta manualmente en CEAC.';
    }catch(error){
      $('branch-status').textContent=error?.message || 'No se pudo guardar la estructura inicial.';
    }finally{
      $('branch-before').disabled=false;
    }
  });
  $('branch-after').addEventListener('click', async () => {
    $('branch-after').disabled=true;
    $('branch-results').hidden=true;
    lastDiff=null;
    $('branch-status').textContent='Comparando controles antes y después…';
    try {
      const prior=await getBaseline();
      if(!prior) throw Error('Primero pulsa Guardar estructura ANTES.');
      const profile=$('visa-profile').value;
      if(profile!==prior.profile)
        throw Error('La estructura inicial se guardó para '+prior.profile+
          '. Elige ese mismo tipo de visa o guarda otra estructura inicial.');
      const {tabId,report}=await inspectActive();
      if(tabId!==prior.tabId)
        throw Error('Cambió la pestaña CEAC. Vuelve a guardar estructura ANTES en esta pestaña.');
      const changedPage=prior.report.path!==report.path;
      const diff=changedPage
        ? diffEngine.recordPageTransition(prior.report,report,profile,$('branch-trigger').value)
        : diffEngine.compareInspections(prior.report,report,profile,$('branch-trigger').value);
      lastDiff=JSON.stringify(diff,null,2);
      $('branch-report').textContent=lastDiff;
      $('branch-copy').disabled=false;
      $('branch-results').hidden=false;
      if (changedPage) {
        $('branch-summary').textContent='Cambio de página: '+diff.before.pageKey+
          ' → '+diff.after.pageKey+'. Se guardaron ambas estructuras por separado.';
        $('branch-status').textContent='Transición registrada para '+profile+
          '. Copia el reporte para relacionar la respuesta con la nueva pantalla.';
      } else {
        const count=diff.added.length+diff.removed.length+diff.changed.length;
        $('branch-summary').textContent=diff.noChanges
          ? 'Sin cambios visibles. Algunas condiciones requieren cambiar de pantalla, recargar o completar campos previos.'
          : 'Detectado: '+diff.added.length+' campo(s) nuevos, '+diff.removed.length+
            ' ocultos y '+diff.changed.length+' modificados.';
        $('branch-status').textContent=count
          ? 'Rama registrada. Copia las diferencias para mapear el cuestionario de '+profile+'.'
          : 'No se detectaron diferencias de estructura en esta pantalla.';
      }
    }catch(error) {
      $('branch-status').textContent=error?.message || 'No se pudo comparar.';
    }finally {
      $('branch-after').disabled=false;
    }
  });
  $('branch-copy').addEventListener('click',async ()=>{
    if(!lastDiff) return;
    try {
      await navigator.clipboard.writeText(lastDiff);
      $('branch-status').textContent='Diferencias copiadas. Revísalas y compártelas para mapear la rama.';
    }catch {
      $('branch-status').textContent='No se pudo copiar. Selecciona y copia las diferencias visibles.';
    }
  });
  $('branch-clear').addEventListener('click',async ()=>{
    await chrome.storage.session.remove(BASELINE_KEY);
    lastDiff=null;
    $('branch-results').hidden=true;
    await showBaselineStatus();
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
