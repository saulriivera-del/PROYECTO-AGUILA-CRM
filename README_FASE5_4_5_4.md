# Proyecto Águila — Fase 5.4.5.4

## Cambios
- Ajuste fino del recibo PDF: Cliente, Fecha de pago y Forma de pago quedan más cerca y alineados con sus etiquetas.
- Recepción: Registrar pago aparece al inicio de Cobranza; consulta y pagos recientes quedan después.
- Administrador: conserva panel financiero y acceso rápido a Registrar pago.
- Centro de Operaciones: la tarjeta inferior ahora se enfoca únicamente en preparación de entrevista.
  - Preparaciones ya agendadas.
  - CAS o Consulado dentro de los próximos 5 días.
  - Renovaciones con solo CAS no entran automáticamente.
  - Trámites concluidos/finalizados quedan fuera.
- Renovación Visa Americana:
  - Seguimiento 20 días después del CAS para verificar estatus.
  - Se elimina el seguimiento fijo de 40 días desde CAS.
  - Nueva etapa `Verificar estatus de renovación`.
  - Resultado: `Aprobada` o `Llamada a cita consular`.
  - Si es aprobada, se captura fecha de aprobación y se agenda revisión de llegada de visa 20 días después.
  - Si fue llamada a cita consular, se captura la fecha consular y el flujo abre Preparación entrevista → Aprobada o rechazada → Trámite concluido.

## Instalación
1. Ejecutar una sola vez `supabase/fase5_4_5_4_renovacion_operativa.sql` en Supabase SQL Editor.
2. Subir el contenido del proyecto a GitHub.
3. Esperar el deployment de Vercel.

## Pruebas recomendadas
1. Crear/abrir una renovación con CAS y confirmar que exista el seguimiento a +20 días.
2. Resolver `Verificar estatus de renovación` como Aprobada, capturar fecha y revisar que se genere el seguimiento +20 días desde aprobación.
3. Resolver otra renovación como Llamada a cita consular y verificar que solicite fecha consular y abra el nuevo pipeline.
4. Iniciar sesión como recepcionista y confirmar que Registrar pago esté arriba.
5. Generar un recibo y revisar alineación superior.
6. Revisar Centro de Operaciones y confirmar que la lista de preparación no incluya trámites concluidos ni renovaciones CAS-only.
