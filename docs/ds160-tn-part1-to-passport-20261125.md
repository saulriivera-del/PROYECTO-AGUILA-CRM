# DS-160 Visa TN · Recorrido visual, parte 1 (hasta Pasaporte)

**Fecha del análisis:** 25 de noviembre de 2026. **Fuente:** video de prueba aportado para mapeo. Se conservan exclusivamente preguntas, estructura, opciones visibles y condiciones, **sin multimedia ni datos personales** (no registrar nombres, folio/Application ID, CURP, pasaporte, correos, direcciones, teléfonos ni valores de respuestas usados en el ensayo).

**Alcance:** Se observó en secuencia Personal Information 1, Personal Information 2, Travel Information (TN), Travel Companions, Previous U.S. Travel, Address and Phone y Passport Information. El video muestra visualmente la estructura; **no aporta los IDs HTML ni códigos de los selectores**. El inspector de Chrome sigue siendo necesario antes de autorizar autollenado. Las respuestas que se ven marcadas son **solo para demostrar ramas**, no valores a reutilizar.

**Estado:** mapeo de observación visual para TN, **no implementación en producción**. Falta incorporar la segunda parte del recorrido.

## 1. Personal Information 1

**Pantalla:** `Personal Information 1`, ruta conocida del piloto `complete_personal.aspx`.

- `Surnames`, `Given Names`.
- `Full Name in Native Alphabet` y casilla `Does Not Apply/Technology Not Available`.
- `Have you ever used other names (i.e., maiden, religious, professional, alias, etc.)?` → **Yes/No**; observar rama Yes con detalle en futuro ensayo.
- `Do you have a telecode that represents your name?` → **Yes/No**.
- `Sex`, `Marital Status`.
- `Date and Place of Birth`: fecha (día/mes/año), ciudad, estado/provincia, país/región.
- En lista **Marital Status** se distinguen `MARRIED`, `COMMON LAW MARRIAGE`, `CIVIL UNION/DOMESTIC PARTNERSHIP`, `SINGLE`, `WIDOWED`, `DIVORCED`, `LEGALLY SEPARATED`, `OTHER`. Revisar la correspondencia exacta y disponibilidad en la sesión CEAC antes de automatizar.

**Relación con Águila:** `full_name`, `curp_paterno`, `curp_materno`, `curp_sexo`, `marital_status`, `birth_*`, `other_names_used`, `name_telecode`. **Nota:** no elegir automáticamente respuesta de otros nombres, telecódigo o estado civil por suposición.

## 2. Personal Information 2

**Pantalla:** `Personal Information 2`, ruta del piloto `complete_personalcont.aspx`.

- `Country/Region of Origin (Nationality)`.
- `Do you hold or have you held any nationality other than the one indicated above on nationality?` → Yes/No.
- `Are you a permanent resident of a country/region other than your country/region of origin (nationality) indicated above?` → Yes/No.
- `National Identification Number` y casilla `Does Not Apply`.
- `U.S. Social Security Number` y casilla `Does Not Apply`.
- `U.S. Taxpayer ID Number` y casilla `Does Not Apply`.

**Pendiente Águila:** capturar explícitamente nacionalidad adicional, residencia permanente fuera del país de nacionalidad, SSN y número fiscal, así como casos `No aplica` documentados; evitar marcarlos por defecto. El piloto solo contempla nacionalidad y CURP confirmada.

## 3. Travel Information — TN

**Pantalla:** `Travel Information`; ruta observada `complete_travel.aspx`.

- `Purpose of Trip to the U.S.`: **NAFTA PROFESSIONAL (TD/TN)**.
- `Specify`: **NAFTA PROFESSIONAL (TN)**.
- Estructura repetible del propósito de viaje: `Add Another` / `Remove`.
- `Have you made specific travel plans?` → Yes/No.
- En el camino observado **No**: `Intended Date of Arrival` (día/mes/año), `Intended Length of Stay in U.S.` (cantidad y unidad), `Address Where You Will Stay in the U.S.` (`Street Address Line 1`, `Line 2 Optional`, `City`, `State`, `ZIP Code (if known)`) y `Person/Entity Paying for Your Trip`.
- Se ve como opción de pagador `EMPLOYER IN THE U.S.`; otras opciones de pagador están documentadas en la grabación B1/B2, pero **no debe asumirse equivalencia de sus catálogos sin inspección**.
- El camino **Yes** de planes específicos en TN **no queda demostrado** con este video.

