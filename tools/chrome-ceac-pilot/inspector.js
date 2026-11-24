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

  let lastReport = null;
  const $ = id => document.getElementById(id);
  $('inspect-all').addEventListener('click', async () => {
    lastReport = null;
    $('inspect-copy').disabled = true;
    $('inspect-all').disabled = true;
    $('inspect-report').textContent = '';
    $('inspect-all-status').textContent = 'Leyendo solo la estructura visible de CEAC…';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab?.url || '');
      if (url.protocol !== 'https:' || url.hostname !== 'ceac.state.gov' ||
          !/^\/GenNIV\/General\/complete\/[a-z0-9_-]+\.aspx$/i.test(url.pathname))
        throw Error('Abre primero una página del formulario DS-160 en CEAC.');
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: inspectCeacPageMetadata
      });
      const report = result?.[0]?.result;
      if (!report || report.error) throw Error(report?.error || 'No se pudo inspeccionar esta página.');
      lastReport = JSON.stringify(report,null,2);
      $('inspect-report').textContent = lastReport;
      $('inspect-copy').disabled = false;
      $('inspect-all-status').textContent = report.pageKey + ': ' + report.visibleFieldCount +
        ' campos visibles registrados, sin respuestas personales.';
    } catch(error) {
      $('inspect-all-status').textContent = error?.message || 'No se pudo inspeccionar la página.';
    } finally {
      $('inspect-all').disabled = false;
    }
  });
  $('inspect-copy').addEventListener('click', async () => {
    if (!lastReport) return;
    try {
      await navigator.clipboard.writeText(lastReport);
      $('inspect-all-status').textContent = 'Estructura copiada. Puedes pegarla aquí para mapear esta página.';
    } catch {
      $('inspect-all-status').textContent = 'No se pudo copiar automáticamente. Selecciona y copia el JSON visible.';
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
