# Proyecto Águila — Fase 4.7.1

## Cambios

- Los trámites de Operación activa ahora se pueden abrir.
- En el expediente del trámite se puede:
  - cambiar a Activo;
  - poner En espera;
  - dar por Concluido;
  - cancelar.
- Se agregó Renovación Visa Americana debajo de Visa americana.
- Centro de Control y Cobranza usan exactamente el mismo cálculo.
- Los trámites cancelados quedan fuera del saldo por cobrar.
- Los pagos solo se suman si pertenecen a los mismos trámites considerados.

## Orden obligatorio

1. Ejecuta `supabase/fase4_7_1_renovacion_visa.sql`.
2. Sube el contenido interior de esta versión al repositorio.
3. Espera el deployment de Vercel.
4. Prueba abrir un trámite desde Operación activa.
5. Compara el saldo “Por cobrar” del Centro de Control y Cobranza.

Commit recomendado:

Fase 4.7.1 - estados de tramites renovacion y cobranza unificada
