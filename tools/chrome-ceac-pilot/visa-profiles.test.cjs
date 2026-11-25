const test=require('node:test');
const assert=require('node:assert/strict');
const cfg=require('../../lib/trade-in-motion-config.json');
const sections=cfg.sections;
const all=sections.flatMap(s=>s.fields);
const get=key=>all.find(f=>f.key===key);
const sect=id=>sections.find(s=>s.id===id);

test('formulario distribuido en nueve pasos y sin duplicar preguntas',()=>{
 assert.equal(sections.length,9);
 assert.equal(new Set(all.map(f=>f.key)).size,all.length);
 assert.deepEqual(sections.map(s=>s.id),['personal','travel','history','contact','social','passport','family','work','tn']);
 assert.equal(get('full_name').label.includes('sin apellidos'),true);
});

test('perfil TN mantiene trabajo TN y TD identifica al titular por apellidos y nombres',()=>{
 assert.deepEqual(get('visa_profile').options,['TN','TD_CONYUGE','TD_HIJO','B1/B2']);
 assert.deepEqual(sect('tn').visaProfiles,['TN']);
 assert.deepEqual(get('td_principal_surnames').visaProfiles,['TD_CONYUGE','TD_HIJO']);
 assert.equal(get('td_principal_given_names').required,true);
 assert.equal(sect('work').fields.some(f=>f.key==='tn_profession'),false);
});

test('B1/B2 puede durar menos de 24h sin llenar estancia en direcciones',()=>{
 assert.ok(get('travel_duration_unit').options.includes('Menos de 24 horas'));
 for(const key of ['travel_duration_amount','travel_stay_city','travel_stay_address'])
  assert.equal(get(key).when.notEquals,'Menos de 24 horas');
 assert.equal(get('travel_plans_specific').required,true);
 assert.equal(get('travel_more_than_24h'),undefined);
});

test('acompañantes por grupo y redes solo se abren bajo su condición',()=>{
 assert.equal(get('travel_companions_group').when.equals,'Sí');
 assert.equal(get('travel_companions_group_name').when.equals,'Sí');
 assert.deepEqual(get('social_media_public').visaProfiles,['TN','TD_CONYUGE','TD_HIJO']);
});

test('contacto y redes siguen siendo parte del formulario transferible a Personal del piloto',()=>{
 const personalKeys=sections.filter(s=>['personal','contact','social'].includes(s.id))
  .flatMap(s=>s.fields.map(f=>f.key)).filter(key=>key!=='visa_profile');
 assert.equal(new Set(personalKeys).size,personalKeys.length);
 for(const key of ['curp_valor','full_name','curp_paterno','birth_country','home_street','phone','email','social_media_used','social_instagram'])assert.ok(personalKeys.includes(key));
});
