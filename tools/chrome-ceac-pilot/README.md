# Visa Master · piloto Chrome DS-160 · Personal 1 y 2

**Versión 0.3.1** · Preparado para pruebas supervisadas con solicitudes ficticias. **No se ha verificado todavía el llenado en una sesión viva de CEAC**. No utilizar con información real hasta confirmar la prueba piloto y revisar las respuestas frente al documento del solicitante.

## Dependencias
- Chrome de escritorio con la extensión de esta carpeta instalada sin comprimir.
- Una pestaña abierta de `https://crm.visamaster.com.mx/admin/formularios/trade-in-motion/<uuid>`.
- Expediente **Enviado**, consentimiento, correcciones verificadas y **Datos personales aprobados**. El servidor comprueba fecha y SHA de aprobación antes de devolver datos.
- Una segunda pestaña en `https://ceac.state.gov/GenNIV/`, ya dentro de Personal Information 1 o 2.

## Instalar y actualizar
1. Descarga el repositorio desde GitHub (Código > Descargar ZIP), descomprímelo y ubica `tools/chrome-ceac-pilot`.
2. En Chrome abre `chrome://extensions`, activa *Modo desarrollador*, pulsa *Cargar descomprimida* y selecciona **solo** la carpeta `tools/chrome-ceac-pilot`. No selecciones todo el CRM.
3. Si tenías el inspector anterior, puedes mantenerlo para referencia, pero esta extensión piloto es **otra carpeta**. Comprueba que se muestra la versión **0.3.1**.
4. Tras cada actualización del código, pulsa el icono **Recargar** de esta extensión en `chrome://extensions`.

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
- Permisos limitados: `activeTab`, `scripting`, y acceso web **solo al dominio del CRM** para leer el expediente a través de la sesión autenticada del operador.
- Los datos autorizados se consultan de nuevo inmediatamente antes del llenado. No se copian cookies, tokens, claves de acceso ni datos a almacenamiento local.
- No hay acceso a contraseña de CEAC, CAPTCHA o página de firma. El Application ID visible puede detectarse con un clic y se registra únicamente después de confirmación del operador.
- Solo dos rutas CEAC exactas; únicamente 12 sufijos de campos preaprobados: 10 Personal 1, 2 Personal 2.
- Si CEAC cambia los controles, catálogo o ruta, el campo se bloquea y aparece como pendiente. No se buscan opciones por índice.
- No se marca **No**, **Does Not Apply** ni otro radio por inferencia.
- Águila admite nombres de pila separados de los apellidos (por ejemplo «Ángel Saúl» / «Rivera» / «Espinoza») o nombre completo con apellidos en la misma línea. La extensión rellena Surnames y Given Names; si hay un apellido parcialmente coincidente, datos ambiguos o faltantes, no inventa la separación y pide revisión manual. El nombre en alfabeto nativo sigue pendiente de captura manual.
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

**Nota importante:** las 10 acciones del primer paso y las 2 del segundo son **máximos técnicos**; el número real puede ser menor según los campos y opciones visibles. Esta versión es una herramienta de operador y no certifica que CEAC acepte una solicitud.
