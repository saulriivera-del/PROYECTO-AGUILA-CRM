# Proyecto Águila 5.4.5 — Agenda comercial, recibos y depuración

Esta fase parte de 5.4.4 y agrega los cambios detectados durante el uso real.

## 1. Prospectos: hora y modalidad
- La próxima atención conserva fecha y hora en horario `America/Hermosillo`.
- Se agrega modalidad: En oficina, Llamada, WhatsApp, Videollamada u Otro.
- El calendario comercial muestra hora + modalidad y ordena los prospectos del día cronológicamente.
- El expediente y la línea del tiempo muestran la modalidad del próximo seguimiento.

### SQL obligatorio
Ejecutar una sola vez en Supabase SQL Editor:

`supabase/fase5_4_5_agenda_prospectos_recibos.sql`

## 2. Recibo PDF bajo demanda
- Al registrar un pago aparece `Generar recibo PDF`.
- Los pagos históricos también pueden regenerar su recibo desde Cobranza y desde el expediente del trámite.
- Se usa la plantilla de Visa Master incluida en `public/templates/recibo_pago_visamaster.pdf`.
- No se guarda el PDF en Supabase Storage. Se construye solamente cuando el usuario lo solicita.
- Folio reproducible: `VM-AÑO-XXXXXXXX`, derivado del id del pago.
- Se agregó la dependencia `pdf-lib` al `package.json`.

## 3. Operaciones de hoy: depuración
- Los trámites rechazados dejan de aparecer en el tablero operativo.
- Los trámites detenidos pueden concluirse directamente desde Operaciones de hoy.
- El control rápido también incluye un botón `Concluir`.
- Al concluir o cancelar un trámite se marcan como realizadas sus actividades pendientes de Agenda para evitar residuos.

## 4. Agenda ↔ Operaciones
- Ambos módulos trabajan sobre el mismo `agenda_event`.
- Si una actividad se completa en Agenda, desaparece de Operaciones de hoy.
- Si se resuelve la cita consular desde Operaciones, la actividad se marca realizada y desaparece de Agenda.
- Si el resultado es rechazado, se depuran todos los pendientes del trámite.
- Al marcar como realizada la actividad `Pendiente recoger visa`, el trámite se concluye y se depuran sus alertas restantes.

## Instalación
1. Ejecutar `supabase/fase5_4_5_agenda_prospectos_recibos.sql`.
2. Subir el contenido del proyecto a GitHub reemplazando la versión anterior.
3. Confirmar que Vercel instala la nueva dependencia `pdf-lib` y finaliza el deployment en estado Ready.
4. Probar con un prospecto, un pago nuevo, un pago histórico y un trámite concluido.

## Pruebas recomendadas
- Crear un prospecto con seguimiento a una hora específica y modalidad `En oficina`.
- Revisar que el calendario muestre esa hora correctamente en Hermosillo.
- Registrar un pago y descargar el recibo.
- Regenerar un recibo de un pago histórico.
- Concluir un trámite desde Operaciones y comprobar que desaparezca de Agenda y del control operativo.
- Marcar una cita consular como Aprobada/Rechazada desde Operaciones y confirmar la sincronización con Agenda.
