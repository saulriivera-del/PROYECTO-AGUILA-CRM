# Visa Master · piloto Chrome DS-160 · Personal 1 y 2

**Versión 0.4.1** · Preparado para pruebas supervisadas con solicitudes ficticias. **No se ha verificado todavía el llenado en una sesión viva de CEAC**. No utilizar con información real hasta confirmar la prueba piloto y revisar las respuestas frente al documento del solicitante.

## Dependencias
- Chrome de escritorio con la extensión de esta carpeta instalada sin comprimir.
- Una pestaña abierta de `https://crm.visamaster.com.mx/admin/formularios/trade-in-motion/<uuid>`.
- Expediente **Enviado**, consentimiento, correcciones verificadas y **Datos personales aprobados**. El servidor comprueba fecha y SHA de aprobación antes de devolver datos.
- Una segunda pestaña en `https://ceac.state.gov/GenNIV/`, ya dentro de Personal Information 1 o 2.

## Instalar y actualizar
1. Descarga el repositorio desde GitHub (Código > Descargar ZIP), descomprímelo y ubica `tools/chrome-ceac-pilot`.
2. En Chrome abre `chrome://extensions`, activa *Modo desarrollador*, pulsa *Cargar descomprimida* y selecciona **solo** la carpeta `tools/chrome-ceac-pilot`. No selecciones todo el CRM.
3. Si tenías el inspector anterior, puedes mantenerlo para referencia, pero esta extensión piloto es **otra carpeta**. Comprueba que se muestra la versión **0.4.1**.
4. Tras cada actualización del código, pulsa el icono **Recargar** de esta extensión en `chrome://extensions`.

## Mapear todo el DS-160, pantalla por pantalla
1. Abre cualquier página de respuesta del DS-160 en `https://ceac.state.gov/GenNIV/General/complete/…aspx`.
2. Pulsa **Mapear esta pantalla (sin datos personales)**. El modo de mapeo **no requiere seleccionar un candidato en Águila** y funciona en páginas distintas de Personal 1 y 2.
3. Pulsa **Copiar estructura para mapearla** y pega el contenido en el chat. Incluye únicamente metadatos: ruta de página, IDs y tipos de controles, etiquetas asociadas y catálogos de selectores. No incluye datos capturados, selección actual, cookies ni Application ID.
4. Si una pregunta tiene respuestas condicionales, inspecciona cada rama cuando CEAC la muestre. Nunca envíes la solicitud ficticia.
5. Cada pantalla se identifica por su ruta independiente. El cuaderno de mapeo se conserva en `docs/ds160-full-form-mapping-workbook.md`.
6. **No confundas mapear con rellenar**: los botones **Preparar y comparar campos** y **Rellenar esta pantalla** siguen limitados estrictamente a Personal Information 1 y 2, con aprobación humana previa.

## Comparar preguntas condicionales para TN, TD y B1/B2

Esta extensión permite un ensayo seguro de **ANTES / DESPUÉS** sin leer ni modificar respuestas oficiales.

1. Abre la página de CEAC que quieres estudiar. En la extensión selecciona el **perfil TN, TD o B1/B2** según la solicitud de prueba actual.
2. Pulsa **1. Guardar estructura ANTES de cambiar la respuesta** y regresa a CEAC.
3. Modifica manualmente una sola alternativa de la pregunta con datos ficticios. Por ejemplo, una respuesta que muestre u oculte un bloque de dirección.
4. Vuelve a abrir la extensión. Verifica el mismo perfil, describe brevemente la rama (sin datos personales) y pulsa **2. Comparar DESPUÉS de cambiar la respuesta**.
5. Aparecerán controles **nuevos**, **ocultos** y **modificados**. Pulsa **Copiar diferencias para mapearlas** y comparte el reporte para actualizar el mapa del cuestionario y las notas del cliente.
6. Si CEAC cambió a otra URL o pestaña, la extensión exigirá empezar de nuevo. Algunos cambios disparan postbacks o validaciones; sólo se compara la estructura que ya esté visible.
7. Elige **Eliminar estructura inicial guardada** al terminar la rama, antes de empezar otra solicitud de prueba.

La comparación conserva únicamente **metadatos estructurales** (no valores introducidos, ni radios marcados, ni Application ID) en `chrome.storage.session`, memoria temporal de Chrome. Se puede borrar manualmente y se elimina al finalizar la sesión de navegador. El operador debe revisar los reportes antes de compartirlos. **No existe recorrido automático de todas las combinaciones:** las preguntas se responden manualmente por seguridad y se inspecciona cada rama realmente visible.

El registro independiente por perfil está documentado en `docs/ds160-tn-td-b1b2-conditional-matrix.md`. Los perfiles TD y B1/B2 **aún no tienen autollenado**; el motor de escritura solo admite Personal Information 1 y 2 con las autorizaciones del piloto actual.

## Detectar y vincular Application ID
1. Deja abierta una única ficha de candidato **recibida con consentimiento** en Águila, con CEAC como pestaña activa.
2. Cuando CEAC muestre el Application ID, pulsa **Detectar Application ID en CEAC**.
3. La extensión buscará la etiqueta «Application ID» y un código de diez caracteres que inicia con AA; no leerá las respuestas del formulario.
4. Comprueba que el candidato seleccionado en Águila y el código de CEAC coinciden con lo esperado. Marca la casilla de confirmación y pulsa **Confirmar y guardar en Águila**.
5. El CRM registra ese código con estado **En elaboración**. Esto no envía, guarda ni firma la solicitud en CEAC.
6. Si CEAC no muestra el ID o aparecen varios, el botón no guardará ninguno. La lectura se realiza mediante pulsación, no vigilancia automática.

