# Visa Master · piloto Chrome DS-160 · Personal 1 y 2

**Versión 0.5.1** · Preparado para pruebas supervisadas con solicitudes ficticias. **No se ha verificado todavía el llenado en una sesión viva de CEAC**. No utilizar con información real hasta confirmar la prueba piloto y revisar las respuestas frente al documento del solicitante.

## Dependencias
- Chrome de escritorio con la extensión de esta carpeta instalada sin comprimir.
- Una pestaña abierta de `https://crm.visamaster.com.mx/admin/formularios/trade-in-motion/<uuid>`.
- Expediente **Enviado**, consentimiento, correcciones verificadas y **Datos personales aprobados**. El servidor comprueba fecha y SHA de aprobación antes de devolver datos.
- Una segunda pestaña en `https://ceac.state.gov/GenNIV/`, ya dentro de Personal Information 1 o 2.

## Instalar y actualizar
1. Descarga el repositorio desde GitHub (Código > Descargar ZIP), descomprímelo y ubica `tools/chrome-ceac-pilot`.
2. En Chrome abre `chrome://extensions`, activa *Modo desarrollador*, pulsa *Cargar descomprimida* y selecciona **solo** la carpeta `tools/chrome-ceac-pilot`. No selecciones todo el CRM.
3. Si tenías el inspector anterior, puedes mantenerlo para referencia, pero esta extensión piloto es **otra carpeta**. Comprueba que se muestra la versión **0.5.1**.
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
5. Si permanece en la misma URL, aparecerán controles **nuevos**, **ocultos** y **modificados**. Si CEAC navegó a otra URL dentro del formulario, se registrarán **las dos pantallas completas por separado**, con sus rutas, sin considerar todos los campos de destino como nuevos de la pantalla original. Pulsa **Copiar diferencias para mapearlas** y comparte el reporte para actualizar el mapa del cuestionario y las notas del cliente.
6. Si CEAC cambió de URL dentro de la **misma pestaña**, se registrará como transición de páginas, no como diferencia de controles; el operador anotará qué respuesta provocó el salto. Si cambió de pestaña, sí es necesario volver a iniciar. Algunos cambios disparan postbacks o validaciones.
7. Elige **Eliminar estructura inicial guardada** al terminar la rama, antes de empezar otra solicitud de prueba.

El botón **Registrar DESPUÉS** funciona incluso cuando CEAC pasa a la página de cónyuge, dirección o viaje. El reporte incluye `before.path` y `after.path` y sus inventarios separados; no afirma automáticamente qué pregunta causó la navegación.\n\nLa comparación conserva únicamente **metadatos estructurales** (no valores introducidos, ni radios marcados, ni Application ID) en `chrome.storage.session`, memoria temporal de Chrome. Se puede borrar manualmente y se elimina al finalizar la sesión de navegador. El operador debe revisar los reportes antes de compartirlos. **No existe recorrido automático de todas las combinaciones:** las preguntas se responden manualmente por seguridad y se inspecciona cada rama realmente visible.

El registro independiente por perfil está documentado en `docs/ds160-tn-td-b1b2-conditional-matrix.md`. Los perfiles TD y B1/B2 **aún no tienen autollenado**; el motor de escritura solo admite Personal Information 1 y 2 con las autorizaciones del piloto actual.

## Detectar y vincular Application ID
1. Deja abierta una única ficha de candidato **recibida con consentimiento** en Águila, con CEAC como pestaña activa.
2. Cuando CEAC muestre el Application ID, pulsa **Detectar Application ID en CEAC**.
3. La extensión buscará la etiqueta «Application ID» y un código de diez caracteres que inicia con AA; no leerá las respuestas del formulario.
4. Comprueba que el candidato seleccionado en Águila y el código de CEAC coinciden con lo esperado. Marca la casilla de confirmación y pulsa **Confirmar y guardar en Águila**.
5. El CRM registra ese código con estado **En elaboración**. Esto no envía, guarda ni firma la solicitud en CEAC.
6. Si CEAC no muestra el ID o aparecen varios, el botón no guardará ninguno. La lectura se realiza mediante pulsación, no vigilancia automática.

**Infraestructura:** requiere la migración `supabase/ds160_application_links.sql` y la ruta de API `/api/admin/ds160/application-id`. La vinculación no sustituye el chequeo de identidad ni la revisión del DS-160.

