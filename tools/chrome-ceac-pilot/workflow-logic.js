/* Visa Master · Planificador seguro del recorrido; no persiste respuestas. */
(function(root){
'use strict';
const base=root.VmCeacPilot,P1=base.P1,P2=base.P2;
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const needed={
[P1]:['tbxAPP_SURNAME','tbxAPP_GIVEN_NAME','cbxAPP_FULL_NAME_NATIVE_NA','rblOtherNames_1','rblTelecodeQuestion_1','ddlAPP_GENDER','ddlAPP_MARITAL_STATUS','ddlDOBDay','ddlDOBMonth','tbxDOBYear','tbxAPP_POB_CITY','tbxAPP_POB_ST_PROVINCE','ddlAPP_POB_CNTRY'],
[P2]:['ddlAPP_NATL','tbxAPP_NATIONAL_ID','rblAPP_OTHER_NATL_1','rblAPP_PERM_RESIDENT_1','cbxAPP_TAX_ID_NA']
};
function compatible(action,fields){
const hits=fields.filter(f=>f.id&&f.id.endsWith('_'+action.suffix));
if(hits.length!==1)return {error:'Control no identificado: '+action.label};
const f=hits[0],mode=action.mode;
if(mode==='radioNo')return f.tag==='input'&&f.type==='radio'&&norm(f.optionLabel)==='NO'?{action}:{error:'Opción No no comprobada: '+action.label};
if(mode==='checkboxNA')return f.tag==='input'&&f.type==='checkbox'&&norm(f.optionLabel).startsWith('DOESNOTAPPLY')?{action}:{error:'Casilla No aplica no comprobada: '+action.label};
if(mode==='text')return ['input','textarea'].includes(f.tag)&&!['password','file','hidden'].includes(f.type)?{action}:{error:'Control de texto inesperado: '+action.label};
if(f.tag!=='select'||!Array.isArray(f.options))return {error:'Falta catálogo: '+action.label};
const chosen=mode==='selectCountry'?base.resolveCountryOption(f.options,action.value):null;
const matches=mode==='selectCountry'?(chosen?[chosen]:[]):f.options.filter(o=>{
if(mode==='selectValue')return o.code===action.value;
if(mode==='selectMonth')return norm(o.code).slice(0,3)===norm(action.value)||norm(o.label).slice(0,3)===norm(action.value);
if(action.suffix==='ddlDOBDay')return Number(o.code)===Number(action.value)||Number(o.label)===Number(action.value);
return norm(o.label)===norm(action.value);
});
return matches.length===1?{action:{...action,mode:'selectValue',value:matches[0].code,expectedLabel:matches[0].label}}:{error:'Valor no comprobado en CEAC: '+action.label};
}
function plan(answers,path,fields){
if(![P1,P2].includes(path))return {page:path,actions:[],pending:['Sección sin mapeo aprobado.'],canAdvance:false};
const original=base.buildPlan(answers,path),actions=[],pending=[...original.pending];
for(const act of original.actions){const r=compatible(act,fields);if(r.error)pending.push(r.error);else actions.push(r.action)}
const required=[...needed[path]];
if(path===P2){
if(['TD_CONYUGE','TD_HIJO'].includes(answers.visa_profile))required.push(answers.us_social_security_number_td==='Sí'?'tbxAPP_SSN':'cbxAPP_SSN_NA');
else pending.push('SSN no verificado para este perfil; detener avance automático.');
}
const missing=required.filter(k=>!actions.some(a=>a.suffix===k));
if(missing.length)pending.push('Faltan controles esenciales: '+missing.join(', '));
const blocking=pending.filter(p=>!p.startsWith('Revisa los valores predeterminados')&&!p.startsWith('Las opciones Yes/No'));
return {page:original.page,actions,pending,canAdvance:!blocking.length&&!!actions.length};
}
const api={plan,compatible,P1,P2};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VmCeacAutoLogic=api;
})(typeof globalThis!=='undefined'?globalThis:this);
