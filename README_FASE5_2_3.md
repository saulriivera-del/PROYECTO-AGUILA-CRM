# Proyecto Águila — Fase 5.2.3

## Incluye
- Corrección de relaciones ambiguas de Supabase en metas y reglas de bonos.
- Centro de bonos semanal basado únicamente en pagos cobrados.
- Regla inicial de Mariana: $17,000 activa $1,000 y suma $100 por cada $1,000 adicional completo.
- Cierre semanal manual con fotografía del ingreso y bono calculado.
- Historial de bonos.
- Estado Pendiente / Pagado.
- Acción para marcar el bono como pagado.

## Base de datos
No requiere una migración nueva si ya se ejecutó `supabase/fase5_2_1_aguila_insights.sql`.

## Prueba sugerida
1. Abrir Águila Insights > Bonos.
2. Confirmar que aparezca Mariana y el avance semanal.
3. Cerrar la semana.
4. Confirmar que aparece en el historial.
5. Marcar el bono como pagado.
