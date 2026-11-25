# Visa Master · Matriz de preguntas condicionales TN / TD / B1-B2

**Estado:** plantilla de trabajo, no equivalencia certificada con CEAC. La evidencia se levantará de las pantallas reales de CEAC con solicitudes ficticias. El operador cambia opciones manualmente; la extensión **solo compara metadatos** de los controles visibles.

## Procedimiento de detección

1. En la extensión Chrome v0.4.1 elige el perfil **TN**, **TD** o **B1/B2**.
2. En CEAC, abre una pantalla y pulsa **Guardar estructura ANTES**.
3. Vuelve a CEAC y cambia **una sola respuesta** de prueba (p. ej. una opción Sí/No o el motivo del viaje). No firmes ni envíes.
4. Abre de nuevo la extensión, escribe qué cambiaste (p. ej. `Más de 24 horas = Sí`) y pulsa **Comparar DESPUÉS**.
5. Copia la diferencia. Registra página, perfil, respuesta activadora, controles nuevos/desaparecidos/opciones modificadas e instrucciones visibles.
6. Repite para la otra opción, para cada rama condicional relevante y para los otros dos perfiles. Si la respuesta recarga CEAC o cambia de URL, comienza una captura nueva en la pantalla resultante; la herramienta no compara rutas distintas.
7. Relaciona el hallazgo con el formulario de Águila en español. Conserva por separado la fuente CEAC observada y las reglas internas de Visa Master. Nunca completar datos faltantes por suposición.

## Identidad independiente de cada rama

| Clave | Descripción |
|---|---|
| `profile` | `TN`, `TD` o `B1/B2` |
| `path` | Ruta completa de la pantalla oficial |
| `operatorBranch` | Condición que activó el operador (solo nota, nunca respuesta personal) |
| `added` | Controles que aparecen después |
| `removed` | Controles que desaparecen después |
| `changed` | Etiquetas, tipos u opciones que cambian dentro del mismo control |
| `aguilaKey` | Campo equivalente en Águila, cuando está verificado |
| `clientHelp` | Texto en español que explique qué hacer o qué documento consultar |
| `evidence` | Registro de inspección y revisión humana |
| `status` | Pendiente, observado, codificado, probado, aprobado |

## Primeras ramas a investigar (hipótesis, no campos CEAC confirmados)

| Perfil | Tema | Alternativas para inspeccionar | Qué verificar |
|---|---|---|---|
| TN / TD / B1-B2 | Motivo del viaje y clase de visa | TN / TD / B1-B2 | Qué bloques nuevos aparecen según la clasificación seleccionada |
| TN / TD / B1-B2 | Plan de viaje / duración | Respuestas sobre itinerario, duración, estancia y dirección | Cuándo solicita ciudad, domicilio, persona o alojamiento en EE. UU. |
| TN / TD / B1-B2 | Viajar acompañado | Sí / No | Datos y parentesco exigidos al mostrar acompañantes |
| TN / TD / B1-B2 | Visitas anteriores | Sí / No | Fechas, duración, visas previas y ramas adicionales |
| TN / TD / B1-B2 | Visas rechazadas o incidentes migratorios | Sí / No | Enunciado exacto y explicaciones adicionales; no asumir respuestas |
| TD | Vinculación con titular TN | Dependencia/familiar | Identificación y datos específicos que pida CEAC; verificar con pantalla real |
| TN | Trabajo en EE. UU. | Empleador / cargo / contacto | Bloques específicos y textos de ayuda a partir de CEAC real |
| B1/B2 | Negocios y/o turismo | Motivos y pagador | Distinciones de itinerario, contacto y financiación observadas |
| TN / TD / B1-B2 | Pasaporte perdido | Sí / No | Número, fecha y descripción si se solicita |
| TN / TD / B1-B2 | Familia / estado civil | Soltero / casado / divorciado / otro | Campos del cónyuge y familiares según la respuesta |
| TN / TD / B1-B2 | Empleo, estudios y antecedentes | Presente / anterior / no aplica | Secciones y preguntas adicionales, incluidos los cambios por ocupación |
| TN / TD / B1-B2 | Seguridad y antecedentes | Sí / No, por pregunta | Captura literal de todas las ramas; nunca respuesta predeterminada |

