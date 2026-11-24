'use strict';
const status = document.getElementById('status');
const output = document.getElementById('output');
const inspectButton = document.getElementById('inspect');
const copyButton = document.getElementById('copy');
let lastResult = null;

// This function is injected into the current CEAC tab only by an explicit operator click.
function scanCeacFields() {
  if (location.protocol !== 'https:' || location.hostname.toLowerCase() !== 'ceac.state.gov' ||
      !/^\/genniv\//i.test(location.pathname)) {
    return { error: 'Solo se permite inspeccionar páginas oficiales DS-160 en ceac.state.gov/GenNIV/.' };
  }
  const describe = (node, index) => {
    const tag = node.tagName.toLowerCase();
    const type = (node.getAttribute('type') || '').toLowerCase();
    const id = node.getAttribute('id') || '';
    const name = node.getAttribute('name') || '';
    const role = node.getAttribute('role') || '';
    const label = id ? document.querySelectorAll('label[for]').length &&
      [...document.querySelectorAll('label[for]')].find(l => l.htmlFor === id)?.textContent?.trim().slice(0, 100) : '' : '';
    const options = tag === 'select' ? [...node.options].map(x => ({ code: x.value, label: (x.textContent || '').trim().slice(0, 60) })).slice(0, 35) : undefined;
    return { index, tag, type, id, name, role, label: label || undefined, options };
  };
  const nodes = [...document.querySelectorAll('input,select,textarea')].filter(node => {
    const type = (node.getAttribute('type') || '').toLowerCase();
    const style = getComputedStyle(node);
    return !['hidden','password','submit','button','reset','image','file'].includes(type) &&
      !node.disabled && style.visibility !== 'hidden' && style.display !== 'none' &&
      node.getClientRects().length > 0;
  });
  // Do not inspect .value, .checked, cookies, localStorage, page text, network state or form data.
  return {
    schema: 'vm-ceac-fields-inspection-v1',
    host: location.hostname,
    path: location.pathname,
    fields: nodes.map(describe),
    safety: 'METADATA_ONLY_NO_VALUES_NO_WRITES'
  };
}
inspectButton.addEventListener('click', async () => {
  inspectButton.disabled = true;
  copyButton.disabled = true;
  lastResult = null;
  output.textContent = '';
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab?.url || '');
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'ceac.state.gov' || !/^\/genniv\//i.test(url.pathname)) {
      throw new Error('Abre primero una página oficial DS-160 en ceac.state.gov/GenNIV/.');
    }
    const results = await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanCeacFields});
    const data = results?.[0]?.result;
    if (!data || data.error) throw new Error(data?.error || 'No se pudo inspeccionar la página.');
    lastResult = data;
    status.textContent = data.fields.length + ' controles visibles identificados. Sin leer valores del solicitante.';
    output.textContent = JSON.stringify(data, null, 2);
    copyButton.disabled = false;
  } catch (error) {
    status.textContent = error?.message || 'Error de inspección.';
  } finally { inspectButton.disabled = false; }
});
copyButton.addEventListener('click', async () => {
  if (!lastResult) return;
  try { await navigator.clipboard.writeText(JSON.stringify(lastResult,null,2)); status.textContent = 'Estructura copiada; no incluye respuestas personales.'; }
  catch { status.textContent = 'No se pudo copiar la estructura.'; }
});
