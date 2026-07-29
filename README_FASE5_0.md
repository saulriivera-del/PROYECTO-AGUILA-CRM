# Proyecto Águila — Fase 5.0

## Centro de Operaciones Diario

La pantalla principal ahora prioriza el trabajo del día:

- actividades atrasadas;
- actividades de hoy;
- tareas asignadas al usuario conectado;
- trámites personales prioritarios;
- agenda de mañana y de la semana;
- saldos por cobrar y cobranza del día;
- acciones rápidas para WhatsApp, trámite y actividad realizada.

La bandeja ordena primero:

1. actividades personales;
2. actividades urgentes;
3. actividades generales por horario.

## Correcciones visuales

### Agenda

- El formulario ya no ocupa una columna permanente.
- “Nueva actividad” abre un modal amplio y centrado en computadora.
- En móvil el formulario ocupa la pantalla completa.
- La agenda utiliza todo el ancho disponible.

### Trámites

- “Nuevo trámite” abre un modal amplio dividido en cuatro secciones.
- Operación activa utiliza todo el ancho de la pantalla.
- Los trámites asignados al usuario conectado se distinguen con “Para mí”.
- La cuadrícula aprovecha mejor monitores de escritorio.

## Instalación

Esta versión no requiere ejecutar SQL adicional.

1. Sube el contenido interior de la carpeta al repositorio.
2. Espera que Vercel muestre `Ready`.
3. Prueba Agenda, Trámites y la pantalla inicial en computadora.
4. Confirma que también funcionen en móvil.

Commit recomendado:

Fase 5.0 - centro de operaciones diario y modales

## Nota de validación

El paquete se revisó estructuralmente. El entorno de generación no pudo instalar
`@supabase/ssr@0.12.3` desde su registro interno, por lo que la compilación final
debe confirmarse con el deployment de Vercel.
