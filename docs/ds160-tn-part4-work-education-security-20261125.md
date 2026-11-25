# DS-160 TN — Recorrido visual, parte 4: trabajo, estudios y seguridad

**Fecha de revisión:** 25 de noviembre de 2026. **Fuente:** video de aproximadamente 136 segundos enviado para continuar el mapeo TN. **Conservar solamente estructura textual**: preguntas, opciones visibles, bifurcaciones y rutas. No subir ni transcribir datos personales, empleo real, instituciones concretas, identificadores de solicitud, números, direcciones, respuestas usadas en el ensayo, audio, video ni fotogramas.

**Alcance y certeza:** inspección visual, **no del DOM**. Se observan cambios manuales de opciones y navegación entre varias pantallas; algunas selecciones son deliberadamente exploratorias y no deben reutilizarse como respuestas del solicitante. **Los IDs, códigos CEAC de cada opción, obligatoriedad y todas las ramas requieren la inspección Chrome**. Esta grabación termina dentro de *Security and Background: Part 2*; no demuestra que las cinco partes de Seguridad estén mapeadas.

Continuación de:
- `docs/ds160-tn-part1-to-passport-20261125.md`
- `docs/ds160-tn-part2-contact-family-work-start-20261125.md`
- `docs/ds160-tn-part3-work-temporary-visa-20261125.md`

## 1. Present Work/Education/Training Information

**Ruta observada:** `/GenNIV/General/complete/complete_workeducation1.aspx`.

- `Primary Occupation`: lista desplegable. Se exploran varias clases de ocupación; en la grabación se distinguen, entre otras, `BUSINESS`, `OTHER` y categorías de profesión, estudiante, jubilación y no empleo. **No se transcribe un catálogo exhaustivo**, pues varias etiquetas no son plenamente legibles.
- Cuando se selecciona `OTHER`, se observa un campo `Specify Other` para describir la ocupación: **rama condicional visible**.
- Para ramas laborales en que se muestra: `Present Employer or School Name`; domicilio (`Street Address Line 1`, `Line 2 Optional`, `City`, `State/Province` con `Does Not Apply`, `Postal Zone/ZIP Code` con `Does Not Apply`, `Phone Number`, `Country/Region`); `Start Date`; `Monthly Income in Local Currency (if employed)`; `Briefly describe your duties`.
- La grabación alterna varias ocupaciones con diferencias en los controles visibles. **No afirmar** que todas exigen los mismos datos sin verificar cada rama.

**Águila:** actualmente tiene `job_title`, `employer`, dirección, `job_start`, `monthly_income`. Hacen falta catálogo `primary_occupation`, `primary_occupation_other` y un campo específico para `current_job_duties`, con condiciones verificadas. El `tn_employer` estadounidense y el sueldo **mensual en USD** de la pantalla *Temporary Work Visa Information* son **distintos** del empleo actual y salario en moneda local.

## 2. Previous Work/Education/Training Information

**Ruta observada:** `/GenNIV/General/complete/complete_workeducation2.aspx`.

- `Were you previously employed?` → `Yes/No`.
- Para `Yes`, aparece una sección de empleador anterior con **nombre, domicilio, país, teléfono, puesto/cargo (`Job Title`), apellidos y nombres del supervisor** (cada uno con posibilidad `Do Not Know` donde aparece), fechas `Employment Date From` y `Employment Date To`, y `Briefly describe your duties`. Los controles de antecedentes laborales están concebidos para añadirse/repetirse según el formulario.
- `Have you attended any educational institutions at a secondary level or above?` → `Yes/No`.
- Para `Yes`, se observa bloque de institución educativa: `Name of Institution`, domicilio (dos líneas, ciudad, estado/provincia, código postal, país), `Course of Study`, `Date of Attendance From`, `Date of Attendance To`, y opciones `Add Another`/`Remove`.

**Águila:** captura un solo conjunto `previous_employer_*` y un solo `school_*`; no diferencia todos los datos de supervisor ni deberes de empleos anteriores, ni admite claramente una lista repetible de **todos los registros aplicables**. La respuesta sobre estudios secundarios o superiores debe ser explícita; no inferir `No` por `education_level` vacío.

## 3. Additional Work/Education/Training Information

