const test=require('node:test');
const assert=require('node:assert/strict');
const {compareInspections,PROFILES}=require('./inspector-diff.js');

const path='/GenNIV/General/complete/complete_travel.aspx';
const field=(id,label,type='text',options)=>({id,tag:type==='select'?'select':'input',type,label,name:id,options});
const report=(fields,page=path)=>({
  schema:'vm-ceac-page-structure-v1',path:page,pageKey:page.split('/').pop(),
  visibleFieldCount:fields.length,fields,safety:'METADATA_ONLY_NO_CURRENT_VALUES_NO_WRITES'
});
const before=report([field('moreThan24h','¿Permanecerá más de 24 horas?','radio')]);
const after=report([
  field('moreThan24h','¿Permanecerá más de 24 horas?','radio'),
  field('arrivalStreet','Dirección en EE. UU.'),
  field('arrivalCity','Ciudad de llegada')
]);

test('tres perfiles se comparan sin mezclar sus ramas',()=>{
  assert.deepEqual(PROFILES,['TN','TD','B1/B2']);
  for(const profile of PROFILES) {
    const diff=compareInspections(before,after,profile,'Permanencia > 24 h = Sí');
    assert.equal(diff.profile,profile);
    assert.equal(diff.pageKey,'complete_travel.aspx');
    assert.equal(diff.added.length,2);
    assert.equal(diff.removed.length,0);
    assert.equal(diff.operatorBranch,'Permanencia > 24 h = Sí');
    assert.ok(diff.added.some(f=>f.id==='arrivalStreet'));
    assert.equal(diff.noChanges,false);
    assert.equal(JSON.stringify(diff).includes('selectedValue'),false);
  }
});

test('detecta campos desaparecidos al activar No y no confunde páginas',()=>{
  const diff=compareInspections(after,before,'TD','Permanencia > 24 h = No');
  assert.equal(diff.added.length,0);
  assert.equal(diff.removed.length,2);
  assert.throws(()=>compareInspections(before,report([], '/GenNIV/General/complete/complete_passport.aspx'),'TN'),/páginas distintas/);
});

test('detecta cambios en opciones sin leer selección del control',()=>{
  const options1=report([field('visaClass','Clase de visa','select',[{code:'B',label:'B1/B2'}])]);
  const options2=report([field('visaClass','Clase de visa','select',[{code:'TN',label:'TN'}])]);
  const diff=compareInspections(options1,options2,'TN');
  assert.equal(diff.changed.length,1);
  assert.deepEqual(diff.changed[0].options.added,[{code:'TN',label:'TN'}]);
  assert.deepEqual(diff.changed[0].options.removed,[{code:'B',label:'B1/B2'}]);
});

test('no asume cambios si la pantalla sigue igual y rechaza perfil inválido',()=>{
  assert.equal(compareInspections(before,before,'B1/B2').noChanges,true);
  assert.throws(()=>compareInspections(before,before,'H2B'),/visa no permitido/);
});

test('rechaza duplicados, que podrían confundir qué campo apareció',()=>{
  assert.throws(()=>compareInspections(report([field('x','A'),field('x','B')]),before,'TN'),/identidad única/);
});
