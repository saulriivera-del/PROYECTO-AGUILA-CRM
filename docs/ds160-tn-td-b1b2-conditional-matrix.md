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
