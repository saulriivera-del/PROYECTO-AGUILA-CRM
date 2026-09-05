# Proyecto Águila — Fase 5.4.5.5

## Cambios
- Nueva etapa **Esperando reflejo de pago** después de Pago consular para trámites de visa.
- Los expedientes en esa etapa aparecen primero en Operaciones de hoy.
- Correo editable desde un trámite ya iniciado.
- Adelanto de cita puede agregarse desde un trámite Visa americana/TN/TD con monto pactado variable.
- Corrección de tipo de trámite y monto total pactado reservada al administrador, con registro en activity_log.
- Mantiene los cambios de 5.4.5.4 (renovaciones, cobranza, recibos y preparación de entrevista).

## Instalación
1. Ejecutar `supabase/fase5_4_5_5_reflejo_pago_y_correcciones.sql` una sola vez.
2. Subir el proyecto a GitHub/Vercel.

## Nota
La migración no reconstruye ni borra las etapas existentes. Inserta la nueva etapa y conserva el avance previo; si un expediente ya había avanzado más allá del pago consular, la nueva etapa se marca completada para evitar regresiones.
