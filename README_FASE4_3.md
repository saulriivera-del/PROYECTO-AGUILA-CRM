# Proyecto Águila — Fase 4.3

## Funciones reales incluidas

- Dashboard con conteos reales.
- Alta de prospectos en Supabase.
- Conversión de prospecto a cliente.
- Alta directa de clientes.
- Creación de trámites reales.
- Generación automática de etapas mediante el trigger existente.
- Total acordado y compromiso de pago inicial.
- Registro de actividad.
- Diseño adaptable para computadora y celular.

## Actualización limpia

Este paquete reemplaza la aplicación completa del repositorio CRM.

Sube el contenido interior de `proyecto_aguila_fase4_3` a la raíz de
`PROYECTO-AGUILA-CRM`.

Commit recomendado:

`Fase 4.3 - Prospectos clientes y tramites reales`

## Prueba sugerida

1. Crear un prospecto de prueba.
2. Confirmar que aparezca en Supabase > Table Editor > prospects.
3. Convertirlo en cliente.
4. Confirmar las tablas clients y prospects.
5. Crear un trámite para ese cliente.
6. Confirmar processes, process_steps y process_charges.

No utilices datos sensibles reales hasta terminar las pruebas de permisos,
roles y documentos.
