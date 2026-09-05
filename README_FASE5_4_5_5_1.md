# Proyecto Águila 5.4.5.5.1

Corrección de migración SQL de la fase 5.4.5.5.

El error `23505 duplicate key value violates unique constraint service_flow_steps_service_flow_id_step_order_key` ocurría al desplazar `step_order` una posición en una tabla con restricción única `(service_flow_id, step_order)`.

La migración ahora mueve temporalmente las etapas a un rango alto (+1000) y luego las baja a su posición definitiva (+1), evitando colisiones durante el UPDATE.

## Instalación
Ejecutar una sola vez en Supabase SQL Editor:

`supabase/fase5_4_5_5_reflejo_pago_y_correcciones.sql`

Si la ejecución anterior falló con 23505, PostgreSQL revirtió esa sentencia/bloque; puede ejecutar nuevamente este archivo corregido.
