# Proyecto Águila 5.4.4.1 — Corrección de bandeja operativa

## Bugs corregidos

- Los trámites finalizados (concluidos, aprobados, rechazados o cancelados) ya no aparecen en el Control rápido ni generan actividades operativas pendientes ligadas a ese trámite.
- Los trámites con cita futura sólo aparecen en el tablero operativo cuando la siguiente cita está dentro de los próximos 7 días naturales, incluyendo hoy.
- Los trámites con cita a más de 7 días permanecen fuera de la bandeja para evitar listas innecesariamente largas.
- Los trámites activos sin cita futura siguen sujetos a la regla de 4 días sin movimiento.
- Se conserva la lógica especial existente para CAS/renovación y para seguimientos consulares.

## Instalación

No requiere SQL nuevo. Subir los archivos sobre la versión 5.4.4 y desplegar en Vercel.
