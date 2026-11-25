# DS-160 TN · Seguridad 1–5: mapeo visual de ramas Sí/No

**Fuente:** seis clips consecutivos del recorrido de prueba, revisados el 25-11-2026; la imagen adicional permitió verificar la ruta de la pantalla TN posterior. **Retener solo este texto:** sin video, fotogramas, audio, números de solicitud, datos personales, respuestas personales o capturas del ensayo.

**Estado:** se observaron las **cinco pantallas** de `Security and Background` y el paso final hacia `Temporary Work Visa Information` para esta ruta TN. Esto completa el **recorrido visual de las páginas base TN**, NO un mapeo exhaustivo del árbol de todas las respuestas y tipos de visa. La inspección DOM de IDs, valores de catálogo, validaciones y obligatoriedad sigue pendiente. El operador alternó Sí/No con fines de exploración; **ninguna marca observada es una declaración de un cliente**.

## 1. Security and Background · Part 1

**Ruta visual:** `/GenNIV/General/complete/complete_securityandbackground1.aspx`.

Se observan **tres preguntas independientes** Sí/No:
- Enfermedad transmisible de importancia para salud pública.
- Trastorno mental o físico que represente o pueda representar un riesgo para sí mismo u otras personas.
- Abuso o adicción a drogas actual o en el pasado.

Al seleccionar **Yes** se observan campos `Explain` debajo de preguntas, de modo que el sistema debe mantener **respuesta + explicación condicional** para cada una, no una explicación común a toda la página. El video comprueba ejemplos de ese comportamiento, no todos los estados de validación.

## 2. Security and Background · Part 2

**Ruta visual:** `/GenNIV/General/complete/complete_securityandbackground2.aspx`.

Se recorre **hasta el final** (en contraste con el clip anterior que se detenía al comienzo) y se observa el paso posterior a Parte 3. Preguntas Sí/No visibles relacionadas con:

1. Arresto o condena por delito u ofensa, aun con indulto, amnistía u otra medida de clemencia.
2. Violación o conspiración relacionada con sustancias controladas.
3. Prostitución o actividades sexuales comerciales relacionadas.
4. Participación o conspiración en lavado de dinero.
5. Comisión o conspiración para cometer trata de personas.
6. Ayuda, asistencia o colaboración consciente con responsables de trata de personas.
7. Beneficio consciente, dentro del periodo indicado, por actividades de trata realizadas por cónyuge o progenitor, según la pregunta CEAC.

Se ven múltiples cuadros `Explain` cuando el operador selecciona **Yes** en ejemplos de la parte inferior. **No se garantiza la redacción jurídica exacta desde el video**; cotejar pregunta por pregunta con CEAC antes de publicar traducciones y automatizar.

## 3. Security and Background · Part 3

**Ruta visual:** `/GenNIV/General/complete/complete_securityandbackground3.aspx`.

El recorrido muestra preguntas Sí/No independientes sobre:
- Espionaje, sabotaje, infracciones de controles de exportación u otras actividades ilícitas en EE. UU.
- Participación o intención de participar en actividades terroristas.
- Asistencia económica o apoyo a terroristas u organizaciones terroristas.
- Membresía o representación de organización terrorista.
- Vínculos familiares (cónyuge, hijo/a) con una persona que participó en actividades terroristas, según el periodo de la pregunta.
- Genocidio.
- Tortura.
- Ejecuciones extrajudiciales, asesinatos políticos u otros actos de violencia.
- Reclutamiento o utilización de niños soldados.
- Participación en violaciones graves de libertad religiosa como funcionario gubernamental (pregunta visible al final de la rama).
- Participación en prácticas coercitivas de control poblacional y/o trasplantes forzados (los textos completos de estas últimas requieren revisión precisa).

Se observa **Yes → Explain** para diferentes preguntas, incluyendo terrorismo/genocidio en la prueba. El informe **no conserva** la respuesta elegida ni texto que alguien hubiera introducido.

## 4. Security and Background · Part 4

**Ruta visual:** `/GenNIV/General/complete/complete_securityandbackground4.aspx`.

Se observan **cinco preguntas** Sí/No:
1. Haber estado sujeto a audiencia de remoción/deportación.
2. Haber solicitado u obtenido, o ayudado a otros a obtener, visa, entrada o beneficio migratorio estadounidense mediante fraude o representación falsa deliberada.
3. No haberse presentado a audiencia de remoción o inadmisibilidad en los últimos cinco años.
4. Presencia no autorizada, permanencia excesiva o violación de condiciones de visa de Estados Unidos.
5. Haber sido expulsado o deportado de cualquier país.

