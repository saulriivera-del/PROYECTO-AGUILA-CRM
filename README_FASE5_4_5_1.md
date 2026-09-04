# Proyecto Águila 5.4.5.1 — Corrección de build

## Corrección

- Se corrige el error de TypeScript en `app/admin/cobranza/recibo/[id]/route.ts`.
- La variable local del trámite se llamaba `process` y ocultaba al objeto global de Node.js `process`, provocando que `process.cwd()` fuera interpretado como una propiedad inexistente del registro del trámite.
- La variable fue renombrada a `processData`, manteniendo intacta la lógica del generador de recibos PDF.

## Instalación

No requiere SQL adicional. Sustituir la versión 5.4.5 por esta versión y volver a desplegar en Vercel.