**Infraestructura:** requiere la migración `supabase/ds160_application_links.sql` y la ruta de API `/api/admin/ds160/application-id`. La vinculación no sustituye el chequeo de identidad ni la revisión del DS-160.

## Primer ensayo con datos ficticios
1. El operador recupera un DS-160 ficticio. Mariana selecciona consulado, resuelve CAPTCHA, acepta los avisos y responde la pregunta de seguridad **manualmente**. Nada de esto se automatiza.
2. Abre en una pestaña **únicamente** el expediente ficticio en Águila. Si el expediente no tiene aprobación vigente, revísalo en el CRM y aprueba los datos personales (una corrección posterior anula la aprobación).
3. Manteniendo CEAC en **Personal Information 1**, abre la extensión y pulsa **Preparar y comparar campos**.
4. Revisa la vista previa: nombres, sexo, estado civil, fecha y lugar de nacimiento. Los campos sin correspondencia exacta o sin autorización quedan en **Pendientes** y no se rellenan. Comprueba que ambas pestañas correspondan a la misma persona.
5. Si estás probando con la solicitud ficticia correcta, marca la confirmación humana y pulsa **Rellenar esta pantalla (sin enviar)**.
6. **Inspecciona visualmente cada campo en CEAC**, incluyendo los pendientes manuales. Guarda/avanza manualmente solo tras confirmar el resultado. Los cambios de selección pueden activar eventos de la propia página CEAC: si ocurre navegación o recarga, detente y vuelve a inspeccionar.
7. Repite la preparación y revisión en **Personal Information 2** (nacionalidad mexicana e identificación nacional con CURP expresamente confirmada). Los campos de doble nacionalidad, residencia, SSN y número fiscal permanecen para captura manual.
8. No pulses **Sign and Submit**, no presentes un DS-160 de prueba y no uses los datos de una persona real para validar un mapeo no comprobado.

## Controles
- Permisos limitados: `activeTab`, `scripting`, `storage` para metadatos efímeros de comparación y acceso web **solo al dominio del CRM** para leer el expediente a través de la sesión autenticada del operador.
- Los datos autorizados se consultan de nuevo inmediatamente antes del llenado. No se copian cookies, tokens, claves de acceso ni datos a almacenamiento local.
- No hay acceso a contraseña de CEAC, CAPTCHA o página de firma. El Application ID visible puede detectarse con un clic y se registra únicamente después de confirmación del operador.
- El país de nacimiento se selecciona en Águila desde una lista ISO de 249 países y territorios. **México viene preseleccionado** si el expediente todavía no contiene respuesta; no se reemplazan respuestas guardadas de otros países. Si se elige un país distinto de México, la persona debe confirmar explícitamente la elección y mantener consistente el estado/provincia de nacimiento.
- Solo dos rutas CEAC exactas; 13 controles previstos de Personal 1 (incluidos nombre nativo y dos radios **No** basados en respuesta expresa) y 2 de Personal 2. Cada selector y cada opción deben verificarse en CEAC.
- Si CEAC cambia los controles, catálogo o ruta, el campo se bloquea y aparece como pendiente. El país de nacimiento se compara contra el catálogo completo de la sesión y se usa el código disponible, no uno inventado ni una posición por índice.
- **Otros nombres** y **telecódigo** solo se marcan «No» si el cliente eligió explícitamente «No» en el cuestionario y la etiqueta de la opción se comprueba en CEAC. Una respuesta «Sí» o ausente se deja pendiente para revisión manual. **Does Not Apply** nunca se marca por inferencia.
- Águila admite nombres de pila separados de los apellidos (por ejemplo «Ángel Saúl» / «Rivera» / «Espinoza») o nombre completo con apellidos en la misma línea. La extensión rellena Surnames y Given Names; si hay un apellido parcialmente coincidente, datos ambiguos o faltantes, no inventa la separación y pide revisión manual. Para nacidos en México, también prepara el nombre completo en alfabeto nativo si los nombres y apellidos son inequívocos; los demás casos requieren verificación manual.
- El valor sugerido de CURP nunca se usa si no se ha marcado explícitamente confirmado por el cliente.
- Los campos siguen requiriendo verificación humana después de llenarse; el sitio CEAC puede actualizarse por sus propios eventos.
- **Este piloto no hace clic en Siguiente, Guardar, Firmar o Enviar**, ni intenta sortear los mecanismos de control del portal.

## Comprobaciones locales
Si tienes Node.js instalado en tu ordenador, ejecuta:

```bash
node --test tools/chrome-ceac-pilot/*.test.cjs
```

Las pruebas usan **datos sintéticos** y no acceden a CEAC ni a Águila.

## Pendientes antes de una publicación general
- Validar en el navegador, pantalla por pantalla, los sufijos y todos los códigos de opciones de CEAC. Si un campo cambia, se deja sin rellenar.
- Verificar los permisos de Mariana en el CRM y que exista la migración `supabase/ds160_personal_approval.sql` en el entorno adecuado.
- Comprobar datos aprobados, correcciones posteriores, organización ajena, expiración de sesión y revalidación de aprobación.
- Validar al menos dos perfiles sintéticos de diferentes estructuras de nombre y un perfil con respuestas condicionales.
- Documentar el resultado, tiempos y campos faltantes para ampliar luego a pasaporte.

**Nota importante:** las 13 acciones del primer paso y las 2 del segundo son **máximos técnicos**; el número real puede ser menor según los campos y opciones visibles. Esta versión es una herramienta de operador y no certifica que CEAC acepte una solicitud.
