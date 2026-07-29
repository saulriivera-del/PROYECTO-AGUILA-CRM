# Proyecto Águila — Fase 5.4

## Centro de Desempeño

Esta versión corrige y consolida el cálculo del bono semanal de Mariana.

### Regla oficial

El avance se calcula con:

- Dinero efectivamente cobrado.
- Registrado por cualquier miembro de Visa Master.
- Dentro de la semana actual.

No depende de quién capturó el pago, quién inició el trámite ni quién tiene asignado al cliente.

### Qué verá recepción

En `Centro de Operaciones` aparece una tarjeta compacta con:

- Ingreso general cobrado durante la semana.
- Meta semanal.
- Porcentaje de avance.
- Cantidad faltante o bono actual.
- Días restantes.

En el menú `Desempeño` se abre el tablero completo con:

- Ticket promedio del equipo.
- Cantidad de cobros del equipo.
- Clientes nuevos asignados a la usuaria.
- Trámites nuevos asignados a la usuaria.
- Próximo objetivo y bono estimado.

### Privacidad

Recepción puede ver únicamente los indicadores necesarios para seguir la meta y su operación. No obtiene acceso a utilidad, gastos ni al panel ejecutivo Águila Insights.

### Instalación

1. Reemplazar los archivos del repositorio con esta versión.
2. Subir los cambios a GitHub.
3. Esperar el despliegue automático de Vercel.
4. No requiere variables de entorno nuevas.
5. No requiere SQL adicional respecto a la Fase 5.3.2.

### Validación recomendada

1. Registrar pagos con dos usuarios distintos durante la misma semana.
2. Iniciar sesión como Mariana.
3. Confirmar que ambos pagos se sumen en `Desempeño`.
4. Confirmar que el bono estimado coincida con la regla configurada en Águila Insights.
