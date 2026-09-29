VISA MASTER - PORTAL EMPRESARIAL V3

Incluye:
1. Grupo / número de solicitantes
2. Sede + fecha + hora CAS y Consulado
3. Última actualización
4. Acción requerida
5. Historial por trámite
6. Buscador en Trámites

ORDEN:
1) Ejecutar supabase/V3_PORTAL_EMPRESARIAL.sql en Supabase.
2) Reemplazar:
   - lib/corporate-portal/supabase-rest.ts
   - app/empresas/page.tsx
   - app/empresas/tramites/page.tsx
   - app/empresas/tramites/[id]/page.tsx
3) Copiar TODO app/empresas/portal-v3.module.css al FINAL de app/empresas/portal.module.css
4) npm run build
5) Si compila:
   git add app/empresas lib/corporate-portal/supabase-rest.ts
   git commit -m "Portal empresarial V3"
   git pull --rebase origin main
   git push origin main

El SQL deja el proceso de Jesús como:
- Grupo familiar · 4 solicitantes

No toca login, RLS, Bot Master ni el trigger AIS -> CRM ya funcional.
