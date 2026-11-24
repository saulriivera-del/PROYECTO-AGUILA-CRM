/* Visa Master · lector de Application ID. Solo reconoce texto etiquetado, no campos de formulario. */
(function(root){
  'use strict';
  const pattern = String.raw`\b(?:Your\s+)?Application\s+ID\s*(?:is\s*)?[:：#-]?\s*(AA[A-Z0-9]{8})(?![A-Z0-9])`;
  function candidates(text) {
    const visible = String(text || '').replace(/[\s\u00a0]+/g, ' ').slice(0, 100000);
    const rx = new RegExp(pattern, 'gi');
    return [...new Set([...visible.matchAll(rx)].map(m => m[1].toUpperCase()))];
  }
  function valid(value) { return /^AA[A-Z0-9]{8}$/.test(String(value || '')); }
  const api = { pattern, candidates, valid };
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.VmCeacAppId=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
