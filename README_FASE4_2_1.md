# Proyecto Águila — Fase 4.2.1

## Corrección principal

El inicio de sesión ahora se ejecuta directamente desde el navegador mediante
`supabase.auth.signInWithPassword(...)`.

El campo de correo inicia vacío y ya no muestra ni sugiere la cuenta administradora.

## Error detectado en la captura de Vercel

En el registro de External APIs, el host parece contener `superbase`.

Debe ser exactamente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://llkjmfhmuwwwakqvoyum.supabase.co
```

No debe ser:

```env
https://llkjmfhmuwwwakqvoyum.superbase.co
```

Después de corregir la variable, crea un deployment nuevo.

## Actualización limpia

Reemplaza:

- app/login/login-form.tsx
- app/login/actions.ts
- app/login/page.tsx

Commit recomendado:

Fase 4.2.1 - Login directo y diagnóstico Supabase