**Ruta observada:** `/GenNIV/General/complete/complete_workeducation3.aspx`.

Preguntas visibles (no se transcriben respuestas usadas durante la prueba):

- `Do you belong to a clan or tribe?` → Yes/No.
- `Provide a List of Languages You Speak` → lista de idiomas, con `Add Another`/`Remove`.
- `Have you traveled to any countries/regions within the last five years?` → Yes/No; la grabación muestra un bloque repetible para países/regiones cuando la rama correspondiente se activa.
- `Have you belonged to, contributed to, or worked for any professional, social, or charitable organization?` → Yes/No.
- `Do you have any specialized skills or training, such as firearms, explosives, nuclear, biological, or chemical experience?` → Yes/No.
- `Have you ever served in the military?` → Yes/No.
- `Have you ever served in, been a member of, or been involved with a paramilitary unit, vigilante unit, rebel group, guerrilla group, or insurgent organization?` → Yes/No.

**Águila:** estas preguntas y listas repetibles no están identificadas como un bloque completo y equivalente en el cuestionario actual; diseñar nuevas claves por pregunta y condiciones verificadas. **Nunca contestar No por omisión**, ni inferir respuestas a partir de profesión, nacionalidad o tipo TN.

## 4. Security and Background: Part 1

**Ruta observada:** `/GenNIV/General/complete/complete_securityandbackground1.aspx`.

Tres preguntas con `Yes/No` se ven en pantalla:
1. Enfermedad transmisible de importancia para la salud pública (*communicable disease of public health significance*).
2. Trastorno mental o físico que represente o pueda representar un riesgo para la seguridad o el bienestar propio o de otras personas.
3. Abuso o dependencia de drogas en el presente o en el pasado.

**Águila:** falta un bloque de antecedentes y seguridad revisado para el DS-160. Capturar cada respuesta **exactamente como la declare el solicitante** y permitir explicación/validación cuando CEAC la solicite. No completar de oficio ni traducir estas preguntas de forma que cambie el significado jurídico.

## 5. Security and Background: Part 2 (inicio)

**Ruta observada:** `/GenNIV/General/complete/complete_securityandbackground2.aspx`.

Se alcanza a ver el comienzo de un conjunto de preguntas `Yes/No` sobre:
- Arresto o condena por delito, incluidos perdones, amnistías u otras medidas similares.
- Violaciones o conspiración relacionadas con sustancias controladas.
- Prostitución, servicios sexuales comerciales y actividades relacionadas.
- Lavado de dinero.
- Trata de personas (se ve inicio de esta pregunta, no todo el bloque).

**Importante:** no consta el final de esta pantalla ni las partes 3, 4 y 5. **No marcar esta sección como completa**. Algunas preguntas podrían desplegar `Explain` ante una respuesta afirmativa; en este video no quedaron verificadas todas esas ramas. Evitar campos `No` predeterminados.

## 6. Páginas revisitadas durante pruebas

Se observa que el operador regresa a `Personal Information 1`, `Travel Information` y `Travel Companions` para variar selecciones antes de continuar. Estos movimientos **no constituyen una prueba adicional de los códigos CEAC ni de nuevas reglas**, ni demuestran que una clase de visa distinta de TN tenga exactamente los mismos campos.

## Prioridades de implementación tras completar el recorrido

1. **Trabajo actual:** catálogo de ocupación, respuesta `OTHER` → `Specify Other`, descripción de funciones, condiciones de campos según categoría.
2. **Trabajos anteriores:** antecedentes repetibles, supervisor por nombre/apellido, fechas y deberes.
3. **Educación:** estudios secundarios o superiores, instituciones repetibles, programas y periodos.
4. **Información adicional:** idiomas, viajes últimos cinco años, organizaciones, capacidades especializadas y antecedentes militares.
5. **Seguridad:** preguntas individuales fieles al texto CEAC y ramas de explicación verificadas; separar las cinco partes.
6. Confirmar rutas, IDs y valores internos con inspector Chrome, y revisar todo con personal autorizado antes de preparar autollenado. **No incorporar respuestas de prueba a expedientes reales.**

**Estado:** parte 4 observada visualmente, con Seguridad 2 incompleta y Seguridad 3–5 pendientes. No se modificó el formulario público ni se habilitó autollenado de estas páginas.
