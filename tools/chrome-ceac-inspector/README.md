# Visa Master · Inspector CEAC (piloto técnico)

Extensión de Chrome Manifest V3 de inspección **local** de estructura, sin acceso a datos personales de Águila ni modificación del sitio CEAC. Sirve para obtener `id`, `name`, `type`, `tag`, etiquetas y opciones de selección de campos visibles **sin leer valores introducidos**.

## Uso de prueba
1. Descargar/copiar esta carpeta desde el repositorio aprobado y abrir `chrome://extensions` con modo desarrollador.
2. Pulsar **Cargar descomprimida** y elegir `tools/chrome-ceac-inspector`.
3. Navegar manualmente a [CEAC DS-160](https://ceac.state.gov/GenNIV/), iniciar o recuperar una solicitud siguiendo las instrucciones oficiales y resolver cualquier comprobación humana manualmente.
4. En una página interna de datos personales, abrir la extensión y pulsar **Inspeccionar esta página**.
5. Revisar/copiar el JSON de metadatos para crear y probar un mapeo explícito de campos. Nunca copiar contenido de respuesta del solicitante.

## Barreras
- Solo se ejecuta al pulsar la extensión en la pestaña activa de `ceac.state.gov/GenNIV/`.
- Permisos `activeTab` y `scripting`; sin permisos globales, almacenamiento ni llamadas remotas.
- No lee `value`, `checked`, cookies, almacenamiento o credenciales.
- No escribe en formularios, no hace clic en **Next**, **Sign** o **Submit**, no responde CAPTCHA.
- No contiene autollenado. El siguiente cambio necesita validar los selectores de cada pantalla y obtener autorización humana por pantalla.
- No necesita ni debe contener datos privados de Mariana.

**Atención:** CEAC no almacena un borrador indefinidamente: consulta las reglas oficiales de guardado y recuperación; la solicitud definitiva debe ser firmada y enviada por el solicitante o conforme a las reglas de representación aplicables.
