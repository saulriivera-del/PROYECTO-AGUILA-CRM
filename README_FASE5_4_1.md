# Proyecto Águila — Fase 5.4.1

## Cambios de eficiencia operativa

- Información y resumen del trámite muestran correo y teléfono.
- Cada trámite guarda un teléfono de contacto propio.
- Al crear el trámite se carga por defecto el teléfono del cliente y puede editarse.
- WhatsApp usa el teléfono del trámite cuando fue modificado.
- Las citas se capturan únicamente como fecha, sin solicitar horario.
- Los mensajes de recordatorio mencionan solo la fecha.
- Pasaporte Mexicano genera un solo recordatorio previo, correctamente identificado como Relaciones Exteriores.
- El seguimiento posterior de Pasaporte ofrece el trámite de Visa Americana y ya no se confunde con un recordatorio CAS.

## Instalación

1. Ejecuta `supabase/fase5_4_1_contacto_y_fechas.sql`.
2. Sube el contenido interior de esta carpeta a GitHub.
3. Espera que Vercel muestre `Ready`.
4. Prueba con un trámite ficticio antes de usarlo con un cliente real.

Commit recomendado:

`Fase 5.4.1 - contacto fechas y recordatorios de pasaporte`