### Ejemplo: estancia de más de 24 horas

En el cuestionario **actual de Águila** ya existe `travel_more_than_24h` que, si el cliente responde «Sí», muestra `travel_stay_city` y `travel_stay_address`. Esa es una **regla interna de Visa Master**, no una afirmación de que CEAC use exactamente el mismo disparador.

Para verificarlo en CEAC:
- Guardar estructura antes de contestar la pregunta que corresponda a itinerario o domicilio.
- Contestar la alternativa en la pantalla **manualmente**.
- Comparar y confirmar si aparecen realmente dirección, ciudad, estado, código postal o contacto.
- Anotar si la condición depende de la duración, de contar con planes concretos o de otra respuesta; no asumir que todas son equivalentes.
- Diseñar la ayuda al cliente según el enunciado exacto observado.


## Observaciones de pantalla CEAC — B1/B2, Travel Information

**Origen:** revisión visual de una grabación de prueba el 24 de noviembre de 2026. Se conserva **solo esta transcripción de la estructura y opciones**, no el video, fotogramas, audio, respuestas ni datos personales. Los códigos HTML de los selectores y la obligatoriedad deben verificarse con el inspector de Chrome. Los hallazgos siguientes **no se extienden por suposición a TN o TD**.

**Raíz de pantalla observada:** `/GenNIV/General/complete/complete_travel.aspx` (la grabación muestra la página *Travel Information*).

- **Purpose of Trip to the U.S.:** categoría visible `TEMP. BUSINESS OR PLEASURE VISITOR (B)`.
- **Specify:** opción visible `BUSINESS OR TOURISM (TEMPORARY VISITOR) (B1/B2)`.
- **Have you made specific travel plans?** Sí / No. Se observan estructuras distintas dependiendo de esta respuesta.

| Respuesta / condición observada | Preguntas y controles visibles |
|---|---|
| Planes específicos = **Sí** | `Date of Arrival in U.S.`, `Arrival Flight (if known)`, `Arrival City`, `Date of Departure from U.S.`, `Departure Flight (if known)`, `Departure City`, lista repetible de `locations you plan to visit` (Add Another / Remove), dirección donde permanecerá en EE. UU., pagador |
| Planes específicos = **No** | `Intended Date of Arrival`, `Intended Length of Stay in U.S.`, pagador. La grabación no permite concluir qué otros bloques aparecen más abajo en esta rama |
| `Address Where You Will Stay in the U.S.` (observado en la rama Sí) | `Street Address (Line 1)`, `Street Address (Line 2) *Optional*`, `City`, `State`, `ZIP Code (if known)` |
| `Person/Entity Paying for Your Trip` | Opciones de catálogo que se leen: `SELF`, `OTHER PERSON`, `PRESENT EMPLOYER`, `EMPLOYER IN THE U.S.`, `OTHER COMPANY/ORGANIZATION` |
| Pagador = **OTHER PERSON** | `Surnames of Person Paying for Trip`, `Given Names of Person Paying for Trip`, `Telephone Number`, `Email Address` (casilla `Does Not Apply`), `Relationship to You`, pregunta sobre si el domicilio de esa persona coincide con el domicilio particular o postal |
| `Relationship to You` del pagador | Opciones visibles `CHILD`, `PARENT`, `SPOUSE`, `OTHER RELATIVE`, `FRIEND`, `OTHER` |

**Regla corregida para el cuestionario:** la pregunta oficial observada que cambia el itinerario es **«Have you made specific travel plans?»**, no «¿Planeas quedarte más de 24 horas?». Águila aún contiene `travel_more_than_24h` como regla propia. Antes de cambiar producción, se necesita diseñar el campo `travel_plans_specific` y el detalle por rama, y verificar los campos faltantes con inspector. **No afirmar que la dirección esté condicionada a más de 24 horas**.

