/* Visa Master · CEAC piloto v0.2 | funciones puras, sin datos persistentes. */
(function (root) {
  'use strict';
  const P1 = '/GenNIV/General/complete/complete_personal.aspx';
  const P2 = '/GenNIV/General/complete/complete_personalcont.aspx';
  const normalize = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const normalizedTokens = s => normalize(s).split(' ').filter(Boolean);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function extractNames(fullName, firstSurname, secondSurname) {
    const full = normalizedTokens(fullName);
    const surnames = normalizedTokens([firstSurname, secondSurname].filter(Boolean).join(' '));
    if (full.length <= surnames.length || surnames.length === 0) return null;
    const starts = surnames.every((s,i) => full[i] === s);
    const ends = surnames.every((s,i) => full[full.length-surnames.length+i] === s);
    if (starts === ends) return null; // Ambiguo o no coincide: requiere revisión manual.
    const names = starts ? full.slice(surnames.length) : full.slice(0,-surnames.length);
    return names.length ? { given: names.join(' '), surname: surnames.join(' ') } : null;
  }
  function dateParts(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const parsed = new Date(date + 'T00:00:00Z');
    if (Number.isNaN(+parsed) || parsed.toISOString().slice(0,10) !== date) return null;
    const [year,month,day] = date.split('-');
    return { year, month: months[Number(month)-1], day };
  }
  function buildPlan(answers, path) {
    const actions = [], pending = [];
    const add = (suffix, label, mode, value) => {
      if (value !== undefined && value !== null && String(value).trim())
        actions.push({ suffix, label, mode, value: String(value).trim() });
    };
    if (path === P1) {
      const names = extractNames(answers.full_name, answers.curp_paterno, answers.curp_materno);
      if (names) {
        add('tbxAPP_SURNAME', 'Apellidos', 'text', names.surname);
        add('tbxAPP_GIVEN_NAME', 'Nombre(s)', 'text', names.given);
      } else pending.push('Comprobar manualmente nombres y apellidos del pasaporte: no se pueden separar con certeza.');
      const gender = { 'Hombre':'M', 'Mujer':'F' }[answers.curp_sexo];
      if (gender) add('ddlAPP_GENDER','Sexo','selectValue',gender);
      else pending.push('Falta sexo para CEAC.');
      const civil = { 'Soltero(a)':'S','Casado(a)':'M','Divorciado(a)':'D','Viudo(a)':'W' }[answers.marital_status];
      if (civil) add('ddlAPP_MARITAL_STATUS','Estado civil','selectValue',civil);
      else pending.push('Estado civil requiere revisión manual en CEAC (p. ej. unión libre o separación).');
      const date = dateParts(answers.birth_date);
      if (date) {
        add('ddlDOBDay','Día de nacimiento','selectText',date.day);
        add('ddlDOBMonth','Mes de nacimiento','selectMonth',date.month);
        add('tbxDOBYear','Año de nacimiento','text',date.year);
      } else pending.push('Fecha de nacimiento pendiente o inválida.');
      add('tbxAPP_POB_CITY','Ciudad de nacimiento','text',normalize(answers.birth_city));
      const state = answers.birth_state === 'Fuera de México / otro estado o provincia'
        ? answers.birth_state_other : answers.birth_state;
      add('tbxAPP_POB_ST_PROVINCE','Estado de nacimiento','text',normalize(state));
      add('ddlAPP_POB_CNTRY','País de nacimiento','selectText',normalize(answers.birth_country));
      pending.push('Nombre en alfabeto nativo, otros nombres, telecódigo y casillas «No aplica»: revisar en CEAC.');
    } else if (path === P2) {
      const nationality = normalize(answers.nationality);
      if (['MEXICANA','MEXICANO','MEXICO','MÉXICO'].includes(nationality))
        add('ddlAPP_NATL','Nacionalidad mexicana','selectText','MEXICO');
      else pending.push('Nacionalidad no mexicana: elegir manualmente el país en CEAC.');
      if (answers.curp_confirmada && /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-J]\d$/.test(normalize(answers.curp_valor)))
        add('tbxAPP_NATIONAL_ID','Identificación nacional (CURP confirmada)','text',normalize(answers.curp_valor));
      else pending.push('CURP no confirmada/documentada: completar identificación nacional manualmente.');
      pending.push('Otra nacionalidad, residencia permanente, SSN y número fiscal de EE. UU.: verificar y responder en CEAC; no se marca «No» ni «No aplica» por suposición.');
    } else return { page: null, actions: [], pending: ['La página CEAC no corresponde a Datos personales 1 o 2.'] };
    return { page: path === P1 ? 'Datos personales 1' : 'Datos personales 2', path, actions, pending };
  }
  const api = { buildPlan, extractNames, dateParts, P1, P2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VmCeacPilot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
