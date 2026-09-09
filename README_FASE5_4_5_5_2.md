# Proyecto Águila 5.4.5.5.2

Corrección del servicio complementario **Adelanto de cita**:

- El monto pactado se suma al total del trámite.
- La etapa "Proceso de adelanto de cita" se activa/crea dentro del expediente.
- Se puede capturar opcionalmente el pago recibido en ese mismo momento.
- Si se captura pago, se inserta en `payments` y aparece en Cobranza y en el historial del trámite.
- Si todavía no ha pagado, se deja `Pago recibido ahora = 0` y solo se registra la cuenta por cobrar.
- Se agregaron validaciones y manejo explícito de errores de Supabase.

No requiere migración SQL adicional sobre 5.4.5.5.1.