**Advertencia sobre alcance:** esta grabación permite identificar etiquetas y opciones visibles, pero no demuestra valores internos HTML, todos los estados o todas las ramas. No se ha hecho envío ni prueba automatizada completa.

## Observaciones de pantalla CEAC — Travel Companions Information

**Origen:** grabación de prueba de 29 segundos revisada el 24 de noviembre de 2026, continuando el recorrido previo de B1/B2. **La clase de visa no se ve en esta pantalla**: confirmar en CEAC que corresponde al perfil de prueba antes de extender estos hallazgos a TN o TD. Se conserva exclusivamente la estructura textual, sin video, fotogramas ni respuestas del solicitante.

**Ruta identificada visualmente:** `/GenNIV/General/complete/complete_travelcompanions.aspx`. Las ID de HTML y códigos de opción no se conocen hasta usar el inspector de Chrome.

| Condición que se vio | Preguntas/controles visibles |
|---|---|
| `Are there other persons traveling with you?` = **No** | No se solicita detalle de acompañantes |
| `Are there other persons traveling with you?` = **Yes** | Aparece `Are you traveling as part of a group or organization?` (Yes/No) |
| Grupo u organización = **No** | Sección repetible `Enter person(s) traveling with you`; `Surnames of Person Traveling with You`, `Given Names of Person Traveling with You`, `Relationship with Person`; acciones `Add Another` y `Remove` |
| Grupo u organización = **Yes** | `Enter the name of the group you are traveling with.` y campo `Group Name` (sin nombres individuales visibles en esa rama) |

**Catálogo visible de `Relationship with Person`:** `PARENT`, `SPOUSE`, `CHILD`, `OTHER RELATIVE`, `FRIEND`, `BUSINESS ASSOCIATE`, `OTHER` (además de `-SELECT ONE-`). El orden visual puede diferir del mostrado aquí; verificar valores de CEAC antes de programar autollenado.

**Correspondencia con Águila actualmente:**
- `travel_with_someone` ya captura si va acompañado.
- `people.companions[].fullName` captura un nombre junto, pero CEAC separa **Surnames** y **Given Names**: hace falta desglosarlos o separar con verificación inequívoca.
- `people.companions[].relationship` usa categorías en español parecidas, pero faltan equivalencias exactas del catálogo.
- Falta `travel_companions_group` (Sí/No) y, si Sí, `travel_companions_group_name` (nombre de organización o grupo).
- No inferir respuesta predeterminada a «¿viajas con un grupo u organización?». En particular, viajar con familiares no necesariamente implica ir como parte de un grupo organizado.

**Anotaciones sugeridas al cliente (pendientes de implementar):** «Indica si viajarás con otras personas. Si respondes Sí, dinos si viajas como parte de un grupo u organización. Si no es un grupo, anota nombres y apellidos de cada acompañante tal como aparecen en sus pasaportes y selecciona tu relación con ellos. Si es un grupo, escribe su nombre». Mantener los botones de añadir/quitar acompañantes según la rama.

**Estado:** preguntas y opciones observadas visualmente; **sin comprobación de IDs, códigos HTML ni prueba del autollenado**. No se han cambiado los campos de producción del CRM.

## Registro TN — Parte 1 del recorrido (Personal 1 a Pasaporte)

La primera parte del video TN, revisada el 25/11/2026, cubre siete pantallas del DS-160: Personal Information 1/2, Travel Information, Travel Companions, Previous U.S. Travel, Address and Phone y Passport Information. Se documentaron los enunciados, opciones visibles y ramas condicionales sin conservar multimedia ni datos personales.

**Documento de observaciones detalladas:** `docs/ds160-tn-part1-to-passport-20261125.md`.

