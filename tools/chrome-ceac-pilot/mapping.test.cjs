/* Ejecutar con: node --test tools/chrome-ceac-pilot/mapping.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, extractNames, dateParts, P1, P2 } = require('./mapping.js');

const data = {
  full_name:'MARIA ELENA LOPEZ GARCIA', curp_paterno:'LOPEZ', curp_materno:'GARCIA',
  curp_sexo:'Mujer', marital_status:'Soltero(a)',birth_date:'1996-08-02',
  birth_city:'Hermosillo',birth_state:'Sonora',birth_country:'México',
  nationality:'Mexicana',curp_valor:'LOGM960802MSRPRR00',curp_confirmada:'Sí, coincide con mi documento'
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
  assert.equal(plan.actions.length,10);
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
  assert.equal(plan.actions.length,10);
  assert.ok(plan.actions.some(a=>a.suffix==='tbxAPP_GIVEN_NAME'&&a.value==='MARIA ELENA'));
  assert.ok(plan.actions.some(a=>a.suffix==='ddlDOBMonth'&&a.value==='AUG'));
  assert.equal(plan.actions.some(a=>a.suffix.includes('FULL_NAME_NATIVE')),false);
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
