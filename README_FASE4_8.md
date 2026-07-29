# Proyecto Águila — Fase 4.8

## Seguimiento acumulativo

Al completar una etapa, todas las etapas anteriores quedan completadas.
Al reabrir una etapa, esa etapa y las posteriores vuelven a Pendiente.

## Flujos incluidos

- Adelanto de cita.
- Visa Americana.
- Renovación Visa Americana.
- Pasaporte Mexicano.
- Visa TN.
- Visa TD.
- Visa H.
- eTA Canadá.
- I-94.
- Reporte consular de extravío.

## Automatizaciones

- Captura separada de cita CAS y Consulado.
- Recordatorios automáticos en Agenda.
- Para citas en lunes de Visa Americana/TN/TD, el recordatorio se programa el sábado.
- Verificación consular el día de la cita a las 17:00.
- Preparación de entrevista con fecha propia.
- Renovación: controles a 20 y 40 días.
- Visa H: controles a 2 y 10 días.
- Pasaporte: recordatorio previo y seguimiento de Visa Americana a las 15:30.
- eTA: revisión 24 horas después o 72 horas cuando interviene el fin de semana.
- Botones directos a WhatsApp con mensaje preescrito.

## Instalación obligatoria

1. Ejecuta `supabase/fase4_8_seguimiento_tramites.sql`.
2. Sube el contenido interior del ZIP al repositorio.
3. Espera el deployment.
4. Prueba primero con trámites ficticios.

Nota: la migración reemplaza las etapas de los trámites existentes conservando
la cantidad de etapas que ya aparecían como completadas.

Commit recomendado:

Fase 4.8 - seguimiento acumulativo y agenda automatica
