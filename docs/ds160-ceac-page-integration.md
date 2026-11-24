# DS-160: contrato de integración por pantallas (piloto Chrome)

## Objetivo
Reducir la recaptura manual. La extensión solo puede tomar respuestas autorizadas desde la sesión activa del operador en Águila; el DS-160 oficial se recorre **una pantalla CEAC a la vez**, ya que las secciones del cuestionario interno no tienen necesariamente correspondencia 1:1 con pantallas CEAC.

## Situación verificada en el código
- El CRM incluye: `personal` (38 preguntas posibles), `passport` (7), `travel` (11), `history` (19), `family` (5), `work` (36), `tn` (16).
- La ruta existente `GET /api/admin/ds160/personal?draft_id=<uuid>` requiere sesión y rol `admin` o `reception`, coincidencia de organización y aprobación vigente; responde `schema: vm-ds160-personal-v1`, `scope: personal`, `draftId` y `answers`.
- La ruta usa respuestas corregidas, cuando existen, y rechaza aprobaciones anteriores a cambios o con digest diferente.
- Esto **no implica** que el llenado en CEAC ya exista. No hay selectores CEAC ni extensión validada en este repositorio.

## Contrato para la futura extensión
1. El operador abre el expediente aprobado en Águila y, en otra pestaña, el sitio CEAC.
2. La extensión solicita los datos de `personal` desde la página autenticada de Águila mediante el endpoint existente. No guarda tokens ni respuestas en almacenamiento persistente.
3. La extensión identifica **qué pantalla CEAC está abierta**. Si no reconoce una pantalla verificada, no rellena campos y muestra un error explícito.
4. Para cada campo CEAC de esa pantalla, aplica un mapeo previamente probado: `campoCEAC → campoAguila + transformación + condición`. Nunca se asume que el orden de preguntas equivale al de CEAC.
5. Muestra un resumen de los campos que pretende llenar, solicita acción explícita del operador y entonces escribe únicamente en los controles verificados de esa pantalla.
6. Antes de cambiar a la siguiente pantalla CEAC, el operador revisa que lo capturado sea correcto. El avance entre pantallas oficiales requiere acción del operador; el cambio de página no autoriza enviar ni firmar el DS-160.
7. La siguiente pantalla se detecta y valida de nuevo; no se hace autollenado ciego ni se reutilizan selectores de la anterior.
8. Si se modifica el expediente aprobado en Águila, se invalida cualquier copia temporal y se exige nueva aprobación antes de otra transferencia.

## Checklist de pruebas
- [ ] Sesión sin autenticar devuelve denegación, sin datos personales.
- [ ] Rol distinto de administrador o recepción devuelve denegación.
- [ ] Expediente de otra organización es inaccesible.
- [ ] Formulario sin consentimiento o sin aprobación se bloquea.
- [ ] Una corrección posterior a aprobar invalida la autorización.
- [ ] Los valores aprobados coinciden con los corregidos, no con el formulario original.
- [ ] Pantalla CEAC no reconocida no recibe escrituras.
- [ ] Selectores y transformaciones de Datos personales se verifican individualmente, con datos ficticios.
- [ ] Nunca se pulsa automáticamente **Sign and Submit**, se responde un CAPTCHA ni se evita una comprobación de presencia humana.
- [ ] Las pruebas con el expediente de Mariana no modifican ni envían solicitud oficial sin una decisión explícita.

## Siguiente bloque
Una vez probado `personal`, construir un endpoint específico y aprobación independiente para `passport`. Evitar ampliar de golpe el endpoint personal a todo el cuestionario sin controles por sección.

**Pendiente clave:** localizar o crear el repositorio real del código fuente de la extensión Chrome y verificar la estructura actual de CEAC antes de implementar selectores. El repositorio separado `Automatizacion-ds160` consultado contiene un frontend de administración, no un `manifest.json` de extensión.
