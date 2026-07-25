# Proyecto Águila — Fase 4.6.1

## Problema corregido

La conversión anterior hacía tres operaciones separadas:

1. Crear cliente.
2. Actualizar prospecto.
3. Registrar actividad.

Si una operación intermedia fallaba, el prospecto podía desaparecer de la
vista activa sin llevar al usuario claramente al expediente.

## Nueva solución

- Conversión atómica dentro de PostgreSQL.
- Si algo falla, no se guarda ningún cambio parcial.
- Si el teléfono ya pertenece a un cliente, se reutiliza ese expediente.
- Al convertir, el sistema abre inmediatamente el expediente resultante.
- Un prospecto convertido muestra el botón “Abrir cliente”.
- La pantalla de Clientes ahora muestra errores reales de consulta.

## Orden obligatorio

1. Ejecuta `supabase/fase4_6_1_conversion_atomica.sql` en SQL Editor.
2. Después sube el código de esta versión a GitHub.
3. Espera el deployment de Vercel.
4. Prueba con un prospecto ficticio.

Commit recomendado:

Fase 4.6.1 - conversión atómica de prospectos
