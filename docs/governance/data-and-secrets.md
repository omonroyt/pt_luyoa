# Datos, secretos y privacidad

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-11-04 |
| Responsable | Oscar Monroy |

---

## 1. Clasificación

| Clase | Ejemplos | Dónde puede vivir | Quién o qué puede leerlo |
|---|---|---|---|
| **Secreto** | `LUYOA_API_KEY`, `OPENROUTER_API_KEY`, `APPROVAL_SECRET`, `MCP_SERVICE_TOKEN`, `CRON_SECRET`, `DEMO_ACCESS_CODE`, las llaves y tokens de cada negocio (`LUYOA_API_KEY_<NEGOCIO>`, `MCP_SERVICE_TOKEN_<NEGOCIO>`), tokens de BD | `.env` local (ignorado por git) y variables de entorno cifradas del despliegue | Solo el proceso del servidor. **Nunca** el navegador, el modelo, las trazas, el repositorio ni el asistente de desarrollo |
| **Personal (ficticio)** | Nombre, teléfono, correo, historial individual de un cliente | Solo en la API de Luyoa | El MCP cuando una herramienta lo necesita; se tratan como datos personales reales aunque sean ficticios |
| **Interno** | Agregados de ventas, visitas, segmentos, campañas, trazas, preferencias del negocio | BD de la app, respuestas del agente, reportes de evaluación | La app, el modelo (agregados) y el equipo |
| **Público** | Código, documentación, `.env.example`, configuración de `.claude/` | Repositorio | Cualquiera |

## 2. Reglas de secretos

1. Los secretos solo se definen en `.env` (local) o en las variables de entorno del despliegue. `.env.example` lista las variables **sin valores**.
2. `.env` y `.env.*` (excepto `.env.example`) están en `.gitignore`.
3. El asistente de desarrollo **no puede leer ni editar `.env`**: lo bloquean los permisos de `.claude/settings.json` y el hook `.claude/hooks/guard-files.mjs`. Tampoco puede imprimir variables de entorno con secretos (hook `guard-bash.mjs`).
4. Nunca se registran: ni en consola, ni en trazas, ni en mensajes de error. La configuración se valida sin mostrar valores.
5. Ninguna variable con secreto usa el prefijo `NEXT_PUBLIC_`.
6. gitleaks revisa los archivos en stage (`pre-commit`) y todo el historial (CI).
7. Si una llave se expone: se genera otra en el portal (la anterior queda inválida) y se sigue el procedimiento de incidentes de la [política de gobernanza](ai-governance-policy.md) §9.

## 3. Minimización de datos personales

Principios alineados con la LFPDPPP (licitud, finalidad, proporcionalidad) aplicados a datos ficticios como si fueran reales:

| Regla | Aplicación |
|---|---|
| El modelo trabaja con agregados | Las herramientas devuelven conteos, sumas, tasas y segmentos, no listados de personas |
| Ids en lugar de datos de contacto | Si una herramienta devuelve clientes, usa id y atributos de negocio (segmento, visitas), nunca teléfono ni correo |
| Consentimiento por canal | Solo se cuenta y se contacta a `reachable`, que ya excluye a quienes no dieron consentimiento |
| Trazas sin datos personales | Las trazas guardan entradas y salidas **resumidas**, sin datos de contacto |
| Sin perfilado individual | El agente no infiere ni guarda rasgos personales de clientes; la memoria solo guarda preferencias del negocio |

## 4. Datos que recibe el proveedor del modelo

| Se envía | No se envía |
|---|---|
| Prompt del sistema, contexto del negocio, preguntas de la usuaria | Llaves, tokens, `.env` |
| Resultados agregados de herramientas con su `source` | Teléfonos, correos o nombres completos de clientes |
| Preferencias del negocio | Trazas completas de otras conversaciones |

## 5. Retención

| Dato | Retención |
|---|---|
| Conversaciones y trazas locales | Mientras dure el proyecto; se pueden borrar desde la BD local |
| Conversaciones y trazas de la demo publicada | Hasta el cierre del proceso de evaluación; luego se borran |
| Reportes de evaluación | Se versionan en el repositorio (no contienen datos personales ni secretos) |
| Campañas creadas en la API | Las administra la API de Luyoa (envío simulado) |
