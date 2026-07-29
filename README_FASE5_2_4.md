# Proyecto Águila — Fase 5.2.4

Incluye Tendencias, Logros automáticos y Director Águila con recomendaciones basadas en reglas transparentes.

## Instalación
No requiere una migración adicional. Debe estar aplicada la migración `supabase/fase5_2_1_aguila_insights.sql`.

## Rutas
- `/admin/insights/tendencias`
- `/admin/insights/logros`
- `/admin/insights/director`

## Nota
El Director Águila de esta entrega no llama a un servicio externo de IA: genera recomendaciones deterministas con los datos del CRM para evitar costos y resultados inventados.
