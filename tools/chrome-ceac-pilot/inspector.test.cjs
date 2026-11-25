const test = require('node:test');
const assert = require('node:assert/strict');
const {inspectCeacPageMetadata} = require('./inspector.js');

function mockControl(overrides={}) {
  const attributes = Object.assign({type:'text', maxlength:'50'},overrides.attrs || {});
  const el={
    id: 'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME',
    tagName: 'INPUT', disabled: false, labels:[{textContent:'Surnames'}],
    getAttribute: name => attributes[name] || null,
    getClientRects: () => [1],
  };
  // Object.entries y el spread leen getters: la prueba fallaría antes
  // de llamar al inspector. Copiar descriptores sin leer respuestas.
  const descriptors=Object.getOwnPropertyDescriptors(overrides);
  delete descriptors.attrs;
  Object.defineProperties(el,descriptors);
  return el;
}
function environment(path, controls) {
  global.location={protocol:'https:',hostname:'ceac.state.gov',pathname:path};
  global.document={querySelectorAll:()=>controls};
  global.getComputedStyle=()=>({visibility:'visible',display:'block'});
}
test('inspecciona páginas distintas y separa resultados por ruta',()=>{
  environment('/GenNIV/General/complete/complete_personal.aspx',[mockControl()]);
  const first=inspectCeacPageMetadata();
  assert.equal(first.schema,'vm-ceac-page-structure-v1');
  assert.equal(first.pageKey,'complete_personal.aspx');
  assert.equal(first.fields[0].label,'Surnames');
  assert.equal(first.fields[0].maxLength,50);
  environment('/GenNIV/General/complete/complete_passport.aspx',[mockControl({id:'ctl00_FormView1_tbxPASSPORT_NUMBER'})]);
  const second=inspectCeacPageMetadata();
  assert.equal(second.pageKey,'complete_passport.aspx');
  assert.notEqual(first.path,second.path);
});

test('nunca lee ni exporta respuestas, estados de radio ni texto de entrada',()=>{
  const field=mockControl({
    id:'ctl00_FormView1_tbxAPP_SURNAME',
    get value(){throw Error('Inspector cannot read input.value')},
    get checked(){throw Error('Inspector cannot read input.checked')}
  });
  environment('/GenNIV/General/complete/complete_personal.aspx',[field]);
  const result=inspectCeacPageMetadata();
  const json=JSON.stringify(result);
  assert.equal(result.visibleFieldCount,1);
  assert.equal('value' in result.fields[0],false);
  assert.equal('checked' in result.fields[0],false);
  assert.equal(json.includes('application_id'),false);
});

test('obtiene catálogo de select pero nunca la opción seleccionada',()=>{
  const select=mockControl({
    id:'ctl00_FormView1_ddlAPP_POB_CNTRY',tagName:'SELECT',labels:[],
    options:[{value:'',textContent:'SELECT ONE'},{value:'MEX',textContent:'MEXICO'}],
    get value(){throw Error('Never read selected value')},
    get selectedIndex(){throw Error('Never read selectedIndex')}
  });
  environment('/GenNIV/General/complete/complete_personal.aspx',[select]);
  const result=inspectCeacPageMetadata();
  assert.deepEqual(result.fields[0].options[1],{code:'MEX',label:'MEXICO'});
});

test('no inspecciona otros sitios ni páginas que no sean secciones del DS-160',()=>{
  environment('/GenNIV/General/complete/complete_personal.aspx',[]);
  global.location.hostname='evil.example';
  assert.ok(inspectCeacPageMetadata().error);
  global.location.hostname='ceac.state.gov';
  global.location.pathname='/GenNIV/Account/Create';
  assert.ok(inspectCeacPageMetadata().error);
});

test('oculta posibles identificadores personales en etiquetas de CEAC',()=>{
  const field=mockControl({labels:[{textContent:'Enviar a user@example.com AA12345678'}]});
  environment('/GenNIV/General/complete/complete_travel.aspx',[field]);
  const text=JSON.stringify(inspectCeacPageMetadata());
  assert.ok(!text.includes('user@example.com'));
  assert.ok(!text.includes('AA12345678'));
});
