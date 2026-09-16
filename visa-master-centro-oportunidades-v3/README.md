# Visa Master · Proyecto Águila
## Centro de Oportunidades V3

Frontend interno para visualizar oportunidades de cita y distinguir las oportunidades verificadas directamente por AIS.

### Incluye

- Resumen: nuevas, en revisión, notificadas, utilizadas y AIS verificadas.
- Tarjetas con cita actual vs. oportunidad.
- Badge `AIS VERIFIED`.
- Hora consular verificada.
- CAS compatible, fecha CAS y días de separación.
- Filtros por estado, consulado, búsqueda libre y "solo verificadas".
- Acciones: Revisar, Notificada, Utilizada, Descartar/Reabrir.
- Auto-refresh cada 15 segundos.
- API serverless para mantener `SUPABASE_SERVICE_ROLE_KEY` fuera del navegador.
- Clave interna adicional `VM_DASHBOARD_TOKEN`.

## 1. Supabase

Primero debes haber ejecutado:

`vm_ais_verified_opportunities_migration.sql`

Luego ejecuta:

`vm_opportunity_center_v3_migration.sql`

Esto crea `vm_opportunity_center_app_view` y agrega `discarded_at`.

## 2. Variables de entorno en Vercel

Project Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VM_DASHBOARD_TOKEN`

`VM_DASHBOARD_TOKEN` puede ser una clave interna larga que solo use tu equipo.

No pongas `SUPABASE_SERVICE_ROLE_KEY` dentro de `app.js`, `index.html` ni ningún archivo público.

## 3. Subir a Vercel

Descomprime el ZIP y sube la carpeta completa al proyecto del Centro de Oportunidades, o súbela a tu repositorio conectado con Vercel.

La raíz debe contener:

- `index.html`
- `styles.css`
- `app.js`
- `vercel.json`
- `api/opportunities.js`

## 4. Uso

Al abrir el sitio pedirá la clave `VM_DASHBOARD_TOKEN`.

Después el navegador consulta `/api/opportunities`, y la función serverless consulta Supabase con la service role de manera privada.

## 5. Datos

El frontend lee:

`public.vm_opportunity_center_app_view`

Las acciones actualizan:

`public.vm_client_appointment_matches`

El Worker AIS V2 continúa siendo el responsable de marcar:

- `ais_verified`
- `ais_verified_at`
- `ais_job_id`
- `consular_time`
- `cas_location`
- `cas_date`
- `cas_gap_days`
- `verification_source`
- `verification_payload`