**Corrección importante:** `LESS THAN 24 HOURS` forma parte de la selección de **duración** de estancia; no se observó como pregunta que controle la visualización de la dirección. Águila usa `travel_more_than_24h` para condicionar la dirección: **esta regla no replica el comportamiento observado de CEAC**. Diseñar pregunta `travel_plans_specific` y las ramas, y revisar migración de respuestas existentes antes de modificar formulario publicado.

## 4. Travel Companions Information

**Pantalla:** `Travel Companions Information`; ruta conocida `complete_travelcompanions.aspx`.

- `Are there other persons traveling with you?` → Yes/No.
- Si **Yes**, `Are you traveling as part of a group or organization?` → Yes/No.
- Si grupo/organización = **Yes**, aparece `Group Name`.
- Esta grabación también pasa por la estructura de acompañantes. Para ramas de grupo = **No** y catálogo de relaciones detallado, consultar la observación B1/B2 previa en `docs/ds160-tn-td-b1b2-conditional-matrix.md` y confirmar los selectores para TN.

**Pendientes Águila:** `travel_companions_group` y `travel_companions_group_name`; no asumir que ir acompañado equivale a viajar en grupo.

## 5. Previous U.S. Travel Information

**Pantalla:** `Previous U.S. Travel`; ruta visible `complete_previousustravel.aspx`.

- `Have you ever been in the U.S.?` → Yes/No. Si **Yes**: lista repetible de visitas (`Date Arrived`, `Length of Stay` con cantidad y unidad; `Add Another` / `Remove`).
- `Do you or did you ever hold a U.S. Driver's License?` → Yes/No. Si **Yes**: `Driver's License Number` (alternativa `Do Not Know`) y `State of Driver's License`, con posibilidad de agregar varias.
- `Have you ever been issued a U.S. Visa?` → Yes/No. Si **Yes**, sección `Previous U.S. Visas` con `Date Last Visa Was Issued`, `Visa Number` (casilla `Do Not Know`), más preguntas Yes/No:
  - `Are you applying for the same type of visa?`
  - `Are you applying in the same country or location where the visa above was issued, and is this country or location your place of principal residence?`
  - `Have you been ten-printed?`
  - `Has your U.S. Visa ever been lost or stolen?`
  - `Has your U.S. Visa ever been cancelled or revoked?`
- `Have you ever been refused a U.S. Visa, or been refused admission to the United States, or withdrawn your application for admission at the port of entry?` → Yes/No; si **Yes** aparece `Explain` (texto libre).
- `Has anyone ever filed an immigrant petition on your behalf with the United States Citizenship and Immigration Services?` → Yes/No; se observó que al contestar **Yes** aparece `Explain`.
- El video muestra preguntas cambiando de rama; **ninguna selección de ejemplo debe convertirse en valor predeterminado del cliente**.

**Pendientes Águila:** visitas repetibles (ahora solo tiene último viaje), licencias estadounidenses y estados (ausentes del cuestionario actual), preguntas independientes sobre tipo de visa previo, lugar de expedición/actual residencia, diez huellas, visa cancelada/revocada, petición migratoria y explicaciones. No agrupar todo dentro de un único `us_immigration_problem`.

## 6. Address and Phone Information

**Pantalla:** `Address and Phone`; ruta observada `complete_contact.aspx`.