Hallazgos prioritarios de mapeo:
- La rama de viaje TN confirma `NAFTA PROFESSIONAL (TD/TN)` → `NAFTA PROFESSIONAL (TN)` y distingue planes específicos de duración de estancia.
- `Previous U.S. Travel` ofrece visitas anteriores repetibles, licencias estadounidenses, historia detallada de visa y preguntas separadas de rechazo/petición migratoria.
- `Address and Phone` tiene domicilio postal condicional, teléfonos/correos de los últimos cinco años y redes con plataformas/identificadores repetibles.
- `Passport Information` diferencia tipo, número de libro, expedición, vigencia y múltiples pasaportes perdidos/robados.
- La mayoría de estos datos todavía **no tienen campos equivalentes completos en Águila**. Estado: observado visualmente; sin IDs/códigos CEAC verificados y sin autollenado.


**Continuación TN · tres grabaciones (25/11/2026):** se observaron *U.S. Point of Contact*, *Family Information: Relatives*, *Spouse*, *Former Spouse*, cambios de estado civil y el inicio de *Present Work/Education/Training*. El mapeo solo de preguntas, opciones, condiciones y discrepancias con Águila se encuentra en `docs/ds160-tn-part2-contact-family-work-start-20261125.md`. Se requieren inspección DOM y validación de cada rama antes de habilitar autollenado; no se conservó material audiovisual en el repositorio.

**TN · Trabajo actual y visa temporal (25/11/2026):** se observaron `Present Work/Education/Training` con ocupación, empleador actual, sueldo en moneda local, funciones y credenciales profesionales, y una pantalla `Temporary Work Visa Information` con empleador en Estados Unidos, domicilio, teléfono e **ingreso mensual en USD**. Son conceptos distintos y no deben compartirse por defecto. Hallazgos solo de estructura, sin archivos multimedia ni datos personales: `docs/ds160-tn-part3-work-temporary-visa-20261125.md`. Aún sin IDs HTML comprobados.

**TN · Parte 4 (25/11/2026):** se observó `Present Work/Education/Training`, `Previous Work/Education/Training`, `Additional Work/Education/Training` y `Security and Background` partes **1 y comienzo de 2**. El video termina antes de concluir Seguridad 2; partes 3–5 pendientes. Se observaron catálogos condicionales de ocupación, empleo y estudios repetibles, lista de idiomas, países visitados, organizaciones y seguridad. Informe de estructura únicamente, sin multimedia ni datos personales: `docs/ds160-tn-part4-work-education-security-20261125.md`. Requiere validación del inspector antes de autollenado.

## Reglas para diseñar el cuestionario por visa

- Mantener un **núcleo común** (datos personales, pasaporte, familia, historial migratorio, etc.).
- Cada perfil añade campos o ayuda contextual solo cuando su rama fue observada y validada.
- Las instrucciones para el cliente deben distinguir **«necesario para CEAC»** de **«recomendado por Visa Master»**.
- No dar valores predeterminados a antecedentes migratorios, laborales, legales, de salud ni de seguridad.
- Nunca copiar respuestas de un expediente TN a uno TD o B1/B2 por usar las mismas claves.
- Las pruebas deberán permanecer en expedientes ficticios y sin enviar el DS-160 oficial.
- Si una opción causa *postback* o navegación, la comparación antes/después debe repetirse desde la ruta correcta, una página a la vez.

## Estado inicial de validación

- **TN:** piloto de Personal Information 1/2 y cuestionario TN existente. Ramas de viaje y otras: por verificar en CEAC.
- **TD:** selector de perfil preparado en la extensión; preguntas exclusivas por inspeccionar, sin autollenado aprobado.
- **B1/B2:** selector de perfil preparado en la extensión; preguntas exclusivas por inspeccionar, sin autollenado aprobado.

El modo de comparación no identifica la clase de visa de forma automática porque para hacerlo tendría que leer respuestas del DS-160. El operador debe escoger el perfil correcto y contrastarlo con CEAC.
