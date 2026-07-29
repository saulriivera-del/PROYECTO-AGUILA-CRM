# Proyecto Águila — Fase 5.3

## Incluye
- Administración de usuarios desde Águila.
- Creación de cuentas con contraseña temporal.
- Roles `administrador` y `recepcionista`.
- Activación y desactivación de acceso.
- Cambio de contraseña temporal.
- Auditoría de cambios administrativos.
- Herramienta controlada para limpiar datos operativos de prueba.

## Variable nueva en Vercel

```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role
```

Debe marcarse como **Sensitive**, solo en **Production** y **Preview**. Nunca debe llevar `NEXT_PUBLIC_`.

## Instalación
1. Conserva las variables públicas actuales de Supabase.
2. Agrega `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
3. En Supabase > SQL Editor, ejecuta `supabase/fase5_3_usuarios_roles_beta.sql`.
4. Sube todos los archivos de esta versión a tu repositorio de GitHub, reemplazando los anteriores.
5. Espera el despliegue de Vercel.
6. Inicia sesión como administrador.
7. Abre `Configuración > Usuarios y roles` y crea la cuenta de Mariana.

## Crear a Mariana
- Nombre: Mariana y sus apellidos.
- Correo: el correo que utilizará para entrar.
- Rol: `Recepcionista`.
- Contraseña temporal: mínimo 8 caracteres.

## Limpiar datos ficticios
1. Antes de limpiar, crea un respaldo en Supabase.
2. Abre `Configuración > Herramientas`.
3. Escribe exactamente `BORRAR DATOS DE PRUEBA`.
4. Confirma la eliminación.

Se eliminan datos operativos: prospectos, clientes, trámites, cargos, pagos, agenda, seguimientos, actividad y cierres históricos de bonos.

Se conservan: usuarios, organización, flujos de servicio, metas, reglas de bonos y configuración.

## Seguridad
La `service_role` solo se importa desde `lib/supabase/admin.ts`, marcado como código exclusivo de servidor. Cada acción valida primero que la sesión actual pertenezca a un administrador de la misma organización.
