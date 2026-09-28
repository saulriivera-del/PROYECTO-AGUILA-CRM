# Portal Corporativo Visa Master — integración en Proyecto Águila CRM

Este paquete está pensado para **extraerse en la raíz del mismo repositorio Next.js del CRM**.

## Qué agrega

- `app/empresas/` — frontend corporativo.
- `lib/corporate-portal/supabase-rest.ts` — cliente de autenticación/REST sin dependencias nuevas.
- `middleware.ts` — hace que `empresas.visamaster.com.mx` use `/empresas`.
- No modifica `/admin`.
- No agrega `package.json` ni cambia dependencias.

## Variables requeridas en el MISMO proyecto Vercel

Ya pueden existir por Proyecto Águila:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

También acepta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como alternativa para la llave pública.

**Nunca usar `SUPABASE_SERVICE_ROLE_KEY` en este frontend.**

## Base de datos esperada

El módulo consume lo que ya se creó:

- `company_users`
- `companies`
- `documents`
- `corporate_portal_processes`
- `corporate_portal_updates`

El usuario Gabriela ya debe estar vinculado por `auth_user_id` y RLS.

## Dominio

En Vercel, `empresas.visamaster.com.mx` debe estar conectado al mismo proyecto `proyecto-aguila-crm`.

El middleware hace:

- `https://empresas.visamaster.com.mx/` -> `/empresas`
- `/login` -> `/empresas/login`
- `/tramites/...` -> `/empresas/tramites/...`

El CRM normal sigue funcionando por sus rutas actuales, por ejemplo `/admin`.

## MUY IMPORTANTE: si el repo ya tiene middleware.ts

No reemplaces tu middleware existente sin revisarlo.

Integra dentro de su función el bloque que empieza con:

```ts
const host = request.headers.get('host')?.split(':')[0] || ''
```

y termina antes de:

```ts
return NextResponse.next()
```

Si no existe `middleware.ts`, puedes usar el incluido tal cual.

## Build actual del CRM

El portal no corrige errores anteriores del proyecto principal. Vercel compila todo el repo. Los errores que ya aparecieron antes deben corregirse para que cualquier deploy pase:

1. CSS Module:
   `app/admin/motor-citas/motor-citas.module.css`
   no puede usar `button:disabled` como selector global puro. Debe ser una clase local, por ejemplo `.actionButton:disabled`.

2. Dependencia:
   `app/admin/cobranza/recibo/[id]/route.ts`
   importa `pdf-lib`; esa dependencia debe existir en el `package.json` del CRM o se debe retirar ese import.

## Prueba inicial

1. Abre `https://empresas.visamaster.com.mx/login`.
2. Entra con `gabriela@tradeinmotion.us`.
3. Deben aparecer solo los trámites autorizados por RLS (actualmente Diana TN y Jesús TD).
4. Prueba `Mi cuenta -> Cambiar contraseña`.
5. Confirma que `/admin` no es una ruta accesible como parte del portal corporativo.

## Seguridad

El frontend usa la llave pública y el JWT del usuario.
La separación real de datos debe permanecer en RLS de Supabase.
