# Trade in Motion → CRM Águila (recepción interna)

## Estado de esta fase
La base de datos y el endpoint **solo servidor a servidor** están preparados.
El formulario público en visamaster.com.mx/formularios/trade-in-motion
**sigue sin enviar ni guardar información**. No habilitar captación real antes de verificar
identidad del solicitante, consentimiento y pruebas integrales.

## Migración
Aplicar `supabase/trade_in_motion_intake.sql` en el proyecto Supabase PROYECTO-AGUILA.
La tabla `vm_form_submissions` tiene RLS y no concede privilegios a `anon`
ni a `authenticated`. Solo un cliente de servidor con rol autorizado
puede consultar respuestas confidenciales.

## Endpoint interno
`POST /api/integraciones/trade-in-motion`

Sin `VM_TRADE_IN_MOTION_WEBHOOK_SECRET` (mínimo 32 caracteres) en el
servidor CRM responde 503. NUNCA exponer esta variable en el navegador.
También se requiere `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en servidor.

Encabezados:
- `Content-Type: application/json`
- `x-vm-timestamp: <segundos UNIX>`
- `x-vm-signature: sha256=<hex(HMAC_SHA256(secret, timestamp + "." + rawBody))>`

Ejemplo conceptual del cuerpo (datos ficticios):
```json
{
  "submissionId": "c0c3a63f-c12f-4e8f-97de-fc95e2bdc1ae",
  "verifiedEmail": "persona@example.invalid",
  "verifiedAt": "2026-11-08T20:00:00.000Z",
  "answers": {
    "full_name": "Solicitante Ejemplo",
    "email": "persona@example.invalid",
    "phone": "6620000000",
    "birth_date": "1990-01-01"
  }
}
```

El código que firma y envía esta carga **debe correr en una función del servidor
del sitio público**, no en JavaScript del cliente. Solo puede firmar el
servidor después de verificar el correo del solicitante (OTP o enlace
validado del lado servidor) y registrar aceptación del aviso de privacidad.
No se debe aceptar `verifiedAt` declarado por el navegador sin comprobarlo.

## Comportamiento
- Rechaza peticiones sin firma válida o con más de cinco minutos.
- La misma `submissionId` se procesa una sola vez.
- Reutiliza un cliente solo si coinciden nombre, teléfono y fecha de nacimiento compatible.
- Reutiliza un trámite TN activo del mismo cliente vinculado a Trade in Motion;
  si no existe, crea un trámite TN en etapa "Formulario recibido".
- Vincula el trámite con la empresa `trade-in-motion` y lo publica con estado
  "Formulario recibido · Pendiente de revisión" en el portal empresarial.
- Las respuestas completas quedan en `vm_form_submissions`, nunca en el portal de Gabriela.
- Bandeja administrativa: `/admin/formularios/trade-in-motion`.

## Pendiente antes de abrir recepción real
1. Implementar guardado y envío desde el formulario público con verificación
   de correo, validación integral y protección contra abuso.
2. Confirmar consentimiento y plazo de conservación de datos personales.
3. Configurar la variable secreta en ambos proyectos Vercel, solo en el servidor.
4. Hacer prueba E2E con un candidato controlado y revisar visibilidad en ambos portales.
5. Activar envío solo después de confirmar que las pruebas y accesos son correctos.