- `Home Address`: calle (línea 1 y opcional 2), ciudad, estado/provincia (con `Does Not Apply`), código postal (con `Does Not Apply`), país/región.
- `Is your Mailing Address the same as your Home Address?` → Yes/No. Si **No**, documentar los campos alternativos durante el siguiente ensayo.
- `Primary Phone Number`, `Secondary Phone Number` (con `Does Not Apply`), `Work Phone Number` (con `Does Not Apply`).
- `Have you used any other phone numbers in the last five years?` → Yes/No, verificar rama **Yes**.
- `Email Address`.
- `Have you used any other email addresses in the last five years?` → Yes/No, verificar rama **Yes**.
- `Social Media Provider/Platform`, `Social Media Identifier` y control repetible `Add Another` / `Remove`.
- En el catálogo visible de plataformas se leen, entre otras: `DOUBAN`, `FACEBOOK`, `FLICKR`, `GOOGLE+`, `INSTAGRAM`, `LINKEDIN`, `MYSPACE`, `PINTEREST`, `QZONE (QQ)`, `REDDIT`, `SINA WEIBO`, `TENCENT WEIBO`, `TUMBLR`, `TWITTER`, `TWOO`, `VINE`, `VKONTAKTE (VK)`, `YOUKU`, `YOUTUBE`, `NONE`. No es garantía de catálogo completo; recuperar códigos usando inspector.
- `Do you wish to provide information about your presence on any other websites or applications you have used within the last five years to create or share content (photos, videos, status updates, etc.)?` → Yes/No; si **Yes**, aparece sección para describir/identificar otros sitios (detalle exacto pendiente).

**Pendientes Águila:** distinguir domicilio postal de particular, teléfonos secundarios y otros números últimos 5 años, otros emails últimos 5 años, catálogos de redes conforme CEAC, control de perfiles repetibles e información de otros sitios web. Conservar reglas propias de revisión social TN/TD **separadas** de los campos oficiales.

## 7. Passport Information

**Pantalla:** `Passport Information`; ruta visible `Passport_Visa_Info.aspx` (difiere del patrón `complete_*.aspx` actual de nuestro inspector).

- `Passport/Travel Document Type`: desplegable con `REGULAR`, `OFFICIAL`, `DIPLOMATIC`, `LAISSEZ-PASSER`, `OTHER` visibles en la grabación. **Confirmar lista completa** en CEAC.
- `Passport/Travel Document Number`.
- `Passport Book Number` y `Does Not Apply` (no confundir necesariamente con número de pasaporte).
- `Country/Authority that Issued Passport/Travel Document`.
- `Where was the Passport/Travel Document Issued?` → `City`, `State/Province *If shown on passport`, `Country/Region`.
- `Issuance Date` (día/mes/año).
- `Expiration Date` (día/mes/año), casilla `No Expiration`.
- `Have you ever lost a passport or had one stolen?` → Yes/No. Si **Yes**: bloque repetible `Passport/Travel Document Number` (casilla `Do Not Know`), `Country/Authority that Issued Passport/Travel Document`, `Explain`, `Add Another` / `Remove`.

**Pendientes Águila:** tipo y país/autoridad emisora, número de libro y `Does Not Apply`, estado y país de expedición, caducidad sin fecha, **varios pasaportes perdidos**, número desconocido, autoridad emisora y explicación. El formulario actual no captura todos estos campos.

## Siguientes acciones (antes de escribir en CEAC)

1. **Completar la segunda parte del video TN**, conservando solo estructura de las pantallas restantes.
2. Abrir con el inspector de Chrome cada pantalla y recoger IDs/códigos de catálogo. **Atención:** nuestra versión de inspector usa el patrón `/GenNIV/General/complete/[a-z0-9_-]+.aspx`; `Passport_Visa_Info.aspx` se encuentra bajo `/GenNIV/General/complete/` según la grabación, pero no es una página `complete_*.aspx`. Confirmar desde la herramienta, no asumir la ruta.
3. Diseñar nuevas preguntas en Águila agrupadas por ramas: núcleo común TN/TD/B1-B2, más diferencias específicas comprobadas. No desplegar todavía ni rellenar estas nuevas pantallas automáticamente.
4. Todas las ayudas al cliente deben estar en español y decir cuándo la información proviene del DS-160 o de una revisión interna Visa Master.
5. **No conservar** archivo de video, fotogramas, capturas ni respuestas de prueba en GitHub/Águila. Este documento es la única salida persistente del análisis.
