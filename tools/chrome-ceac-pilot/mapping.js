/* Visa Master · CEAC piloto v0.3.3 | funciones puras, sin datos persistentes. */
(function (root) {
  'use strict';
  const P1 = '/GenNIV/General/complete/complete_personal.aspx';
  const P2 = '/GenNIV/General/complete/complete_personalcont.aspx';
  const normalize = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const normalizedTokens = s => normalize(s).split(' ').filter(Boolean);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  // Preferencias operativas de Visa Master. Son sugerencias revisables, no hechos
  // sobre el solicitante. Un Sí declarado tiene prioridad y queda pendiente.
  const POLICY_DEFAULTS = Object.freeze({
    nativeAlphabet: 'Does Not Apply',
    telecode: 'No',
    usTaxpayerId: 'Does Not Apply',
  });

  // Águila captura nombres y apellidos en campos separados. También se admiten
  // formularios anteriores donde el nombre completo ya incluye ambos apellidos.
  // Nunca inferir nombres de un apellido incompleto o parcialmente coincidente.
  function extractNames(fullName, firstSurname, secondSurname) {
    const full = normalizedTokens(fullName);
    const first = normalizedTokens(firstSurname);
    const surnames = [...first, ...normalizedTokens(secondSurname)];
    if (!full.length || !first.length) return null;
    const starts = full.length > surnames.length &&
      surnames.every((part, i) => full[i] === part);
    const ends = full.length > surnames.length &&
      surnames.every((part, i) => full[full.length - surnames.length + i] === part);
    let given;
    if (starts !== ends) {
      given = starts ? full.slice(surnames.length) : full.slice(0, -surnames.length);
    } else if (!starts && !ends &&
      full.length <= 3 && // Caso nuevo: solo nombres de pila capturados en Águila.
      !full.some(part => surnames.includes(part))) {
      given = full;
    } else return null;
    return given.length
      ? { given: given.join(' '), surname: surnames.join(' ') } : null;
  }
  // Comparar un país declarado con las opciones REALES de CEAC.
  // No se inventan valores del catálogo ni se selecciona por índice.
  function resolveCountryOption(options, country) {
    const normalized = v => normalize(v).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const wanted = normalized(country);
    if (!wanted || !Array.isArray(options)) return null;
    const mexico = ['MEXICO','MEX','MX'].includes(wanted);
    const englishRegion = /^[A-Z]{2}$/.test(wanted)
      ? new Intl.DisplayNames(['en'], {type:'region'}).of(wanted)
      : null;
    const english = englishRegion ? normalized(englishRegion) : '';
    const candidates = options.filter(option => {
      const label = normalized(option.label);
      const code = normalized(option.code);
      if (!label || !code) return false;
      if (mexico) {
        // CEAC utiliza códigos propios que no siempre son MX o MEX.
        // Aceptar su etiqueta «MEXICO» aun cuando el código difiera,
        // siempre que la opción sea ÚNICA y empiece por el nombre del país.
        return /^(MEXICO|UNITED MEXICAN STATES)(?: |$)/.test(label);
      }
      if (label === wanted || (wanted.length <= 3 && code === wanted)) return true;
      if (english && (label === english ||
          label.startsWith(english + ' (') || label.startsWith(english + ' ,'))) return true;
      if (wanted === 'US' && (label === 'UNITED STATES OF AMERICA' ||
          label === 'UNITED STATES')) return true;
      return false;
    });
    return candidates.length === 1 ? candidates[0] : null;
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
        // No confundir país de nacimiento con idioma/alfabeto. La preferencia
        // operativa es D.N.A. para nombre en alfabeto latino; antes de escribir,
        // comprobar que CEAC expone la casilla y su etiqueta exacta.
        if (answers.native_alphabet_applies === 'Sí')
          pending.push('Nombre en alfabeto nativo: excepción declarada; revisar documento y llenar manualmente.');
        else if (['MEXICANA','MEXICANO','MEXICO'].includes(normalize(answers.nationality)))
          add('cbxAPP_FULL_NAME_NATIVE_NA','Alfabeto nativo: No aplica (predeterminado)','checkboxNA','Does Not Apply');
        else pending.push('Alfabeto nativo: verificar si corresponde No aplica para este solicitante.');

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
      add('ddlAPP_POB_CNTRY','País de nacimiento','selectCountry',normalize(answers.birth_country));
      // Solo marcar NO con respuesta explícita del cliente. Si responde Sí,
      // CEAC despliega datos adicionales, que siguen siendo manuales.
      if (answers.other_names_used === 'No')
        add('rblOtherNames_1','Otros nombres utilizados: No','radioNo','No');
      else pending.push('Otros nombres utilizados: revisar respuesta en Águila y completar manualmente en CEAC.');
      if (!answers.name_telecode || answers.name_telecode === 'No')
        add('rblTelecodeQuestion_1','Telecódigo: No (predeterminado)','radioNo','No');
      else pending.push('Telecódigo: el cliente indicó Sí; capturar su telecódigo en CEAC.');
      pending.push('Revisa los valores predeterminados antes de avanzar: cualquier excepción del cliente tiene prioridad.');
    } else if (path === P2) {
      const nationality = normalize(answers.nationality);
      if (['MEXICANA','MEXICANO','MEXICO','MÉXICO'].includes(nationality))
        add('ddlAPP_NATL','Nacionalidad mexicana','selectCountry','MEXICO');
      else pending.push('Nacionalidad no mexicana: elegir manualmente el país en CEAC.');
      if (answers.curp_confirmada && /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-J]\d$/.test(normalize(answers.curp_valor)))
        add('tbxAPP_NATIONAL_ID','Identificación nacional (CURP confirmada)','text',normalize(answers.curp_valor));
      else pending.push('CURP no confirmada/documentada: completar identificación nacional manualmente.');
      if (answers.other_nationality === 'No')
        add('rblAPP_OTHER_NATL_1','Otra nacionalidad: No (declarado)','radioNo','No');
      else pending.push('Otra nacionalidad: revisar la respuesta y, si es Sí, completar los detalles.');
      if (answers.permanent_resident_other_country === 'No')
        add('rblAPP_PERM_RESIDENT_1','Residencia permanente en otro país: No (declarado)','radioNo','No');
      else pending.push('Residencia permanente: revisar la respuesta y, si es Sí, completar el país.');
      const td = ['TD_CONYUGE','TD_HIJO'].includes(answers.visa_profile);
      if (td && answers.us_social_security_number_td === 'No')
        add('cbxAPP_SSN_NA','SSN estadounidense TD: No aplica (declarado)','checkboxNA','Does Not Apply');
      else if (td && answers.us_social_security_number_td === 'Sí') {
        const ssn = String(answers.us_social_security_number_td_value || '').replace(/[ -]/g,'');
        if (/^\d{9}$/.test(ssn))
          add('tbxAPP_SSN','SSN estadounidense TD (declarado)','text',ssn);
        else pending.push('SSN de TD: falta verificar los nueve dígitos informados por el cliente.');
      } else pending.push('SSN estadounidense: sin declaración TD verificada; revisar si existe número antes de elegir No aplica.');
      // Un ITIN/TIN existente prevalece frente a la preferencia. En esta fase
      // solo hay predeterminado; se valida en revisión humana de cada caso.
      if (answers.us_taxpayer_id_override)
        pending.push('Número fiscal estadounidense: excepción registrada; revisar manualmente en CEAC.');
      else add('cbxAPP_TAX_ID_NA','Número fiscal de EE. UU.: No aplica (predeterminado)','checkboxNA','Does Not Apply');
      pending.push('Las opciones Yes/No y Does Not Apply solo se aplican si CEAC muestra controles inequívocos; los demás quedan pendientes.');
    } else return { page: null, actions: [], pending: ['La página CEAC no corresponde a Datos personales 1 o 2.'] };
    return { page: path === P1 ? 'Datos personales 1' : 'Datos personales 2', path, actions, pending };
  }
  const api = { buildPlan, extractNames, dateParts, resolveCountryOption, P1, P2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VmCeacPilot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