## Recorrido automático supervisado (v0.5.1)

- Abre una **solicitud ficticia** de CEAC en Personal Information 1 y deja **una sola pestaña** de expediente aprobado abierta en CRM. Para probar las nuevas preguntas TD y los valores por defecto **sin publicar en producción**, usa la vista previa autorizada: `https://proyecto-aguila-crm-git-feature-ds160-persona-0e92fb-visamaster.vercel.app/admin/demo-automatizacion-ds160` y abre allí el expediente de prueba aprobado. Esta versión no se ha probado en una sesión oficial viva.
- Pulsa **Preparar y comparar campos** y revisa el solicitante, los campos y las respuestas predeterminadas. Marca las dos confirmaciones: comprobación del expediente y permiso de recorrido.
- Pulsa **Iniciar llenado y avance automático**. El controlador vuelve a leer el expediente autorizado, revisa los campos visibles y rellena los compatibles sin guardar información personal en la extensión. Cuando todos los campos de la sección coinciden, pulsa **Next** para guardar temporalmente y continuar.
- Si CEAC conserva la misma página por un error, cambia los controles, surge una excepción, faltan campos o se llega a una página no mapeada, el recorrido **se detiene**. Reabre la extensión para ver el estado. El botón **Detener recorrido** permite detenerlo por decisión del operador.
- El alcance actual es exclusivamente Personal Information 1 y Personal Information 2. **No debe intentar saltar Travel Information u otras secciones:** se detiene allí para que continuemos su mapeo. La implementación para llegar a las páginas **Review** queda pendiente hasta que cada sección restante esté verificada.
- No resolver CAPTCHA, no automatizar firma ni envío. El solicitante debe revisar y firmar personalmente según las instrucciones del Departamento de Estado.
- El estado de ejecución conserva únicamente IDs de pestañas, identificador del expediente y mensajes de control en `chrome.storage.session`; se consultan las respuestas aprobadas de nuevo en cada pantalla, sin guardar datos personales en almacenamiento de la extensión.
- **No activar para clientes reales** sin ejecutar pruebas completas en Chrome/CEAC y confirmar los identificadores reales de campos, etiquetas de No aplica y botón Next. La vista previa de Vercel no sustituye esta verificación.

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
- Solo se permite escribir en las dos rutas exactas de Personal 1 y Personal 2. Las casillas de alfabeto nativo, SSN e identificación fiscal y las respuestas de otra nacionalidad/residencia requieren validar sufijos HTML y etiquetas reales antes del avance.
- Si CEAC cambia los controles, catálogo o ruta, el campo se bloquea y aparece como pendiente. El país de nacimiento se compara contra el catálogo completo de la sesión y se usa el código disponible, no uno inventado ni una posición por índice.
- **Otros nombres** se marca «No» solo con respuesta explícita. **Telecódigo** usa el valor predeterminado «No», excepto si el solicitante informó «Sí». Las casillas «Does Not Apply» de alfabeto nativo e identificación fiscal son reglas operativas sujetas a revisión y a identificación inequívoca en CEAC; las respuestas específicas del cliente prevalecen.
- Águila admite nombres de pila separados de los apellidos (por ejemplo «Ángel Saúl» / «Rivera» / «Espinoza») o nombre completo con apellidos en la misma línea. La extensión rellena Surnames y Given Names; si hay un apellido parcialmente coincidente, datos ambiguos o faltantes, no inventa la separación y pide revisión manual. Para el caso habitual de nacionalidad mexicana el nuevo recorrido prepara la casilla «Does Not Apply» de alfabeto nativo, pero solo la marca si CEAC muestra el control inequívoco y el operador autorizó esa regla; otros casos se revisan.
- El valor sugerido de CURP nunca se usa si no se ha marcado explícitamente confirmado por el cliente.
- Los campos siguen requiriendo verificación humana después de llenarse; el sitio CEAC puede actualizarse por sus propios eventos.
- **Modo manual:** nunca pulsa Next. **Modo de recorrido supervisado:** pulsa el botón oficial **Next** únicamente después de comprobar los controles completos de Personal 1 y 2; jamás pulsa Firmar ni Enviar. Si un campo no coincide, se detiene.

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
