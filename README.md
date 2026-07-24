# Proyecto Águila — Fase 4.2

Primera aplicación real del CRM con:

- Next.js 16.
- Supabase Auth con cookies.
- Ruta `/admin` protegida.
- Lectura real de `profiles`, `organizations` y conteos de tablas.
- Cierre de sesión.
- Compatible con la variable que ya configuraste:
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- También acepta el nombre moderno:
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Estrategia recomendada de despliegue

No reemplaces todavía la página pública `visamaster.com.mx`.

Crea un **proyecto nuevo en Vercel** conectado a un repositorio nuevo, por
ejemplo:

- Repositorio: `PROYECTO-AGUILA-CRM`
- Proyecto Vercel: `proyecto-aguila-crm`

Primero se prueba con la dirección de Vercel. Cuando funcione, se conecta el
subdominio:

`admin.visamaster.com.mx`

Esto evita poner en riesgo la página pública mientras desarrollamos el CRM.

## Variables de entorno

Configura en el nuevo proyecto de Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://llkjmfhmuwwwakqvoyum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_PUBLISHABLE_KEY
```

También puedes crear:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
```

La aplicación usa `PUBLISHABLE_KEY` primero y, si no existe, utiliza
`ANON_KEY`.

Selecciona Production, Preview y Development. Después realiza un nuevo
despliegue.

## Publicación

1. Crea un repositorio privado nuevo en GitHub.
2. Sube **el contenido de esta carpeta**, no la carpeta exterior.
3. En Vercel selecciona **Add New → Project**.
4. Importa el repositorio.
5. Framework Preset: Next.js.
6. Agrega las variables de entorno.
7. Presiona Deploy.
8. Abre `/login`.
9. Entra con el correo y contraseña creados en Supabase Authentication.

## Resultado esperado

Al entrar, verás:

- Nombre y rol reales.
- Organización Visa Master.
- Conteos reales de prospectos, clientes, trámites, agenda y tareas.
- Todos estarán en cero al principio, porque las tablas todavía están vacías.

## Seguridad

- No se incluye ninguna secret key.
- La ruta `/admin` requiere sesión.
- Las consultas respetan RLS.
- La publishable key puede estar en el navegador porque RLS controla el acceso.
