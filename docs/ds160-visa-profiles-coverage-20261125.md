# Visa Master · Verificación de cobertura DS-160 TN / TD / B1-B2 (25-11-2026)

**Objeto:** registro de preguntas/opciones de prueba observadas, sin almacenar multimedia ni datos personales. Esta evaluación distingue **estructura vista en CEAC**, **validación de IDs/códigos DOM** y **autollenado de extensión**. Una pantalla observada en video NO demuestra que todas sus ramas o variantes estén completas.

## Hallazgo adicional en el video corto de 36 s (IMG_2582, no conservado)

Pantallas recorridas visualmente: `Travel Information`, `Travel Companions Information`, `Present Work/Education/Training Information`. Se ven cambios manuales en el catálogo de motivo de viaje y de ocupación.

En `Travel Information`, el desplegable `Purpose of Trip to the U.S.` muestra `NAFTA PROFESSIONAL (TD/TN)`. Su desplegable subordinado `Specify` incluye **tres opciones visibles**:

| Opción mostrada por CEAC | Perfil de referencia | Estado |
|---|---|---|
| `NAFTA PROFESSIONAL (TN)` | TN principal | Visible en la lista y como selección. No se muestra bloque de nombres del titular principal en ese estado observado |
| `SPOUSE OF TN (TD)` | TD cónyuge | Seleccionada en el video; **aparece** bloque `Principal Applicant Information` con `Surnames` y `Given Names` |
| `CHILD OF TN (TD)` | TD hijo(a) | **Opción visible**. Falta seleccionar esta alternativa y comprobar exactamente qué preguntas aparecen |

El video muestra también el control `Add Another` / `Remove` junto al propósito de viaje. No se deduce con ello cómo valida CEAC más de un propósito. En TD cónyuge, los campos del **titular principal TN** son distintos de nombre y apellidos del **solicitante TD**. No sustituir unos por los otros.

El video vuelve a páginas de `Travel Companions` y `Present Work/Education`. No aporta en esas tomas una validación exhaustiva de todas las ramas TN/TD, ni prueba específica de B1/B2. **No se copian los valores escritos, nombres, Application ID o sugerencias de autocompletar que puedan aparecer en la grabación.**

**Actualización del 25-11-2026:** seis clips adicionales permitieron recorrer las cinco pantallas de *Security and Background* TN, incluidos ejemplos de ramas `Yes → Explain`, y confirmar `complete_temporarywork.aspx`. Documento detallado (solo estructura, sin multimedia): `docs/ds160-tn-part5-security1to5-20261125.md`. Por tanto ya **no falta recorrer Seguridad 2–5 visualmente**; sí falta verificar cada pregunta y control en el DOM y completar perfiles TD/B1-B2.

## Estado real del mapeo y lo que falta

| Perfil | Lo respaldado visualmente | Pendientes antes de declarar completo |
|---|---|---|
| **TN** | Recorrido visual de pantallas base **hasta Seguridad 5** y **Temporary Work Visa Information**; rutas de Seguridad 1–5 y de empleo TN identificadas | Ramas Sí/No y catálogos no comprobados exhaustivamente, códigos DOM, comparación completa con Águila y pruebas supervisadas de autollenado |
| **TD cónyuge** | Nueva evidencia específica: `SPOUSE OF TN (TD)` activa los dos campos del titular principal; otras pantallas comunes se han visto en recorridos TN, pero NO están verificadas exhaustivamente como TD | Recorrido propio TD cónyuge de todas las pantallas y ramas; datos del titular; dependencia familiar; diferencias laborales, de contacto y viaje; inspección DOM |
| **TD hijo(a)** | Opción `CHILD OF TN (TD)` visible en el catálogo | Activarla, comprobar `Principal Applicant Information` y recorrer todo el formulario con esta variante; controles de edad/familia que apliquen |
| **B1/B2** | Observación previa en videos de Viaje y Acompañantes, con itinerario específico/no específico, dirección, pagador y acompañantes | Recorrido independiente de todo B1/B2, ramas de pagador, empleo y seguridad; códigos DOM y pruebas de autollenado |

**Importante:** la extensión actual del proyecto (v0.4.2 al elaborar estas notas) **solo escribe con supervisión en Personal Information 1 y 2**. El modo de mapeo del resto de páginas NO equivale a funcionalidad de autollenado. Tampoco hay verificación completa en un navegador real de todos los selectores de Personal 1/2.

## Próxima iteración

1. Registrar `visa_profile` como TN, TD-cónyuge, TD-hijo o B1/B2, sin deducirlo de un nombre.
2. En TD conservar `td_principal_surnames` y `td_principal_given_names` como datos **del titular principal**; pedirlos explícitamente al cliente y cotejarlos con su documentación.
3. Comprobar la rama `CHILD OF TN (TD)` en CEAC.
4. Las cinco páginas de Seguridad TN ya tienen observación visual; **validar sus radios, explicaciones y códigos DOM** y recorrer TD y B1/B2 por separado, con capturas estructurales de cada página.
5. Ajustar el cuestionario del cliente y la extensión en fases después de validar los campos y códigos. **Ninguna declaración de seguridad/antecedentes se responde por defecto**.

**Almacenamiento:** conservar este texto y las matrices; no subir videos, audio ni fotogramas a GitHub o Águila. El adjunto original en ChatGPT se controla desde ChatGPT, no mediante el borrado local.
