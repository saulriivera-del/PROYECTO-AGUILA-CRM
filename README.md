# Visa Master — Portal Corporativo V1

Frontend Next.js listo para conectar con el Supabase actual de Visa Master.

## Funciones incluidas
- Login por correo/contraseña con Supabase Auth.
- Middleware para proteger `/portal`.
- Dashboard empresarial conectado a `corporate_portal_processes`.
- Actividad conectada a `corporate_portal_updates`.
- Vista individual de trámite.
- Módulo de documentos visual preparado para fase Drive/AIS.
- Mi cuenta + cambio de contraseña.
- Cierre de sesión.
- UI responsive basada en el mockup enviado a Gabriela.

## Requisitos en Supabase
- Usuario de Gabriela creado en `auth.users`.
- `company_users.auth_user_id` vinculado.
- RLS ya configurado.
- Views `corporate_portal_processes` y `corporate_portal_updates` con `security_invoker=true`.

## Configuración
1. Copia `.env.local.example` a `.env.local`.
2. En Supabase > Project Settings > API copia:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Ejecuta:

```bash
npm install
npm run dev
```

4. Abre `http://localhost:3000/login`.

## Deploy Vercel
- Importa este repositorio/proyecto.
- Agrega las dos variables de entorno.
- Deploy.
- Después agrega `empresas.visamaster.com.mx` en Vercel > Domains.

## Importante sobre seguridad
No uses `service_role` en el frontend. El portal usa únicamente la llave `anon` + la sesión Auth del usuario. La seguridad real la aplica RLS en Supabase.

## WhatsApp
El botón de soporte usa `https://wa.me/` como placeholder. Sustitúyelo por el número oficial de Visa Master antes de producción.
