# Proyecto Águila — Fase 5.3.1

## Corrección incluida

Esta versión corrige el mapeo de roles del módulo **Usuarios y roles** para usar los valores internos permitidos por la base de datos:

- `admin` → se muestra como **Administrador**
- `reception` → se muestra como **Recepcionista**

La interfaz permanece en español, pero los valores guardados respetan la restricción `profiles_role_check`.

## Instalación

1. Reemplaza los archivos del repositorio con el contenido de este paquete.
2. Haz commit en GitHub.
3. Espera a que Vercel termine el despliegue.
4. No es necesario volver a ejecutar el SQL de la Fase 5.3 ni modificar variables de entorno.
5. Entra a **Configuración → Usuarios y roles** y crea la cuenta de Mariana con el rol **Recepcionista**.

## Nota sobre datos de prueba

La herramienta de limpieza de la Fase 5.3 se conserva. Antes de usarla, confirma que los registros existentes sean ficticios. Esta acción elimina datos operativos y no debe usarse después de iniciar la operación real.

## Próxima mejora propuesta

Para una versión posterior se recomienda sustituir el borrado por un sistema de **visibilidad por equipo y periodo**, de modo que el administrador pueda decidir qué métricas, metas y resultados mostrar a cada asesor por semana o por mes, sin eliminar registros históricos.
