VISA MASTER - PORTAL EMPRESARIAL V4
====================================

OBJETIVO
--------
Controlar desde Proyecto Águila lo que verá la empresa y publicar documentos
sin tocar SQL para cada movimiento.

V4 AGREGA
---------
1. Panel administrativo por trámite:
   /admin/tramites/[id]/portal

2. Desde ese panel puedes:
   - Mostrar u ocultar el trámite en el Portal Empresarial
   - Editar estado público
   - Editar nota pública
   - Editar próximo paso
   - Activar "Acción requerida"
   - Escribir la instrucción para la empresa
   - Editar número de solicitantes / nombre del grupo
   - Publicar actualizaciones al historial
   - Publicar documentos mediante un enlace
   - Retirar documentos
   - Eliminar actualizaciones manuales

3. Portal de Gabriela:
   - Centro de documentos mejorado
   - Documentos dentro de cada expediente
   - Actualizaciones manuales se mezclan con la actividad existente

IMPORTANTE
----------
En esta V4 los documentos se publican mediante URL.
Puede ser un enlace de Google Drive, Supabase Storage o cualquier URL segura.
No sube físicamente el archivo al servidor todavía.

INSTALACIÓN
-----------
1) Ejecutar en Supabase:
   supabase/V4_PORTAL_EMPRESARIAL.sql

2) Copiar/reemplazar:
   lib/corporate-portal/supabase-rest.ts
   app/empresas/documentos/page.tsx
   app/empresas/tramites/[id]/page.tsx

3) Crear:
   app/admin/tramites/[id]/portal/page.tsx
   app/admin/tramites/[id]/portal/actions.ts

4) Agregar estilos:
   copiar TODO app/empresas/portal-v4.module.css
   al FINAL de app/empresas/portal.module.css

5) Para agregar automáticamente el botón "Portal empresa" al expediente interno:
   python scripts/patch-admin-portal-link.py

6) Build:
   npm run build

7) Si todo compila:
   git add app/empresas app/admin/tramites lib/corporate-portal scripts
   git commit -m "Portal empresarial V4"
   git pull --rebase origin main
   git push origin main

Vercel hará deploy automático.
