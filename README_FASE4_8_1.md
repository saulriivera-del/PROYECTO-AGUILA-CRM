# Proyecto Águila — Fase 4.8.1

## Error corregido

La migración 4.8 intentaba reconstruir las etapas de trámites existentes sin
copiar `organization_id`. En la base de datos esa columna es obligatoria, por
eso PostgreSQL rechazó la consulta con el error 23502.

La transacción de Supabase fue revertida por completo; no quedaron cambios
parciales de esa ejecución fallida.

## Instalación

1. Usa esta versión actualizada.
2. Abre `supabase/fase4_8_seguimiento_tramites.sql`.
3. Copia todo el archivo en Supabase SQL Editor.
4. Ejecuta Run.
5. Solo cuando aparezca Success, sube el código a GitHub.

Commit recomendado:

Fase 4.8.1 - corregir organization id en etapas
