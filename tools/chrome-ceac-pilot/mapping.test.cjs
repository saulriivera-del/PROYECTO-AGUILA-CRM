/* Ejecutar con: node --test tools/chrome-ceac-pilot/mapping.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, extractNames, dateParts, resolveCountryOption, P1, P2 } = require('./mapping.js');

const data = {
  full_name:'MARIA ELENA LOPEZ GARCIA', curp_paterno:'LOPEZ', curp_materno:'GARCIA',
  curp_sexo:'Mujer', marital_status:'Soltero(a)',birth_date:'1996-08-02',
  birth_city:'Hermosillo',birth_state:'Sonora',birth_country:'México',
  nationality:'Mexicana',curp_valor:'LOGM960802MSRPRR00',curp_confirmada:'Sí, coincide con mi documento',
  other_names_used:'No',name_telecode:'No'
};
// Solo datos sintéticos. Nunca se incluyen folios, claves, correos ni datos reales.
test('extrae nombres solo con coincidencia completa, sin duplicar la pregunta',() => {
  assert.deepEqual(extractNames(data.full_name,'LOPEZ','GARCIA'),
    {given:'MARIA ELENA',surname:'LOPEZ GARCIA'});
  assert.deepEqual(extractNames('LOPEZ GARCIA MARIA ELENA','LOPEZ','GARCIA'),
    {given:'MARIA ELENA',surname:'LOPEZ GARCIA'});
  assert.equal(extractNames('MARIA ELENA RIVERA GARCIA','LOPEZ','GARCIA'),null);
});
test('identifica nombres de pila capturados solos en Águila sin requerir apellidos repetidos',() => {
  assert.deepEqual(extractNames('Ángel Saúl','Rivera','Espinoza'),
    {given:'ANGEL SAUL',surname:'RIVERA ESPINOZA'});
  assert.deepEqual(extractNames('MARIA ELENA','LOPEZ','GARCIA'),
    {given:'MARIA ELENA',surname:'LOPEZ GARCIA'});
  assert.deepEqual(extractNames('LUIS','DEL RIO',''),
    {given:'LUIS',surname:'DEL RIO'});
  const plan = buildPlan({...data,full_name:'Ángel Saúl',curp_paterno:'Rivera',curp_materno:'Espinoza'}, P1);
  assert.equal(plan.actions.length,13);
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_FULL_NAME_NATIVE'&&a.value==='ANGEL SAUL RIVERA ESPINOZA'));
  assert.ok(plan.actions.some(a=>a.suffix==='rblOtherNames_1'&&a.mode==='radioNo'));
  assert.ok(plan.actions.some(a=>a.suffix==='rblTelecodeQuestion_1'&&a.mode==='radioNo'));
  assert.ok(plan.actions.some(a => a.suffix === 'tbxAPP_SURNAME' && a.value === 'RIVERA ESPINOZA'));
  assert.ok(plan.actions.some(a => a.suffix === 'tbxAPP_GIVEN_NAME' && a.value === 'ANGEL SAUL'));
  assert.equal(plan.pending.some(message => message.includes('no se pueden separar')), false);
});
test('mantiene pendiente la separación de nombres si hay apellidos parciales o datos inconsistentes',() => {
  assert.equal(extractNames('ANGEL RIVERA','RIVERA','ESPINOZA'),null);
  assert.equal(extractNames('MARIA ELENA RIVERA GARCIA','LOPEZ','GARCIA'),null);
  assert.equal(extractNames('MARIA ELENA LOPEZ GARCIA','', 'GARCIA'),null);
  assert.equal(extractNames('UNO DOS TRES CUATRO', 'LOPEZ','GARCIA'),null);
  const plan = buildPlan({...data,full_name:'MARIA RIVERA',curp_paterno:'RIVERA',curp_materno:'GARCIA'},P1);
  assert.equal(plan.actions.some(a=>a.suffix==='tbxAPP_SURNAME'),false);
  assert.ok(plan.pending.some(message=>message.includes('Comprobar manualmente nombres y apellidos')));
});
test('rechaza fechas imposibles y con formatos ambiguos',() => {
  assert.equal(dateParts('2026-02-30'),null);
  assert.equal(dateParts('02/08/1996'),null);
  assert.deepEqual(dateParts('1996-08-02'),{year:'1996',month:'AUG',day:'02'});
});
test('página 1 solo propone controles CEAC conocidos',() => {
  const plan=buildPlan(data,P1);
  assert.equal(plan.actions.length,13);
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_GIVEN_NAME'&&a.value==='MARIA ELENA'));
  assert.ok(plan.actions.some(a=>a.suffix==='ddlDOBMonth'&&a.value==='AUG'));
  assert.equal(plan.actions.some(a=>a.suffix.includes('FULL_NAME_NATIVE_NA')),false);
});
test('página 2 prepara nacionalidad y CURP solo tras confirmación',() => {
  const plan=buildPlan(data,P2);
  assert.ok(plan.actions.some(a=>a.suffix==='ddlAPP_NATL'&&a.value==='MEXICO'));
  // La CURP sintética tiene estructura válida, pero no es un dato RENAPO.
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_NATIONAL_ID'));
  assert.equal(plan.actions.some(a=>a.suffix.includes('SSN')),false);
  assert.equal(plan.actions.some(a=>a.suffix.startsWith('rbl')),false);
  assert.equal(buildPlan({...data,curp_confirmada:''},P2).actions.some(a=>a.suffix==='tbxAPP_NATIONAL_ID'),false);
});
test('pantalla CEAC desconocida bloquea todo',() => {
  assert.equal(buildPlan(data,'/GenNIV/General/complete/other.aspx').actions.length,0);
});
test('unión libre y nombres ambiguos quedan para revisión manual',() => {
  const plan=buildPlan({...data,marital_status:'Unión libre',full_name:'MARIA GARCIA'},P1);
  assert.equal(plan.actions.some(a=>a.suffix==='ddlAPP_MARITAL_STATUS'),false);
  assert.equal(plan.actions.some(a=>a.suffix==='tbxAPP_SURNAME'),false);
  assert.ok(plan.pending.length>0);
});


test('país de nacimiento: elige la opción real de CEAC y nunca deduce un código ausente',() => {
  const options=[
    {code:'',label:'- SELECT ONE -'},
    {code:'MEX',label:'MEXICO (UNITED MEXICAN STATES)'},
    {code:'USA',label:'UNITED STATES OF AMERICA'},
  ];
  assert.deepEqual(resolveCountryOption(options,'México'),options[1]);
  assert.deepEqual(resolveCountryOption(options,'mexico'),options[1]);
  assert.deepEqual(resolveCountryOption(options,'MEX'),options[1]);
  assert.deepEqual(resolveCountryOption(options,'United States of America'),options[2]);
  assert.equal(resolveCountryOption(options,'Guatemala'),null);
  assert.equal(resolveCountryOption([...options,{code:'MX',label:'MEXICO'}],'MEXICO'),null);
  assert.equal(resolveCountryOption([{code:'NM',label:'NEW MEXICO'}],'México'),null);
});

test('país de nacimiento: México se identifica con código propio de CEAC y código MX de Águila',() => {
  const options = [
    {code:'',label:'- SELECT ONE -'},
    {code:'Q_MEX1',label:'MEXICO (UNITED MEXICAN STATES)'},
    {code:'NM',label:'NEW MEXICO'}
  ];
  assert.deepEqual(resolveCountryOption(options,'MX'),options[1]);
  assert.deepEqual(resolveCountryOption(options,'México'),options[1]);
  assert.equal(resolveCountryOption([{code:'NM',label:'NEW MEXICO'}],'MX'),null);
  assert.equal(resolveCountryOption([...options,{code:'MEX2',label:'MEXICO'}],'MX'),null);
  const plan = buildPlan({...data,birth_country:'MX'},P1);
  assert.ok(plan.actions.some(a=>a.suffix==='ddlAPP_POB_CNTRY'&&a.value==='MX'));
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_FULL_NAME_NATIVE'&&a.value==='MARIA ELENA LOPEZ GARCIA'));
});

test('ISO US se compara de forma inequívoca con catálogo CEAC',() => {
  const options=[
    {code:'USA',label:'UNITED STATES OF AMERICA'},
    {code:'UM',label:'U.S. MINOR OUTLYING ISLANDS'},
    {code:'CA',label:'CANADA'}
  ];
  assert.deepEqual(resolveCountryOption(options,'US'),options[0]);
  assert.deepEqual(resolveCountryOption(options,'CA'),options[2]);
});

test('Nunca responde No de otros nombres o telecódigo por omisión',() => {
  const noResponses=buildPlan({...data,other_names_used:'No',name_telecode:'No'},P1);
  assert.equal(noResponses.actions.filter(a=>a.mode==='radioNo').length,2);
  const unknown=buildPlan({...data,other_names_used:'',name_telecode:''},P1);
  assert.equal(unknown.actions.some(a=>a.mode==='radioNo'),false);
  const yes=buildPlan({...data,other_names_used:'Sí',name_telecode:'Sí'},P1);
  assert.equal(yes.actions.some(a=>a.mode==='radioNo'),false);
  assert.ok(yes.pending.some(a=>a.includes('Otros nombres utilizados')));
});

test('Nombre nativo concatena nombres de pila y ambos apellidos solo en caso mexicano',() => {
  const plan=buildPlan({...data, full_name:'Mariana',curp_paterno:'Bustamante',curp_materno:'Baca',birth_country:'mexico'},P1);
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_FULL_NAME_NATIVE'&&a.value==='MARIANA BUSTAMANTE BACA'));
  assert.ok(plan.actions.some(a=>a.suffix==='ddlAPP_POB_CNTRY'&&a.mode==='selectCountry'&&a.value==='MEXICO'));
  const otherAlphabet=buildPlan({...data,birth_country:'Japan'},P1);
  assert.equal(otherAlphabet.actions.some(a=>a.suffix==='tbxAPP_FULL_NAME_NATIVE'),false);
});
