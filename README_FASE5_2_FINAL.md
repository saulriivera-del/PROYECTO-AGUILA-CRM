# Proyecto Águila — Fase 5.2 Final

Entrega consolidada de Águila Insights.

## Incluye
- Dashboard ejecutivo, finanzas, metas, bonos, tendencias, logros y Director Águila.
- Acceso a Insights protegido por rol administrador en el layout completo.
- Cálculos financieros basados únicamente en pagos registrados como dinero cobrado.
- Semana de lunes a domingo.
- Bono de Mariana configurable: $17,000 activa $1,000 y cada $1,000 completo adicional suma $100.
- Cierre semanal sin duplicados.
- Fotografía histórica de la regla aplicada al momento del cierre.
- Protección de bonos ya pagados.
- Auditoría de metas, reglas, cierres y pagos.
- Estados vacíos y mensajes claros.

## Migraciones
1. `supabase/fase5_2_1_aguila_insights.sql` (si todavía no está aplicada).
2. `supabase/fase5_2_final_estabilizacion.sql`.

## Prueba recomendada
Entrar como Ángel y verificar todos los módulos. Entrar como Mariana y confirmar que `/admin/insights` redirige y que el menú ejecutivo no aparece.
