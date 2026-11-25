# DS-160 · TN · Trabajo actual y Temporary Work Visa Information

**Fecha de revisión:** 25 de noviembre de 2026. **Fuente:** video de 44 segundos más fotografía de la pantalla de visa de trabajo, compartidos para mapeo. Este informe contiene únicamente **preguntas, rutas, catálogos visibles y condiciones**. No se guardan ni reproducen nombres, Application ID, teléfonos, direcciones, salarios reales, respuestas personales, archivos de video, audio o capturas.

**Estado:** observación visual, no inspección de DOM. Los identificadores de controles, valores internos de selectores, condiciones completas y validez del autollenado siguen pendientes de verificación con el inspector de Chrome.

## A. Present Work/Education/Training Information

**Ruta visible:** `/GenNIV/General/complete/complete_workeducation1.aspx`.

### Campos observados

- `Primary Occupation` (selector).
- En rama de empleo/negocio observada: `Present Employer or School Name`.
- `Present employer or school address`: `Street Address (Line 1)`, `Street Address (Line 2) *Optional*`, `City`, `State/Province` (con `Does Not Apply`), `Postal Zone/ZIP Code` (con `Does Not Apply`), `Phone Number`, `Country/Region`.
- `Start Date` (día/mes/año).
- `Monthly Income in Local Currency (if employed)` y opción `Does Not Apply`.
- `Briefly describe your duties` (texto libre).
- Se observa además `List of Degrees, Licenses, or Alternative Credentials for Your Profession` (campo de texto). **Verificar si solo aparece por la categoría TN u otra combinación** antes de tratarlo como obligatorio de una visa determinada.

### Catálogo `Primary Occupation` leído en parte

Opciones visibles en pantalla (sin garantizar lista completa): `AGRICULTURE`, `ARTIST/PERFORMER`, `BUSINESS`, `COMMUNICATIONS`, `COMPUTER SCIENCE`, `CULINARY/FOOD SERVICES`, `EDUCATION`, `ENGINEERING`, `GOVERNMENT`, `HOMEMAKER`, `LEGAL PROFESSION`, `MEDICAL/HEALTH`, `MILITARY`, `NATURAL SCIENCE`, `NOT EMPLOYED`, `PHYSICAL SCIENCES`, `RELIGIOUS VOCATION`, `RESEARCH`. No se enumeran opciones fuera de lo visible.

**Correspondencia actual con Águila:** `employer`, `employer_*`, `job_title`, `job_start`, `monthly_income`, `tn_qualifications`; **faltan o requieren mapeo adicional** `Primary Occupation` (catálogo CEAC), descripción de funciones en campo explícito y distinción entre credenciales profesionales y funciones laborales. Los datos de empleo actual no necesariamente son los del empleador estadounidense patrocinador TN.

## B. Temporary Work Visa Information (pantalla aportada en fotografía)

**Pantalla observada:** `Temporary Work Visa Information` con nota sobre trabajo en EE. UU.; rama presentada tras elegir un motivo de viaje laboral. La **ruta completa** y códigos de controles no son legibles en la fotografía: documentarlos con inspector.

Pregunta principal `Where Do You Intend to Work?`:

- `Name of Employer`
- `U.S. Street Address (Line 1)`
- `U.S. Street Address (Line 2) *Optional*`
- `City`
- `State` (selector)
- `ZIP Code (if known)`
- `Phone Number`
- `Enter Monthly Income (in USD)`

**Diferencia crítica:** el ingreso mensual en **moneda local** del trabajo actual y el ingreso mensual en **USD** en `Temporary Work Visa Information` son **campos distintos**; no se debe copiar automáticamente uno al otro ni calcular una conversión sin información validada del contrato y periodo salarial.

**Correspondencia posible Águila, pendiente de aprobación:** `tn_employer`, `tn_employer_street`, `tn_employer_city`, `tn_employer_state`, `tn_employer_postal`, `tn_employer_phone`, `tn_salary` y `tn_salary_period`. El DS-160 solicita específicamente ingreso *mensual* en USD en esta pantalla; si la carta TN usa salario anual u otra periodicidad, cualquier cálculo debe validarse por Mariana antes de proponerlo. No inferir el domicilio del centro de trabajo como domicilio del empleador si son distintos.

**Confirmación posterior de ruta:** una captura posterior identifica la página `Temporary Work Visa Information` como `/GenNIV/General/complete/complete_temporarywork.aspx`. Se documenta también en `docs/ds160-tn-part5-security1to5-20261125.md`; este dato resuelve la ruta que quedaba pendiente aquí. **Todavía faltan los selectores DOM y códigos internos.**

## C. Otras pantallas que reaparecen en la grabación

La grabación navega manualmente a páginas previamente observadas: `Personal Information 1`, `Travel Information` (se ve un catálogo de propósitos, incluida categoría TN/TD y selección B visitante), `Travel Companions Information` y `Family Information`. Se observa el cambio de selección manual en `Primary Occupation`. **No se crean nuevas reglas** a partir de los valores elegidos durante la prueba, ni se entiende como prueba exhaustiva de los catálogos.

## Siguientes pasos de mapeo

1. Con la extensión inspeccionar la ruta **Temporary Work Visa Information**, verificando el sufijo/URL y las opciones de `State`.
2. Capturar ramas del catálogo `Primary Occupation`: demostrar cuándo se muestra el campo de licencias/títulos profesionales.
3. Confrontar el salario del empleador mexicano/actual con salario propuesto de TN y su unidad (`tn_salary_period`). No reutilizar valor automático.
4. Completar `Previous Work/Education`, `Additional Work/Education`, `Security and Background` y demás pantallas que aún falten.
5. Mantener las observaciones por escrito; no subir ni conservar multimedia de la sesión en GitHub o el CRM. La grabación original adjunta en ChatGPT puede seguir retenida por la plataforma hasta que el usuario la elimine.
