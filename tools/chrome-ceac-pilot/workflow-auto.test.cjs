/* node --test tools/chrome-ceac-pilot/workflow-auto.test.cjs */
const t=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.VmCeacPilot=require('./mapping.js');
const {plan,P1,P2}=require('./workflow-logic.js');
const example={
  visa_profile:'TD_CONYUGE',full_name:'ANA MARIA',curp_paterno:'LOPEZ',curp_materno:'GARCIA',
  curp_sexo:'Mujer',marital_status:'Soltero(a)',birth_date:'1990-02-11',birth_city:'Hermosillo',
  birth_state:'Sonora',birth_country:'MX',nationality:'Mexicana',other_names_used:'No',
  other_nationality:'No',permanent_resident_other_country:'No',
  us_social_security_number_td:'No',curp_confirmada:'Sí, coincide con mi documento',
  curp_valor:'LOGM960802MSRPRR00'
};
const mockField=a=>({
  id:'ctl00_'+a.suffix,tag:a.mode==='text'?'input':(['radioNo','checkboxNA'].includes(a.mode)?'input':'select'),
  type:a.mode==='radioNo'?'radio':a.mode==='checkboxNA'?'checkbox':'text',
  optionLabel:a.mode==='radioNo'?'No':a.mode==='checkboxNA'?'Does Not Apply':undefined,
  options:a.mode.startsWith('select')?[{code:a.mode==='selectCountry'?'MEX':a.value,
    label:a.mode==='selectCountry'?'MEXICO (UNITED MEXICAN STATES)':a.value}]:undefined
});
const fields=p=>globalThis.VmCeacPilot.buildPlan(example,p).actions.map(mockField);

t('Personal 1 y 2: autollenado solo si están verificados los controles',()=>{
  assert.equal(plan(example,P1,fields(P1)).canAdvance,true);
  assert.equal(plan(example,P2,fields(P2)).canAdvance,true);
  assert.equal(plan(example,P1,fields(P1).slice(1)).canAdvance,false);
  assert.equal(plan(example,'/GenNIV/General/complete/complete_travel.aspx',[]).canAdvance,false);
});
t('Pausa ante doble nacionalidad y ante SSN desconocido',()=>{
  assert.equal(plan({...example,other_nationality:'Sí'},P2,fields(P2)).canAdvance,false);
  assert.equal(plan({...example,us_social_security_number_td:''},P2,fields(P2)).canAdvance,false);
  assert.equal(plan({...example,visa_profile:'TN'},P2,fields(P2)).canAdvance,false);
});
t('No acepta casilla No aplica sin etiqueta exacta',()=>{
  const f=fields(P1).map(x=>({...x,optionLabel:x.type==='checkbox'?'Random':x.optionLabel}));
  assert.equal(plan(example,P1,f).canAdvance,false);
});
function nextProbe(page,buttons){
  const worker=fs.readFileSync(path.join(__dirname,'workflow-background.js'),'utf8');
  const fakeChrome={runtime:{onMessage:{addListener(){}}},tabs:{
    onUpdated:{addListener(){}},onRemoved:{addListener(){}}}};
  const context={chrome:fakeChrome,importScripts(){},
    VmCeacAutoLogic:{P1,P2},location:{protocol:'https:',hostname:'ceac.state.gov',pathname:page},
    document:{querySelectorAll(){return buttons}},
    getComputedStyle(){return {visibility:'visible'}}};
  vm.runInNewContext(worker,context,{filename:'workflow-background.js'});
  return context.clickNext({path:page});
}
function btn(text){return {value:text,disabled:false,getClientRects(){return [1]},
  click(){this.clicked=true},getAttribute(){return ''}}}
t('El botón Next no pulsa jamás Sign Application',()=>{
  const next=btn('Next'),sign=btn('Sign Application');
  assert.equal(nextProbe(P1,[next,sign]).clicked,true);
  assert.equal(next.clicked,true);
  assert.equal(sign.clicked,undefined);
});
t('No avanza si hay dos botones Next ni en pantalla de firma',()=>{
  const a=btn('Next'),b=btn('Next');
  assert.equal(nextProbe(P1,[a,b]).clicked,false);
  assert.equal(a.clicked,undefined);
  assert.equal(nextProbe('/GenNIV/General/complete/complete_sign.aspx',[btn('Next')]).clicked,false);
});
t('La extensión registra un service worker para mantener el recorrido',()=>{
  const m=require('./manifest.json');
  assert.equal(m.background.service_worker,'workflow-background.js');
  assert.equal(m.version,'0.5.0');
  assert.ok(m.permissions.includes('activeTab'));
});
