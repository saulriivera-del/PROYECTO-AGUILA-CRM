/* Comparación de metadatos CEAC: no procesa ni guarda respuestas personales. */
(function (root) {
  'use strict';

  const PROFILES = Object.freeze(['TN','TD','B1/B2']);

  function fieldKey(field) {
    const id = String(field?.id || '').trim();
    if (id) return 'id:' + id;
    const name = String(field?.name || '').trim();
    // Los radios pueden compartir name, pero normalmente cada uno tiene id.
    return 'fallback:' + [name,field?.tag,field?.type,field?.label].map(v=>String(v || '')).join('|');
  }
  function fieldsByKey(report) {
    const map = new Map();
    for (const field of report.fields || []) {
      const key = fieldKey(field);
      if (map.has(key)) throw Error('Campo CEAC sin identidad única: ' + key);
      map.set(key,field);
    }
    return map;
  }
  function optionKey(opt) { return JSON.stringify([String(opt.code || ''),String(opt.label || '')]); }
  function optionDelta(before,after) {
    const oldSet=new Set((before || []).map(optionKey));
    const newSet=new Set((after || []).map(optionKey));
    return {
      added:(after || []).filter(o=>!oldSet.has(optionKey(o))),
      removed:(before || []).filter(o=>!newSet.has(optionKey(o)))
    };
  }
  function describe(field) {
    return {id:field.id || '',name:field.name || '',label:field.label || '',
      tag:field.tag,type:field.type, optionsCount:field.options?.length || 0};
  }
  function compareInspections(before,after,profile,branchLabel='') {
    if (!PROFILES.includes(profile)) throw Error('Tipo de visa no permitido.');
    if (!before || !after ||
        before.schema !== 'vm-ceac-page-structure-v1' ||
        after.schema !== 'vm-ceac-page-structure-v1')
      throw Error('Se requiere una inspección de estructura válida antes y después.');
    if (!before.path || before.path !== after.path)
      throw Error('No se pueden comparar páginas distintas. Regresa a la misma pantalla CEAC.');
    const previous=fieldsByKey(before),current=fieldsByKey(after);
    const added=[],removed=[],changed=[];
    for (const [key,field] of current) if (!previous.has(key)) added.push(describe(field));
    for (const [key,field] of previous) if (!current.has(key)) removed.push(describe(field));
    for (const [key,field] of current) {
      const was=previous.get(key);
      if (!was) continue;
      const options=optionDelta(was.options,field.options);
      if (was.label !== field.label || was.type !== field.type || was.tag !== field.tag ||
          options.added.length || options.removed.length)
        changed.push({id:field.id || key, before:describe(was),
          after:describe(field), options});
    }
    return {
      schema:'vm-ceac-conditional-diff-v1',profile,
      path:after.path,pageKey:after.pageKey,
      operatorBranch: String(branchLabel || '').trim().slice(0,100),
      beforeCount:previous.size,afterCount:current.size,
      added,removed,changed,
      noChanges: !added.length && !removed.length && !changed.length,
      safety:'METADATA_ONLY_NO_RESPONSES_NO_WRITES'
    };
  }
  // Los campos de páginas diferentes no se comparan como un mismo formulario:
  // se registran dos inventarios y la transición observada por el operador.
  function recordPageTransition(before, after, profile, branchLabel='') {
    if (!PROFILES.includes(profile)) throw Error('Tipo de visa no permitido.');
    if (!before || !after || before.schema!=='vm-ceac-page-structure-v1' ||
        after.schema!=='vm-ceac-page-structure-v1' || !before.path || !after.path)
      throw Error('Se requieren dos estructuras válidas para registrar la transición.');
    if (before.path===after.path) throw Error('La página no cambió; utiliza la comparación de controles.');
    fieldsByKey(before); fieldsByKey(after);
    return {
      schema:'vm-ceac-page-transition-v1',profile,
      operatorBranch:String(branchLabel || '').trim().slice(0,100),
      before:{path:before.path,pageKey:before.pageKey,
        visibleFieldCount:before.fields.length,fields:before.fields.map(describe)},
      after:{path:after.path,pageKey:after.pageKey,
        visibleFieldCount:after.fields.length,fields:after.fields.map(describe)},
      transitionObserved:true,
      notice:'Dos páginas distintas: no se infiere que los campos de destino hayan sido causados por una respuesta. Verificar la condición manualmente.',
      safety:'METADATA_ONLY_NO_RESPONSES_NO_WRITES'
    };
  }
  const api={PROFILES,compareInspections,recordPageTransition,fieldKey};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.VmCeacDiff=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
