# Visa Master · Cuaderno de mapeo completo DS-160

**Estado:** diseño incremental. Sólo los selectores de Datos personales 1 y 2 tienen un mapeo preliminar probado con datos sintéticos. El resto de rutas, nombres de campos y opciones se documentará a partir de la inspección de cada página CEAC **realmente visible**; no se inventan controles.

**Extensión v0.4.1:** el mapa de ramas condicionales por perfil TN, TD y B1/B2 se trabaja en `docs/ds160-tn-td-b1b2-conditional-matrix.md`. La extensión compara estructuras **antes y después de una respuesta manual** y las clasifica por perfil y ruta, sin leer respuestas del solicitante.

## Política de manejo de videos de prueba

Por solicitud del responsable de Visa Master, los videos se usan **solo como fuente temporal** para identificar preguntas, etiquetas, opciones, rutas y condiciones. Documentar las observaciones como texto dentro de este cuaderno y la matriz de TN/TD/B1-B2, sin copiar datos personales y sin subir videos, audio ni capturas al repositorio o a Águila. Eliminar los archivos de trabajo temporales al concluir la revisión.

La retención de **archivos adjuntos originales en ChatGPT** no está controlada por GitHub ni por este procedimiento; su eliminación requiere controles del usuario en el producto correspondiente. No se debe prometer que borrar copias locales elimina el adjunto original.

## Procedimiento para leer cada página

1. Abre CEAC con **una solicitud de prueba**, resuelve CAPTCHA y navegación manualmente.
2. En cada pantalla pulsa **Mapear esta pantalla (sin datos personales)** dentro de la extensión Chrome v0.4.0.
3. Copia el JSON de **estructura**: contiene ruta `/GenNIV/General/complete/…aspx`, IDs, tipos y opciones de listas desplegables; **nunca valores escritos, respuestas seleccionadas, cookies o Application ID**.
4. Registra aparte, mediante observación humana, **enunciado de la pregunta**, instrucciones visibles, si es obligatoria, si admite `Does Not Apply`, y condiciones que muestran más campos.
5. Si aparece una rama `Sí/No`, captura una inspección para **cada rama** pertinente usando únicamente datos ficticios. No accedas a solicitudes ajenas ni envíes la prueba.
6. Crea una fila de mapeo por campo. No autorices autollenado hasta aprobar coincidencia inequívoca de **ID + tipo + catálogo**, y datos autorizados del cliente.
7. Guarda las anotaciones correspondientes en el cuestionario de Águila, **en español, en el mismo orden lógico**, con ayuda breve. No copiar respuestas de CEAC a Águila automáticamente.

## Estructura de una fila de mapeo

| Propiedad | Función |
|---|---|
| `pageKey` / `path` | Identidad **independiente** de cada página de CEAC |
| `ceacId` / `type` | Selector y tipo de control observados |
| `ceacLabel` | Enunciado que confirma visualmente el operador |
| `aguilaKey` | Dato equivalente en el cuestionario |
| `transform` | Convertir fecha, país, catálogo o nombre sin inferir |
| `requiredWhen` / `visibleWhen` | Cuándo pide CEAC el dato |
| `candidateHelp` | Nota de orientación al cliente (español) |
| `defaultPolicy` | Sólo valores inocuos, por ejemplo **México preseleccionado** si el país está vacío; jamás responder automáticamente preguntas migratorias |
| `validation` | Formato, comparación documental y confirmaciones |
| `status` | Observado / pendiente / probado sintético / verificado en navegador |

## Inventario inicial (rutas futuras por inspeccionar)

