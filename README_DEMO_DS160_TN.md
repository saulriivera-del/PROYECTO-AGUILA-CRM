# Visa Master · Demo de formulario DS-160 / TN (8 de noviembre de 2026)

## Objetivo
Mostrar en la reunión con Trade in Motion el flujo **CRM Águila → expediente → precarga → cuestionario simplificado → revisión** con una demostración interna y sin modificar expedientes ni enviar información.

## Fuentes de preguntas
- Sitio actual: https://visamaster.com.mx/tramite
- Google Forms publicado en la página: https://docs.google.com/forms/d/e/1FAIpQLScJcXcb4V_vbHVZSpdC3fpeFIxzOQjiJAUAt7AfgEvF9R5v3w/viewform
- Hoja histórica de respuestas `VISA MASTER FORMATO DS-160 (respuestas)`: se utilizaron **solo los encabezados**, sin importar filas con datos personales. Es una versión anterior; el formulario actual **no pudo verificarse pregunta por pregunta** desde las herramientas disponibles. Validar con el propietario antes de fijar el catálogo.

## Incluye
- Ruta protegida `/admin/demo-ds160`, disponible solo para administradores.
- Selección de expediente asociado a Trade in Motion, mediante lecturas del CRM y sus relaciones con empresas.
- Precarga de nombre, fecha de nacimiento, celular y correo cuando hay datos disponibles.
- Modo B1/B2 y TN; preguntas de trabajo TN solo cuando aplica.
- Secciones navegables, progreso de preguntas esenciales, preguntas condicionadas y resumen de elementos que deben revisarse.
- Correcciones de la revisión del 8 de noviembre: ciudad y estado de nacimiento separados; domicilio particular, laboral, académico y TN por calle, colonia, ciudad, estado, código postal y país; opciones de responsable del pago; alojamiento obligatorio en la captura interna si la estancia supera 24 horas.
- Acompañantes y familiares en EE. UU. como listas repetibles con nombre, parentesco y situación migratoria (cuando aplica); datos de cónyuge actual o anterior condicionados al estado civil.
- Historial con calendarios para última visita, visa previa, cancelación/negativa/robo, lugar de expedición con sedes consulares de México y campos de explicación; antecedentes de problemas migratorios.
- Fechas de nacimiento de padres, domicilio y periodos de escuela, empleo anterior y advertencias de secuencia de fechas.
- Diseño compatible con móvil.

## Seguridad y limitaciones
- No se escriben datos a Supabase, al DS-160 oficial ni a Google Forms.
- Los campos escritos **no se guardan**; se pierden al recargar o salir.
- Las listas y opciones son para reducir errores de captura. NO equivalen todavía a una equivalencia certificada con las opciones oficiales de CEAC: falta validar catálogo, condiciones y campos aplicables antes de cualquier automatización.
- La regla de solicitar alojamiento si se prevén más de 24 horas es un criterio operativo solicitado por Visa Master, no una afirmación sobre los requisitos oficiales del DS-160.
- La opción predeterminada usa un caso ficticio; no probar con datos reales ni mostrar información confidencial a terceros sin autorización.
- Esta demo **no reemplaza ni valida** un DS-160 oficial o la elegibilidad TN; solo es un borrador de recopilación inicial.
- No publicar el formulario al público ni afirmar que guarda avances hasta agregar permisos, persistencia segura y pruebas.

## Próximos pasos
1. Verificar el cuestionario publicado actual contra el catálogo de campos (idioma, obligatoriedad y ramificaciones).
2. Diseñar tabla de borradores separada, con RLS por organización, permisos y auditoría; incluir retención de datos.
3. Conectar guardado y recuperación de borradores al proceso CRM mediante acciones de servidor.
4. Habilitar revisión humana para respuestas sensibles y campos oficiales que no pueden asumirse.
5. Añadir formulario del candidato protegido con consentimiento y revisar avisos de privacidad.
6. Probar en un entorno de vista previa antes de fusionar a `main`.

## Cómo probar
En una instancia de desarrollo del CRM con credenciales de administrador, abrir `/admin/demo-ds160`. Empezar con **Caso ficticio**, recorrer las secciones y alternar entre B1/B2 y TN. Elegir un expediente vinculado solo cuando se requiera enseñar la precarga y se cuente con autorización.
