# Visa Master · Formularios TN con guardado y revisión (piloto noviembre 2026)

## Arquitectura
- Formulario candidato: https://crm.visamaster.com.mx/formularios/trade-in-motion
- Bandeja recepción: https://crm.visamaster.com.mx/admin/formularios/trade-in-motion
- Fuente de preguntas: lib/trade-in-motion-config.json (mismas 7 secciones / 121 preguntas del demo original).
- Autorizaciones privadas: public.vm_trade_in_motion_invites, administradas solo por el personal de recepción y dirección.
- Base privada: public.vm_trade_in_motion_drafts (borradores y envíos), RLS sin SELECT para anon/authenticated.
- Entrada final: public.create_vm_trade_in_motion_case() -> public.vm_form_submissions, clientes, trámites y enlace a Trade in Motion.
- Ningún campo del cuestionario completo se presenta en el portal corporativo de Gabriela.

## Candidato
0. Mariana registra y autoriza su correo en la bandeja de formularios; sin esta autorización el servidor rechaza lectura, guardado y envío.
1. Ingresa el correo personal y recibe el enlace de autenticación de Supabase.
2. Abre el enlace. Se verifica su identidad por email confirmado de Supabase Auth.
3. Lee/acepta el aviso de privacidad ANTES de guardar la primera respuesta.
4. Completa las secciones; autoguardado aproximadamente 2.4 segundos después de la última edición y botón Guardar ahora.
5. Puede volver con el mismo correo para continuar su único borrador de Trade in Motion.
6. Al enviar se valida obligatoriedad, preguntas condicionales, contacto y listas de acompañantes/familiares.
7. El envío crea o reutiliza el cliente/trámite TN de la empresa y bloquea nuevas ediciones del candidato.

## Mariana / recepción
- Debe iniciar sesión normalmente en Proyecto Águila.
- Se permite acceso a perfiles activos del organismo Visa Master con rol `reception` o administrador.
- Nuevo enlace lateral: «Formularios DS-160».
- En la bandeja, registra nombre opcional y correo del nuevo candidato; el estado inicial es «Pendiente».
- Puede revocar invitaciones no iniciadas. El enlace público es el mismo para todos, pero solo correos autorizados pueden usarse.
- La bandeja permite buscar por nombre/correo, filtrar por Borrador/Recibido/En revisión.
- Cada candidato presenta avance y detalle por secciones; se pueden incluir preguntas sin respuesta e imprimir.
- Una recepción final puede marcarse «En revisión» y abrir su trámite TN.

## Precondiciones antes de uso real
- Confirmar en Supabase Auth > URL Configuration que `https://crm.visamaster.com.mx/auth/callback`
  está permitido como URL de redirección.
- Confirmar entrega de email (SMTP o proveedor autorizado) y hacer una prueba real de Magic Link
  con una cuenta de prueba que controle Visa Master. No probar con datos reales de candidatos.
- Confirmar que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
  `SUPABASE_SERVICE_ROLE_KEY` están en Vercel producción de Proyecto Águila.
- Antes de enviar invitaciones públicas, verificar aviso de privacidad y plazo de conservación
  de información personal en el responsable de los datos.
- El antiguo formulario estático de visamaster.com.mx no guarda respuestas; redireccionarlo
  a la nueva ruta solo después de aprobar el flujo de email y guardado end-to-end.

## Prueba integral sugerida
1. Autorizar un correo de prueba desde la bandeja de Mariana; entrar con ese correo, aceptar aviso, completar dos campos y pulsar «Guardar ahora».
2. Cerrar sesión, volver a iniciar con el mismo correo y comprobar la recuperación.
3. Mariana debe ver un borrador privado y sus campos, sin verlo en el portal de Gabriela.
4. Completar todos los obligatorios, probar respuesta condicional de negativa de visa y familiares.
5. Enviar una vez y comprobar fila privada, trámite TN vinculado, estado «Recibido» y bloqueo de edición.
6. Repetir envío intencionalmente, confirmar que no se duplique el trámite.
7. Mariana marca «En revisión»; verifica badge y acceso al trámite.
8. Correo no autorizado recibe 403 al intentar leer o guardar; correo distinto autorizado no puede recuperar respuestas de otro candidato.
9. Cualquier problema con correo/OTP debe bloquear la recepción, nunca saltar la verificación.
