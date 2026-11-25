# DS-160 · TN · Continuación del recorrido: contacto en EE. UU., familia y arranque de trabajo

**Revisión:** 25 de noviembre de 2026. Continuación de `docs/ds160-tn-part1-to-passport-20261125.md`.

**Fuente:** tres videos cortos/largos de un recorrido supervisado de prueba tras la pantalla de Pasaporte. **Persistencia exclusivamente textual:** conservar únicamente títulos, preguntas, opciones y ramas visibles. No guardar, transcribir ni publicar nombres, direcciones, teléfonos, correos, números de solicitud ni valores identificables visibles en los videos; no subir archivos multimedia, audio ni capturas a GitHub/Águila.

**Precisión:** observación visual de las pantallas, **sin inspección del DOM ni confirmación de códigos HTML**. Las variantes de rama corresponden a cambios manuales del operador, no a una respuesta presupuesta para un cliente. La confirmación de tipos de visa y rutas exactas mediante la extensión queda pendiente.

## Parte 2 — U.S. Point of Contact Information

**Pantalla:** `U.S. Point of Contact Information`, después de Pasaporte.

### Estructura observada

- Encabezado `Contact Person or Organization in the United States`.
- `Contact Person` con campos separados **Surnames** y **Given Names**, con opción `Do Not Know` en los controles que la muestren.
- `Organization Name` con opción `Do Not Know`.
- `Relationship to You` con menú visible de relación:
  - `RELATIVE`
  - `SPOUSE`
  - `FRIEND`
  - `BUSINESS ASSOCIATE`
  - `EMPLOYER`
  - `SCHOOL OFFICIAL`
  - `OTHER`
  - Opción inicial de selección (`-SELECT ONE-`).
- `Address and Phone Number of Point of Contact`: `U.S. Street Address (Line 1)`, `U.S. Street Address (Line 2) *Optional*`, `City`, `State`, `ZIP Code (if known)`, `Phone Number`, `Email Address` con `Does Not Apply` visible.
- Se muestra que la relación cambia mediante catálogo desplegable; no se demostró que este cambio agregue otros campos condicionales.

**Implicación Águila:** el contacto en EE. UU. debe ser una **sección separada** con persona u organización, relación, domicilio, teléfono y email; no utilizar automáticamente `tn_employer` como si fuese siempre contacto. Diferenciar `Do Not Know` de ausencia de respuesta y distinguir la relación `EMPLOYER` de `BUSINESS ASSOCIATE`.

**Observación:** la segunda grabación breve sigue en esta pantalla, muestra más alternativas del catálogo y luego entra en Familia. No usarla como evidencia de que el solicitante debe elegir una relación concreta.

## Parte 3 — Family Information: Relatives

**Pantalla:** `Family Information: Relatives`.

### Padres

- `Father's Full Name and Date of Birth`: `Surnames`, `Given Names`, `Date of Birth`; donde CEAC lo muestra, casilla `Do Not Know`.
- `Is your father in the U.S.?` → **Yes / No**.
- `Mother's Full Name and Date of Birth`: `Surnames`, `Given Names`, `Date of Birth`; donde CEAC lo muestra, `Do Not Know`.
- `Is your mother in the U.S.?` → **Yes / No**.

### Familiares en EE. UU.

- `Do you have any immediate relatives, not including parents, in the United States?` → **Yes / No**.
- **Si Yes**, aparece un bloque con `Surnames`, `Given Names`, `Relationship to You`, `Relative's Status`. Los catálogos se despliegan, pero el video no ofrece una lectura suficientemente fiable de **todas** sus opciones ni sus códigos; verificar en el inspector.
- `Do you have any other relatives in the United States?` → **Yes / No**. La presencia de esta pregunta es independiente de familiares inmediatos; no se debe fusionar.

**Implicación Águila:** `father_name`/`mother_name` hoy son textos completos, no pares apellido/nombres. `family_us` no distingue **familiar inmediato** de **otro familiar**, ni pregunta si los padres están en EE. UU. No asumir el estatus migratorio de un familiar.

## Parte 4 — Estado civil y Family Information: Spouse / Former Spouse

Durante la grabación, el operador **regresa a Personal Information 1 y cambia el estado civil** para explorar distintas pantallas de familia. Esto demuestra que las rutas de datos de cónyuge y excónyuge deben mapearse **por separado**. No demuestra que todas sean exclusivas de la visa TN; estas ramas dependen de condiciones del formulario.

### Spouse (cónyuge actual)

**Pantalla:** `Family Information: Spouse`.

- `Spouse's Full Name (include Maiden Name)`: `Spouse's Surnames`, `Spouse's Given Names`.
- `Spouse's Date of Birth` (día/mes/año).
- `Spouse's Country/Region of Origin (Nationality)` (select).
- `Spouse's Place of Birth`: `City` (puede incluir `Do Not Know`), `Country/Region`.
- `Spouse's Address` (desplegable con categorías de dirección). La grabación no permite verificar con seguridad la lista completa.