Varios ejemplos de respuesta **Yes** muestran un campo `Explain` justo debajo. No trasladar esa explicación a otra pregunta ni presuponer que todas las explicaciones son opcionales.

## 5. Security and Background · Part 5

**Ruta visual:** `/GenNIV/General/complete/complete_securityandbackground5.aspx`.

Se observan **cuatro preguntas** Sí/No:
1. Haber retenido la custodia de un menor ciudadano estadounidense fuera del país, impidiéndola a una persona con custodia legal de un tribunal estadounidense.
2. Haber votado en EE. UU. en violación de alguna ley o reglamento.
3. Haber renunciado a la ciudadanía estadounidense para evitar pagar impuestos.
4. Haber asistido a una escuela primaria pública con estatus F, o a una secundaria pública después de la fecha indicada en CEAC, sin reembolsar a la institución.

En este clip se verifican ejemplos de **Yes → Explain** y se ve el botón **Next Temporary Work Visa**. La fecha específica de la cuarta pregunta y todas sus condiciones requieren cotejo en la pantalla oficial.

## 6. Confirmación de Temporary Work Visa Information

**Ruta exacta visible en la imagen suministrada:** `/GenNIV/General/complete/complete_temporarywork.aspx` (puede llevar parámetros de query). Es la pantalla que sigue después de Seguridad Parte 5 en el recorrido TN mostrado.

Se observa `Where Do You Intend to Work?`:
- `Name of Employer`
- `U.S. Street Address (Line 1)`
- `U.S. Street Address (Line 2) *Optional*`
- `City`
- `State`
- `ZIP Code (if known)`
- `Phone Number`
- `Enter monthly income (in USD)`

**No confundir** el ingreso mensual del puesto TN en USD con `Monthly Income in Local Currency` del empleo actual en Present Work/Education. Para la extensión, conservar campos diferentes y revisar salario y periodicidad del contrato TN antes de cualquier transformación.

## Diseño del cuestionario Águila · Recomendación

- Mantener el **mismo orden y separación en cinco partes** que se observa en CEAC.
- Crear una clave única estable por pregunta, con `answer: 'Sí' | 'No' | sin responder` y `explanation` **solo cuando CEAC la muestre**. No usar una sola casilla de seguridad global.
- El cliente debe responder explícitamente. **No predeterminar «No», no rellenar por cuenta del cliente y no inferir respuestas por nacionalidad, clase de visa o situación laboral**.
- Mostrar al cliente la redacción en español cuidadosamente revisada, con la pregunta inglesa de referencia para los responsables de captura cuando sea necesario; no convertir temas resumidos aquí en redacción jurídica definitiva.
- Antes de habilitar autollenado, verificar **IDs DOM y la asociación inequívoca entre radio Sí/No y el `Explain` respectivo**. Las clases TN/TD/B1-B2 pueden tener secciones comunes, pero las diferencias de edad, categoría y otras ramas se validarán por separado.
- Mantener fotografía, revisión, firma y envío del DS-160 bajo operación humana.

## Cobertura conseguida y brechas restantes

| Aspecto | Estado |
|---|---|
| Ruta visual TN de Personal 1 hasta Seguridad 5 | **Recorrida visualmente** usando videos de las partes anteriores y estos seis clips |
| Pantalla Temporary Work Visa | **Vista**, ruta exacta identificada y campos listados |
| Ramas `Yes → Explain` en Seguridad | **Ejemplos observados** en las cinco páginas; faltan pruebas y asociaciones DOM control por control |
| Todas las alternativas Sí/No, listas, validaciones | **No exhaustivas**; falta inspección de Chrome |
| Mapeo independiente TD-cónyuge y TD-hijo | **Parcial o pendiente**, ver matriz de perfiles |
| Mapeo independiente B1/B2 | **Parcial** |
| Autollenado Chrome más allá de Personal 1 y 2 | **No implementado / no validado** |
| Revisión final y firma CEAC | Operación humana; no automatizar |

**Nota de privacidad y almacenamiento:** esta es la única salida persistente del análisis. No conservar archivos de video ni capturas dentro de Águila o GitHub. El adjunto original en ChatGPT, si permanece, se controla desde la plataforma.
