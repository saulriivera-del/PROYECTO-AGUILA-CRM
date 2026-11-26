# Visa Master · Configuración piloto DS-160 · Datos personales 1 y 2

**Acuerdo operativo (26-nov-2026).** Solo estas dos páginas; las preguntas de seguridad se trabajarán posteriormente en grupos. Esta fase no firma, guarda ni envía solicitudes oficiales en CEAC.

## Personal Information 1
- Nombre y apellidos, sexo, estado civil, fecha y lugar de nacimiento: leer de respuestas corregidas y aprobadas en CRM.
- **Nombre en alfabeto nativo:** preferencia `Does Not Apply / Technology Not Available` en el caso habitual de nacionalidad mexicana. La excepción documentada debe revisarse antes de marcar.
- **Telecódigo:** preferencia `No` si falta dato y el cliente no indicó `Sí`; una respuesta explícita `Sí` tiene prioridad y se completa manualmente.
- Otros nombres: únicamente según respuesta explícita del cliente (nunca asumir `No`).

## Personal Information 2
- Nacionalidad: según expediente.
- Otra nacionalidad, incluso anterior: el cuestionario pregunta `Sí/No` y detalles cuando `Sí`; `No` solo si lo indicó el cliente.
- Residencia permanente en otro país: el cuestionario pregunta `Sí/No` y país cuando `Sí`; no confundir con visa temporal.
- ID nacional: CURP documentada y confirmada por el solicitante.
- **SSN de EE. UU. en TD_CÓNYUGE / TD_HIJO**: pregunta explícita que aclara que no es IMSS ni CURP; `No` se traduce a `Does Not Apply` si CEAC ofrece tal casilla; `Sí` requiere 9 dígitos válidos y verificados. TN y B1/B2 no reciben automáticamente esa respuesta por omisión.
- **Taxpayer ID estadounidense:** preferencia `Does Not Apply`, revisable si tiene ITIN/TIN.

## Estado técnico y límites
- Preguntas nuevas incluidas en `lib/trade-in-motion-config.json`. El formulario nuevo requiere contestar la nacionalidad adicional y residencia; los expedientes ya recibidos siguen intactos en la base de datos, pero tendrán que completarse en una revisión posterior si faltan esas respuestas para recibir una nueva aprobación.
- Transferencia a CEAC por `tools/chrome-ceac-pilot/mapping.js`. Casillas/radios añadidos tienen **sufijos tentativos** que deben observarse con el inspector de Chrome en CEAC antes de usarse. Si el campo no existe, la etiqueta no coincide o hay duplicados, se marca pendiente y no se toca. La extensión no avanza automáticamente.
- No se ha realizado prueba real de las casillas de No aplica en CEAC. La prueba de lógica usa información sintética. Los valores `No` / `Does Not Apply` predeterminados son propuestas del operador, nunca hechos verificados sobre cada persona.
- El expediente y el perfil de visa deben estar aprobados por personal autorizado. Cualquier edición invalida la aprobación hasta revisarla de nuevo.
- No guardar datos privados de solicitantes ni grabaciones de CEAC en documentación ni repositorio.

## Pendientes antes de habilitar en producción
1. Inspeccionar sufijos HTML y etiquetas reales en Personal 1 y 2, en cada rama que abra campos nuevos, incluyendo SSN con Sí/No y telecódigo.
2. Implementar o verificar intervención explícita del operador por expediente cuando el valor predeterminado no aplica (especialmente ITIN y alfabeto nativo).
3. Validar con perfiles ficticios TN, TD y B1/B2 en el navegador, revisar todos los resultados visualmente.
4. Revisar y aprobar la rama de cambios; unificar despliegue para evitar consumo innecesario de builds.