| Bloque del DS-160 | Datos actuales de Águila | Pendientes concretos |
|---|---|---|
| Datos personales 1 | `full_name`, `curp_paterno`, `curp_materno`, `curp_sexo`, `marital_status`, `birth_*`, `other_names_used`, `name_telecode` | Validar catálogo CEAC y las dos preguntas condicionales en navegador |
| Datos personales 2 | `nationality`, `curp_valor` confirmado | Otras nacionalidades, residencia permanente, SSN e identificación fiscal requieren preguntas explícitas |
| Información del viaje | `travel_*`, `tn_*` | Clasificación de visa, motivo y detalles de itinerario sujetos a la solicitud concreta |
| Acompañantes | `people.companions`, `travel_with_someone` | Condiciones y datos de cada acompañante |
| Viajes anteriores a EE. UU. | `visited_us`, `prior_visa`, `visa_denial`, `us_immigration_problem` | Ramas, cantidad de entradas, visa previa y preguntas exactas |
| Domicilio, teléfono y redes sociales | `home_*`, `phone`, `email`, `social_*` | Formato de teléfono, direcciones alternativas y cada identificador de red |
| Pasaporte | `passport_*` | Tipo, país emisor, libro, emisión y casos de pérdida |
| Contacto en EE. UU. | Parte de `tn_employer` y direcciones de trabajo | Determinar quién es el contacto y su relación; no suponer que siempre es el empleador |
| Familia y cónyuge | `father_*`, `mother_*`, `family_us`, `spouse_*`, `former_spouse_*` | Ramas de situación migratoria y datos de familiares |
| Trabajo / educación | `employer_*`, `previous_employer_*`, `school_*`, `education_level` | Historial completo, cargos, funciones, fechas, y preguntas que aún faltan |
| Preguntas de seguridad y antecedentes | Sin bloque equivalente verificado en Águila | Captura fiel de cada pregunta y sus subpreguntas; nunca marcar «No» por defecto |
| Fotografía, revisión, firma y envío | No automatizados | Operación exclusivamente humana; no CAPTCHAs ni firma automatizada |

**Importante:** esta tabla no certifica que el orden ni los títulos sean idénticos a CEAC en todas sus rutas. La inspección real es la fuente de referencia para crear el mapeo de cada página.

## Criterios para anotaciones de cliente

- **Ayuda breve junto al campo:** qué documento revisar y cómo escribir la respuesta (por ejemplo «como aparece en tu pasaporte»).
- **Rama condicional:** cuando el cliente selecciona «Sí», mostrar sólo las preguntas adicionales que aplican; cuando selecciona «No», no inventar información.
- **¿No aplica?:** explicar por qué podría no aplicar sin marcar automáticamente la opción de CEAC.
- **País de nacimiento:** México preseleccionado únicamente si no existe respuesta previa; seleccionar otro país requiere aviso y confirmación.
- **Datos sensibles:** identificar los que requieren cotejo documental y revisión de Mariana antes de enviarlos a la extensión.
- **Texto de respuesta:** usar opciones equivalentes a CEAC. Si la categoría no existe o es ambigua, dejarla pendiente en vez de elegir arbitrariamente.
- **Nombres:** separar nombres y apellidos de forma determinista. No inferir nombres a partir de texto ambiguo.
- **Seguridad:** no asignar respuestas automáticas a antecedentes criminales, salud, inmigración, familiares o declaraciones juradas.

## Registro de avance

| Pantalla | Estructura inspeccionada | Correspondencia Águila | Prueba con datos ficticios |
|---|---|---|---|
| Personal Information 1 | Sí, parcialmente | Piloto v0.3.3 | Pendiente de corroboración completa en CEAC |
| Personal Information 2 | Sí, parcialmente | Piloto v0.3.3 | Pendiente |
| Travel Companions Information | Sí, por observación visual de ramas Sí/No y catálogo de parentescos | `travel_with_someone`, `people.companions`; faltan campos de grupo y separar apellidos | Pendiente de inspector y prueba de autollenado |
| Resto | No | Por levantar | Pendiente |

En cada nueva inspección, agregar la ruta exacta y los campos condicionales al registro antes de ampliar el código de llenado. La **extensión reconoce la página por su ruta**, de modo que no se confundan campos entre pantallas.