**Diferencia Águila:** `spouse_name` almacena un texto único; `spouse_birth_date`, `spouse_birth_city`, `spouse_birth_country` existen, pero faltan apellido/nombres separados, nacionalidad propia del cónyuge y elección exacta de dirección de residencia según CEAC.

### Former Spouse (excónyuge)

**Pantalla:** `Family Information: Former Spouse`.

- `Number of Former Spouses` (cantidad).
- `Former Spouse Information`: `Surnames`, `Given Names`, `Date of Birth`.
- `Country/Region of Origin (Nationality)`.
- `Place of Birth`: ciudad (con `Do Not Know` en la pantalla) y país/región.
- `Date of Marriage`, `Date Marriage Ended` (fechas separadas).
- La captura muestra el formulario de un excónyuge; **no afirma** que las opciones para varios excónyuges o todas las causas de terminación estén completamente visibles. Corroborar las condiciones y posibles campos extra con CEAC.

**Diferencia Águila:** `former_spouse_name` y datos de nacimiento no cubren **cantidad de matrimonios previos**, sus fechas de inicio/fin ni una colección de varios excónyuges; no suponer uno solo.

### Marital Status observado en lista

La grabación vuelve a `Personal Information 1` y despliega opciones de estado civil. Se reconocen categorías como `MARRIED`, `COMMON LAW MARRIAGE`, `CIVIL UNION/DOMESTIC PARTNERSHIP`, `SINGLE`, `WIDOWED`, `DIVORCED`, `LEGALLY SEPARATED` y `OTHER`, ya registradas en la parte 1. No se ha comprobado con precisión qué subpantalla dispara **cada** opción: comprobar cada rama sin inventar equivalencias.

## Inicio observado — Present Work/Education/Training Information

La tercera grabación **alcanza el inicio** de `Present Work/Education/Training Information` y la parte de empleo actual.

Se ven campos como `Primary Occupation`, `Present Employer or School Name`, dirección del empleador/institución (`Street Address`, `City`, `State/Province`, `Postal Zone/ZIP Code`, `Country/Region`), `Start Date`, `Monthly Income in Local Currency (if employed)` y `Briefly Describe your Duties`. La aparición de unos u otros puede depender de ocupación. **No se ha revisado aún la sección completa ni todas las ramas**; la siguiente grabación debe comenzar aquí.

**Implicación Águila:** contrastar `job_title`, `employer_*`, `job_start`, `monthly_income` y funciones con el catálogo exacto de `Primary Occupation`. No equiparar automáticamente un cargo propio con la opción oficial de ocupación ni sustituir `tn_employer` por empleador actual.

## Resumen de pendientes por implementar

| Prioridad | Pantalla | Pendientes Águila |
|---|---|---|
| Alta | U.S. Point of Contact | Persona / empresa, relación CEAC, domicilio, teléfono, email y `Do Not Know` |
| Alta | Family / Relatives | Padres en EE. UU., familiares inmediatos y otros, relación y estatus por persona |
| Alta | Family / Spouse | Apellidos y nombres por separado, nacionalidad, domicilio del cónyuge |
| Alta | Family / Former Spouse | Número de excónyuges, colección repetible, fechas de matrimonio y finalización |
| Por mapear | Present Work/Education | Completar tipos de ocupación, ramas y detalles de empleo/estudio |

## Estado de evidencia y reglas de desarrollo

- **TN:** estas pantallas se observaron dentro del recorrido de prueba TN. Preguntas familiares y de contacto podrían aparecer también en TD/B1-B2; **verificar** antes de declararlas comunes o exclusivas.
- **TD y B1/B2:** no se inspeccionaron sus diferencias en estas tres grabaciones.
- Todo elemento mencionado proviene de pantalla visible o de la **comparación explícita** con claves existentes de Águila; no se han obtenido IDs ni códigos HTML oficiales de la grabación.
- **No publicar nuevas respuestas por defecto** sobre padres, familiares, cónyuges, datos migratorios o estado civil. Deben declararse y verificarse.
- No habilitar autollenado ni inferir datos de clientes hasta completar capturas de estructura con el inspector y revisiones supervisadas.
- **No conservar** videos, audio, fotogramas, screenshots ni datos personales. En GitHub quedan únicamente estas notas.

## Continuidad

La siguiente grabación del recorrido TN debe continuar por `Present Work/Education/Training` y, cuando corresponda, educación anterior, preguntas adicionales y las secciones siguientes. Añadirla como otro documento text-only y vincularla con esta parte y con `docs/ds160-tn-part1-to-passport-20261125.md`.
