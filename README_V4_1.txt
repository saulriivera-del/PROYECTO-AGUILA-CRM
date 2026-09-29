VISA MASTER - PORTAL EMPRESARIAL V4.1

Agrega:
- selector de empresa por trámite
- vincular, cambiar y desvincular empresa
- referencia interna
- ya no necesitas SQL para process_company_links
- corrige el scroll/bajada en dos partes

La causa visual era la regla global:
.form-card { position: sticky; top: 18px; }

V4.1 fuerza position: static solo dentro del administrador del Portal Empresarial.

Instalación:
1. Reemplaza:
   app/admin/tramites/[id]/portal/page.tsx
   app/admin/tramites/[id]/portal/actions.ts
2. Agrega:
   app/admin/tramites/[id]/portal/portal-admin.css
3. npm run build
4. git add "app/admin/tramites/[id]/portal"
5. git commit -m "Portal empresarial V4.1"
6. git pull --rebase origin main
7. git push origin main

No requiere SQL nuevo.
