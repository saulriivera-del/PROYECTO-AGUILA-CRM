# CEAC DS-160: Personal Information 1 — mapeo observado

Origen: salida del Inspector Visa Master compartida por operador el 23 de noviembre de 2026. `host: ceac.state.gov`, `path: /GenNIV/General/complete/complete_personal.aspx`, esquema `vm-ceac-fields-inspection-v1`. Contiene 18 controles visibles, incluyendo el selector global de idioma. **No contiene valores personales.** Los `id` observados podrían cambiar: validar siempre la pantalla activa y el selector exacto.

| Índice | Campo CEAC (sufijo del ID) | Origen Águila | Acción |
|---:|---|---|---|
| 0 | `ddlLanguage` | Ninguno | Ignorar: idioma de la interfaz |
| 1 | `tbxAPP_SURNAME` | `full_name` | **Pendiente**: separar y verificar apellidos; NO inferir automáticamente |
| 2 | `tbxAPP_GIVEN_NAME` | `full_name` | **Pendiente**: separar y verificar nombres; NO inferir automáticamente |
| 3 | `tbxAPP_FULL_NAME_NATIVE` | No existe | Captura/verificación manual |
| 4 | `cbexAPP_FULL_NAME_NATIVE_NA` | No existe | Solo selección manual con respaldo |
| 5–6 | `rblOtherNames_0/1` | No existe | Añadir pregunta por otros nombres usados |
| 7–8 | `rblTelecodeQuestion_0/1` | No existe | Añadir pregunta sobre telecódigo |
| 9 | `ddlAPP_GENDER` | No existe | Añadir campo; códigos observados `M`/`F` |
| 10 | `ddlAPP_MARITAL_STATUS` | `marital_status` | Traducir valores con tabla explícita |
| 11 | `ddlDOBDay` | `birth_date` | Extraer `DD` de fecha ISO verificada |
| 12 | `ddlDOBMonth` | `birth_date` | Convertir mes a `JAN`…`DEC` |
| 13 | `tbxDOBYear` | `birth_date` | Extraer `YYYY` |
| 14 | `tbxAPP_POB_CITY` | `birth_city` | Copia normalizada y confirmación |
| 15 | `tbxAPP_POB_ST_PROVINCE` | `birth_state` o `birth_state_other` | Según país/condiciones, verificar |
| 16 | `cbexAPP_POB_ST_PROVINCE_NA` | No existe | Decisión manual de «Does Not Apply» |
| 17 | `ddlAPP_POB_CNTRY` | `birth_country` | Requiere código CEAC válido; inspector solo captura las primeras 35 opciones |

## Códigos de estado civil observados
`M` MARRIED; `C` COMMON LAW MARRIAGE; `P` CIVIL UNION/DOMESTIC PARTNERSHIP; `S` SINGLE; `W` WIDOWED; `D` DIVORCED; `L` LEGALLY SEPARATED; `O` OTHER.

Propuesta provisional para revisión: `Casado(a) → M`, `Soltero(a) → S`, `Viudo(a) → W`, `Divorciado(a) → D`, `Separado(a) → L` **solo si legalmente separado**. `Unión libre` exige confirmar si corresponde a `C` u otra categoría; no asignar automáticamente.

## Brechas que bloquean autollenado confiable
1. Águila almacena `full_name` como cadena indivisa, sin separación validada de apellidos y nombres.
2. Faltan sexo, otros nombres y telecódigo.
3. Nombre en alfabeto nativo y `Does Not Apply` requieren tratamiento específico.
4. El inspector trunca las opciones del país a 35; antes de generar un diccionario fiable capturar códigos de país de forma completa, sin registrar respuestas personales.
5. La aprobación de sección personal puede estar vigente aunque la información de esta página esté incompleta; **la transferencia automática debe bloquearse** hasta resolver los campos CEAC pendientes.

Esta tabla es un **mapeo de análisis**, no un ejecutor de autollenado. No autoriza firma/envío ni automatización de CAPTCHA.
