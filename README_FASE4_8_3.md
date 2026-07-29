# Proyecto Águila — Fase 4.8.3

Esta versión corrige definitivamente la migración de seguimiento.

## Cambio técnico

La migración ya no usa:

- tablas temporales;
- tablas auxiliares públicas;
- relaciones `_aguila_*`.

Todas las etapas se procesan dentro de un único bloque PostgreSQL con JSON interno.

## Orden

1. Abre una pestaña nueva en Supabase SQL Editor.
2. Copia TODO `supabase/fase4_8_seguimiento_tramites.sql`.
3. Ejecuta una sola vez.
4. Espera `Success. No rows returned`.
5. Después sube el código a GitHub.

Commit recomendado:

Fase 4.8.3 - migracion de etapas sin tablas auxiliares
