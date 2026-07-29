# Proyecto Águila — Fase 4.8.4

Corrige el error de compilación de TypeScript en Vercel:

`Property full_name does not exist on type never`

La relación `clients` de Supabase ahora se normaliza con un tipo explícito antes de leer `full_name`.

No requiere ejecutar SQL adicional en Supabase.

Commit recomendado:

Fase 4.8.4 - corregir tipado de cliente en tramites
