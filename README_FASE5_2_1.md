# Proyecto Águila — Fase 5.2.1

Primer sprint real de **Águila Insights**.

## Incluye
- Panel ejecutivo exclusivo para administradores.
- Ingresos de hoy, semana, mes y año basados únicamente en pagos registrados.
- Indicadores de trámites, prospectos, clientes, conversión y ticket promedio.
- Ranking de ingresos por servicio.
- Centro Financiero.
- Centro de Metas editable.
- Reglas de bonos configurables por usuario.
- Regla inicial para Mariana: $17,000 semanales, $1,000 base y $100 por cada $1,000 adicional.
- Menú de Insights oculto para Mariana y demás usuarios no administradores.

## Instalación
1. Ejecutar `supabase/fase5_2_1_aguila_insights.sql` en Supabase SQL Editor.
2. Subir el contenido de esta carpeta a GitHub.
3. Esperar el despliegue de Vercel.
4. Entrar como administrador a `/admin/insights`.

## Importante
La configuración inicial de Mariana se crea automáticamente solo si su perfil activo contiene "Mariana" en `full_name`. Si todavía no existe o está escrito distinto, puede configurarse desde **Águila Insights → Bonos**.
