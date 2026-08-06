# Proyecto Águila 5.4.2 — Centro de Operaciones Inteligente

## Incluye
- Zona horaria visual y operativa `America/Hermosillo`.
- Cobranza por intervalo, exclusivamente para administrador.
- Agenda mensual con selección de día; próximas ya no se desglosan infinitamente.
- Apertura automática del expediente después de crear un trámite.
- Alertas de inactividad desde el tercer día con las reglas acordadas:
  - nunca para trámites finales;
  - nunca mientras exista una cita futura;
  - nunca después de CAS;
  - sí después de Consulado;
  - sí después de Relaciones Exteriores;
  - sí en procesos internos sin movimiento.
- Búsqueda de trámites por nombre, teléfono, correo, etapa e ID.
- Filtros por estado, servicio, responsable y orden.

## Instalación
1. Ejecuta `supabase/fase5_4_2_operaciones_inteligentes.sql`.
2. Sube el contenido interior de esta carpeta al repositorio.
3. Espera que Vercel indique `Ready`.
4. Prueba crear un trámite: debe abrir su expediente automáticamente.
5. Revisa Agenda, Cobranza y filtros de Trámites.

## Siguiente entrega
La Fase 5.4.3 queda reservada para Prospectos 2.0: expediente, anotaciones, agenda comercial y alerta de 2 días.

Commit sugerido:
`Fase 5.4.2 - centro de operaciones inteligente`
