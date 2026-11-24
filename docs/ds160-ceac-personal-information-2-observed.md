# CEAC DS-160 · Personal Information 2 — mapeo observado

Fuente: inspección compartida por el operador, ruta CEAC `/GenNIV/General/complete/complete_personalcont.aspx`; esquema `vm-ceac-fields-inspection-v1`. **10 controles visibles** en el estado observado (uno global de idioma y nueve de la sección). No se capturaron valores del solicitante. Los controles condicionales o no visibles pueden aparecer tras responder Sí/No y requieren inspección adicional.

| Índice | Sufijo de control CEAC | Correspondencia en Águila | Tratamiento |
|---:|---|---|---|
| 0 | `ddlLanguage` | — | Ignorar: idioma de interfaz |
| 1 | `ddlAPP_NATL` | `nationality` | Equivalencia conceptual, pero convertir nacionalidad a código exacto CEAC. Inspector solo recogió las primeras 35 opciones. |
| 2 y 3 | `rblAPP_OTH_NATL_IND_0`, `_1` | No existe | Preguntar si posee o poseyó otra nacionalidad. Según respuesta CEAC puede mostrar campos adicionales. No asumir «No». |
| 4 y 5 | `rblPermResOtherCntryInd_0`, `_1` | No existe | Preguntar si tiene residencia permanente en otro país distinto de su nacionalidad. Inspeccionar controles adicionales si responde «Sí». |
| 6 | `tbxAPP_NATIONAL_ID` | No existe | Número de identificación nacional, sujeto a las instrucciones de CEAC y al país de nacionalidad; no deducir automáticamente de otros documentos. |
| 7 | `cbexAPP_NATIONAL_ID_NA` | No existe | «Does Not Apply»: permitir solo por decisión explícita y justificada. |
| 8 | `cbexAPP_SSN_NA` | No existe | «Does Not Apply» de número de Seguro Social estadounidense: no marcar automáticamente. El campo de número no estaba visible en esta captura. |
| 9 | `cbexAPP_TAX_ID_NA` | No existe | «Does Not Apply» de número de identificación fiscal estadounidense: no marcar automáticamente. El campo de número no estaba visible en esta captura. |

## Preguntas nuevas sugeridas para el cuestionario Águila
- ¿Tiene o ha tenido otra nacionalidad? Sí/No. Si «Sí», pedir países y datos correspondientes conforme se verifique la aparición de campos condicionales.
- ¿Es residente permanente de un país distinto del de su nacionalidad? Sí/No. Si «Sí», solicitar países y detalles exigidos.
- Número de identificación nacional, o justificación de «No aplica» si corresponde.
- ¿Tiene número de Seguro Social estadounidense? Sí/No. En su caso, capturar número; en caso contrario evaluar «No aplica».
- ¿Tiene número de identificación fiscal estadounidense? Sí/No. En su caso, capturar número; en caso contrario evaluar «No aplica».

## Límites y pendientes
1. El inspector detecta solo controles visibles con el formulario en su estado actual; **no demuestra** que no existan campos ocultos/condicionales.
2. Hay que inspeccionar de nuevo **sin copiar valores** cuando cada opción «Sí» revele más campos.
3. No se dispone aún de la lista completa de valores del desplegable de nacionalidad; nunca seleccionar códigos por posición ni por adivinación.
4. La pantalla no debe autocompletarse hasta incorporar estas preguntas, validar los datos del solicitante y obtener su aprobación.
5. No firmar ni enviar solicitudes de prueba. La extensión continúa siendo un inspector de metadatos, sin autollenado.
