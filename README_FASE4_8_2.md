# Proyecto Águila — Fase 4.8.2

## Corrección de migración

La versión anterior utilizaba tablas temporales. En algunas ejecuciones del SQL Editor de Supabase, esas tablas dejaron de estar disponibles antes de terminar el script.

Esta versión usa tablas de migración normales, las elimina al finalizar y mantiene todo dentro de una transacción.

## Instrucciones

1. Abre `supabase/fase4_8_seguimiento_tramites.sql`.
2. Copia el archivo completo en una pestaña nueva del SQL Editor.
3. Ejecuta todo una sola vez.
4. Debe aparecer `Success. No rows returned`.
5. Después sube el código a GitHub.

No ejecutes únicamente las líneas finales del archivo.

Commit recomendado:

Fase 4.8.2 - migracion sin tablas temporales
