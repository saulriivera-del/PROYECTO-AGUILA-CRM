# Proyecto Águila — Fase 5.2.2

## Centro Financiero
- Flujo de ingresos cobrados de los últimos 14 días.
- Comparativo semanal y mensual.
- Pago promedio y número de movimientos.
- Ranking de servicios y formas de pago.
- Últimos pagos con cliente, servicio, método y fecha.
- Lectura rápida de mejor servicio, mejor día, ticket promedio y acumulado anual.

## Centro de Metas
- Tarjetas de avance automático.
- Metas semanales, mensuales y anuales.
- Indicadores: ingresos, prospectos, clientes, conversión y trámites concluidos.
- Edición de metas existentes.
- Archivo/desactivación de metas.
- Asignación de responsable.

## Instalación
Esta fase utiliza las tablas creadas por `supabase/fase5_2_1_aguila_insights.sql` y no requiere una migración adicional.

## Nota de cálculo
Todos los indicadores financieros se calculan exclusivamente con registros de la tabla `payments`, es decir, dinero efectivamente cobrado.
