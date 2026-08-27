# Proyecto Águila 5.4.4 — Beta operativa

Actualización construida sobre la Fase 5.4.3 después de la semana de pruebas reales.

## Cambios

### Horario operativo de Hermosillo
- Se centralizó la fecha operativa en `America/Hermosillo` (UTC-7).
- Hoy/Mañana/Atrasado, agenda, seguimientos, metas, cobranza y alertas usan el día civil de Hermosillo.
- Los campos `datetime-local` se convierten explícitamente desde hora de Hermosillo antes de guardarse.
- El día operativo cambia únicamente a las 00:00 de Hermosillo.

### Trámites crea también al cliente
- Se retiró `Personas` del menú operativo.
- Nuevo trámite pide directamente nombre, teléfono/WhatsApp y correo opcional.
- Si el teléfono ya existe, se reutiliza el expediente del cliente para evitar duplicados.
- Si no existe, Águila crea al cliente automáticamente y luego abre el trámite recién creado.
- El teléfono específico del trámite puede seguir siendo diferente al teléfono principal.

### Cobranza semanal — administrador
- La vista principal compara lunes-domingo de la semana actual contra la semana anterior.
- La comparación porcentual usa únicamente los días transcurridos: por ejemplo, miércoles actual contra lunes-miércoles anterior.
- Se incluye desglose diario y se conserva el selector de intervalo personalizado.

### Bandeja de trabajo
- Una cita consular del día genera `Verificar estatus de la cita`.
- Desde la misma tarjeta se puede marcar **Aprobada** o **Rechazada**.
- Rechazada cierra el trámite.
- Aprobada crea un seguimiento pendiente para confirmar recolección/recepción de la visa.
- Renovación conserva seguimiento automático a los 20 días después de CAS.
- Trámites activos con 4 días sin movimiento aparecen en la misma bandeja.
- Se excluyen trámites finalizados, trámites con cita futura y alertas posteriores al CAS cuando no corresponde.
- `Adelanto de cita` no queda exento por nombre: solo se excluye cuando realmente está en `Espera de cita` o ya existe cita futura.

## Base de datos
No requiere migración SQL nueva. Usa las tablas y columnas ya creadas hasta la Fase 5.4.3.

## Instalación
1. Respaldar el repositorio actual.
2. Subir el contenido de este ZIP reemplazando la Fase 5.4.3.
3. Commit sugerido: `Fase 5.4.4 - beta operativa Hermosillo y bandeja inteligente`.
4. Esperar a que Vercel marque el deployment como `Ready`.
5. Probar en `crm.visamaster.com.mx`.

## Pruebas recomendadas
1. Entre 16:00 y 23:59 de Hermosillo confirmar que el CRM sigue mostrando el mismo día.
2. Crear un trámite con un teléfono nuevo y verificar que se cree automáticamente el cliente.
3. Crear otro trámite con el mismo teléfono y verificar que no duplique cliente.
4. Registrar cobros y revisar comparación semanal en Cobranza como administrador.
5. Abrir una cita consular con fecha de hoy y verificar los botones Aprobada/Rechazada.
6. Marcar Aprobada y comprobar que aparezca seguimiento pendiente para recoger visa.
7. Marcar Rechazada en una prueba y comprobar que el trámite quede finalizado.
8. Verificar que un trámite activo llegue a Bandeja al cumplir 4 días sin movimiento.
9. Verificar que no aparezca esa alerta si tiene cita futura, está concluido o corresponde únicamente a seguimiento posterior de CAS.
