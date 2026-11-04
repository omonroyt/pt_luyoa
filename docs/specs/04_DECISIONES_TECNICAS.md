# Registro de decisiones técnicas (ADR)

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador) |
| Fecha | 2026-11-04 |
| Relacionados | [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md) |

> Una entrada por decisión: contexto, decisión, alternativas y consecuencias. Estados: **Aceptada**, **Propuesta** (se confirma al implementar o medir), **Reemplazada**.
>
> Este registro alimenta el documento de decisiones entregable (D-03), que será su versión breve.

## Índice

| ADR | Decisión | Estado |
|---|---|---|
| ADR-01 | TypeScript de punta a punta | Aceptada |
| ADR-02 | Monorepo con pnpm workspaces | Aceptada |
| ADR-03 | Next.js (App Router) para interfaz y backend | Aceptada |
| ADR-04 | El MCP vive en la app, con transporte HTTP y stdio | Aceptada |
| ADR-05 | SDK oficial de MCP para TypeScript | Aceptada |
| ADR-06 | AI SDK de Vercel como framework del agente | Aceptada |
| ADR-07 | Bloques visuales como herramientas de presentación | Aceptada |
| ADR-08 | Aprobación con doble candado | Aceptada |
| ADR-09 | Las cifras las calcula el MCP; el agente las verifica | Aceptada |
| ADR-10 | Drizzle + libSQL (SQLite local, Turso en la nube) | Aceptada |
| ADR-11 | Trazas propias en BD, OpenTelemetry opcional | Aceptada |
| ADR-12 | Evaluaciones: verificaciones deterministas + juez con rúbrica | Aceptada |
| ADR-13 | Elección de modelo por medición | Propuesta |
| ADR-14 | Vercel + Turso para la demo publicada | Propuesta |
| ADR-15 | Recharts para gráficas | Aceptada |
| ADR-16 | Multi-negocio por configuración aislada | Aceptada |
| ADR-17 | Manejo de secretos y escaneo | Aceptada |
| ADR-18 | TypeScript 6.0 en lugar de 7 | Aceptada |
| ADR-19 | Arneses de calidad y gobernanza para el desarrollo con IA | Aceptada |

---

## ADR-01 · TypeScript de punta a punta

- **Contexto:** hay que construir MCP, agente, interfaz y evaluaciones en una semana, y explicarlo y modificarlo en la entrevista.
- **Decisión:** TypeScript en todo (Node LTS), con modo estricto.
- **Alternativas:** Python (FastMCP + PydanticAI + FastAPI) con frontend en React o Streamlit.
- **Por qué:** un solo lenguaje y un solo sistema de tipos de la API a la interfaz; los esquemas zod se comparten entre MCP, agente y UI; el ecosistema de UI generativa (AI SDK) y el despliegue sin servidor (Vercel) son más directos.
- **Consecuencias:** se pierde el ecosistema de análisis de datos de Python, que aquí no hace falta porque la API ya agrega.

## ADR-02 · Monorepo con pnpm workspaces

- **Decisión:** un repositorio con `apps/web`, `packages/mcp-server`, `packages/shared` y `evals/`.
- **Alternativas:** un solo paquete; Turborepo o Nx.
- **Por qué:** separa el MCP (reutilizable por cualquier cliente) del resto sin la complejidad de una herramienta de build adicional.
- **Consecuencias:** scripts en la raíz para levantar, probar y evaluar con un comando.

## ADR-03 · Next.js (App Router) para interfaz y backend

- **Decisión:** Next.js aloja la interfaz y las rutas `/api/chat`, `/api/mcp`, `/api/approvals` y `/api/cron/weekly`.
- **Alternativas:** Vite + React con un servidor Express o Hono aparte; Remix.
- **Por qué:** un solo proceso en local y un solo despliegue en la nube; integración de primera con el AI SDK y con Vercel.
- **Consecuencias:** el límite de duración de funciones en Vercel obliga a acotar los pasos del agente y los reintentos (ya es un objetivo por costo y latencia).

## ADR-04 · El MCP vive en la app, con transporte HTTP y stdio

- **Contexto:** el MCP debe funcionar contra la API (R-01) y la demo debe abrirse sin instalar nada (X-01).
- **Decisión:** el núcleo es el paquete `@alborada/mcp-server`. Se expone por **Streamable HTTP** en `/api/mcp` (lo usa el agente) y por **stdio** con un CLI (para Claude Desktop o el Inspector de MCP).
- **Alternativas:** servicio MCP separado (Render, Fly); llamar las funciones del núcleo sin protocolo MCP.
- **Por qué:** el agente sí habla MCP de verdad (no es un atajo), pero sin una segunda infraestructura. Poder conectarlo a Claude Desktop demuestra que las herramientas sirven a cualquier agente (CA-M08).
- **Consecuencias:** el endpoint `/api/mcp` necesita autenticación propia (token de servicio por negocio) para no quedar abierto en la demo publicada.

## ADR-05 · SDK oficial de MCP para TypeScript

- **Decisión:** `@modelcontextprotocol/sdk` con esquemas zod. Para montar el transporte HTTP en una ruta de Next.js se evalúa el adaptador `mcp-handler` de Vercel; si da problemas, se usa directamente el transporte Streamable HTTP del SDK.
- **Alternativas:** FastMCP para TypeScript; implementación propia de JSON-RPC.
- **Por qué:** es la referencia del protocolo, está mantenido y es lo que un evaluador espera ver.
- **Consecuencias:** versiones exactas se fijan al crear el repositorio.

## ADR-06 · AI SDK de Vercel como framework del agente

- **Decisión:** AI SDK Core (`streamText` con tope de pasos) y AI SDK UI (`useChat`), con el proveedor de OpenRouter y el cliente MCP del propio SDK.
- **Alternativas:**
  - Bucle propio sobre la API de OpenRouter: máximo control, pero hay que reescribir streaming, partes de herramientas y aprobaciones.
  - Mastra: agentes, memoria y evals integrados, pero más abstracción que explicar en la entrevista.
  - LangGraph.js: potente para grafos complejos; aquí el flujo es un solo agente con herramientas.
  - OpenAI Agents SDK: centrado en OpenAI; con OpenRouter funciona, pero la UI generativa no es su fuerte.
- **Por qué:** resuelve justo lo que se necesita (streaming, herramientas que se dibujan como componentes, herramientas que esperan confirmación de la persona, cliente MCP, telemetría) con poco código propio. El bucle sigue siendo explícito y fácil de leer.
- **Consecuencias:** se depende de las convenciones del AI SDK para las partes de mensajes; se fija la versión mayor.

## ADR-07 · Bloques visuales como herramientas de presentación

- **Contexto:** el agente debe elegir el formato de cada respuesta (R-05) y la interfaz debe referenciar los datos usados (B-06).
- **Decisión:** `show_chart`, `show_table`, `show_kpis`, `show_campaign_card` y `cite_sources` son herramientas con esquema zod. Cuando el modelo las llama, la interfaz dibuja el componente. Cada bloque incluye los `source.id` que lo respaldan.
- **Alternativas:**
  - Salida estructurada final (un JSON con todos los bloques): más rígida y peor para el streaming.
  - Bloques de código en markdown (por ejemplo, un bloque `chart`): frágil de interpretar y sin validación.
- **Por qué:** la elección de formato queda explícita en la traza ("llamó a `show_chart` porque compara categorías"), los datos se validan con el mismo esquema en servidor y cliente, y se puede verificar cada número antes de mostrarlo.
- **Consecuencias:** el modelo debe ser bueno llamando herramientas; esto entra en la comparación de modelos.

## ADR-08 · Aprobación con doble candado

- **Contexto:** nada se crea ni se envía sin aprobación (R-06), y el puntaje del agente premia pedir aprobación antes de actuar.
- **Decisión:**
  1. **Candado en el agente:** las escrituras se piden con `request_draft_approval` y `request_send_approval`, herramientas sin ejecución en servidor que la interfaz resuelve con los botones de la tarjeta.
  2. **Candado en el MCP:** `create_campaign_draft` y `send_campaign` exigen un token HMAC de un solo uso emitido por `/api/approvals`, ligado a la acción, al negocio, al id de campaña y al hash del contenido aprobado, con expiración corta.
- **Alternativas:** confiar solo en el prompt; quitar al agente las escrituras y que solo la interfaz llame la API.
- **Por qué:** el prompt no es una garantía. Quitarle las escrituras al agente cumple el control, pero rompe "el agente crea el borrador". Con dos candados, el agente conduce el flujo y la garantía es criptográfica.
- **Consecuencias:** hay que probar ambos candados (CA-C02, CA-C03, CA-M07) y el caso "mándala" (CA-C04, CA-N04).

## ADR-09 · Las cifras las calcula el MCP; el agente las verifica

- **Contexto:** veracidad = 30 puntos. Los modelos se equivocan en restas, porcentajes y normalizaciones.
- **Decisión:** variaciones, porcentajes, normalización por día, lift, costo de oferta e impacto esperado se calculan en código dentro de las herramientas. Un **verificador de cifras** comprueba que cada número de un bloque visual exista en alguna fuente citada; las evaluaciones aplican la misma verificación al texto final.
- **Alternativas:** dejar que el modelo calcule a partir de datos crudos; herramienta de calculadora genérica.
- **Por qué:** reduce el espacio de error del modelo a elegir y explicar; los cálculos tienen pruebas unitarias.
- **Consecuencias:** las herramientas deben anticipar las métricas que se necesitan. Si falta una, se agrega una herramienta, no se le pide al modelo que la calcule.

## ADR-10 · Drizzle + libSQL (SQLite local, Turso en la nube)

- **Decisión:** Drizzle ORM sobre libSQL: archivo SQLite en desarrollo (sin instalar nada) y Turso para la demo publicada.
- **Alternativas:** Postgres (Neon, Supabase); Vercel KV o Redis; archivos JSON.
- **Por qué:** el mismo motor en local y en la nube, sin servidores que levantar; suficiente para conversaciones, trazas, memoria y aprobaciones.
- **Consecuencias:** sin búsquedas complejas; no se necesitan.

## ADR-11 · Trazas propias en BD, OpenTelemetry opcional

- **Decisión:** cada paso (llamada al modelo, herramienta, bloque, aprobación) se guarda en `TRACE_STEP` con entrada resumida, razón, latencia, tokens y costo, y se muestra en el panel de trazas. La telemetría OpenTelemetry del AI SDK se puede enviar a Langfuse configurando una variable de entorno.
- **Alternativas:** solo Langfuse o LangSmith; solo registros en consola.
- **Por qué:** el evaluador ve las trazas dentro de la misma interfaz sin cuentas externas (B-03). La salida opcional a Langfuse da una vista profesional sin depender de ella.
- **Consecuencias:** la "razón" de cada herramienta se obtiene pidiéndole al modelo un campo `reason` breve en las llamadas, lo que cuesta unos pocos tokens.

## ADR-12 · Evaluaciones: verificaciones deterministas + juez con rúbrica

- **Decisión:** corredor propio en TypeScript (`evals/run.ts`) que ejecuta cada caso contra el agente real y califica con:
  - **Deterministas:** cifras contra respuestas de referencia, cifras sin fuente (M-02), herramientas esperadas usadas, bloques esperados emitidos, ninguna escritura sin aprobación.
  - **Juez con rúbrica:** un modelo distinto califica criterios cualitativos (claridad, especificidad de la recomendación, advertencias) con la rúbrica de `02_CRITERIOS_ACEPTACION.md`.
- **Alternativas:** promptfoo; evalite; Braintrust o Langfuse evals.
- **Por qué:** los criterios más importantes (cifras, aprobación) son deterministas y no necesitan otro framework. Un corredor propio es fácil de explicar y de modificar en la entrevista.
- **Consecuencias:** el mismo corredor sirve para la comparación de modelos (ADR-13).

## ADR-13 · Elección de modelo por medición

- **Estado:** Propuesta. Se cierra con la comparación de modelos.
- **Decisión:** comparar al menos 3 o 4 modelos de OpenRouter con el set de evaluación completo, midiendo calidad (puntaje del corredor), costo por conversación (desde el `usage` de OpenRouter) y latencia (primer token y total).
- **Candidatos iniciales** (los ids exactos se confirman en OpenRouter al medir):
  - Un modelo de gama alta de Anthropic (familia Sonnet): referencia de calidad en uso de herramientas.
  - Un modelo rápido y barato de Anthropic (familia Haiku).
  - Un modelo de la familia Gemini Flash: costo bajo y latencia baja.
  - Un modelo de la familia GPT (gama media).
  - Un modelo de pesos abiertos con buen uso de herramientas (familias Qwen, DeepSeek, Kimi o GLM).
- **Criterios de desempate:** confiabilidad al llamar herramientas, calidad del español, respeto de la aprobación y costo.
- **Opción de dos modelos:** si los números lo justifican, uno principal para el agente y uno barato para el juez o para el resumen semanal.

## ADR-14 · Vercel + Turso para la demo publicada

- **Estado:** Propuesta. Se confirma al probar el despliegue.
- **Decisión:** desplegar la app en Vercel (con el Cron del resumen semanal) y la base de datos en Turso.
- **Alternativas:** Render, Fly.io o Railway con un contenedor; Cloudflare.
- **Por qué:** despliegue directo desde GitHub, variables de entorno cifradas y niveles gratuitos suficientes.
- **Consecuencias:** límite de duración por función; protección de la demo con código de acceso, límite de mensajes y tope de gasto.

## ADR-15 · Recharts para gráficas

- **Decisión:** Recharts para barras, líneas y combinaciones simples.
- **Alternativas:** Chart.js, ECharts, Vega-Lite.
- **Por qué:** componentes de React declarativos, fáciles de alimentar desde el esquema del bloque, responsivos y suficientes para el tipo de gráficas que se necesitan.

## ADR-16 · Multi-negocio por configuración aislada

- **Contexto:** X-05 pide un diseño para varios negocios con datos y permisos separados.
- **Decisión:** cada negocio es un registro `BUSINESS` con referencia a su llave de API (nombre de variable de entorno), modelo, memoria, conversaciones, aprobaciones y resúmenes. La sesión de la interfaz y el token de servicio del MCP están ligados a un negocio; toda consulta a BD y toda llamada a la API se filtra por ese negocio.
- **Alternativas:** una base de datos por negocio; solo documentar el diseño.
- **Por qué:** aislamiento suficiente con un solo despliegue; la demo usa un negocio, pero las pruebas verifican el aislamiento con dos (CA-X05).

## ADR-17 · Manejo de secretos y escaneo

- **Decisión:** llaves solo en `.env.local` (local) y en variables de entorno de Vercel; `.env*` en `.gitignore` salvo `.env.example`; gitleaks en pre-commit (husky) y en CI; las llaves nunca se registran en trazas ni se envían al navegador.
- **Por qué:** R-09 es eliminatorio; una llave en el historial de git también cuenta.
- **Consecuencias:** el README explica cómo generar ambas llaves en el portal de Luyoa y dónde colocarlas.

## ADR-18 · TypeScript 6.0 en lugar de 7

- **Contexto:** al crear la base se instaló TypeScript 7 (la versión nativa). Al agregar ESLint, `typescript-eslint` 8.72 declara compatibilidad solo con TypeScript `>=4.8.4 <6.1.0`.
- **Decisión:** fijar TypeScript `~6.0`, la última versión compatible con todo el ecosistema (ESLint, Next.js, Vitest).
- **Alternativas:** mantener TypeScript 7 sin reglas de `typescript-eslint` (se perderían las reglas de nombres y de tipos); usar las dos versiones a la vez (más complejo de explicar).
- **Consecuencias:** se revisa cuando `typescript-eslint` soporte TypeScript 7.

## ADR-19 · Arneses de calidad y gobernanza para el desarrollo con IA

- **Contexto:** el desarrollo se hace con asistencia de Claude Code, y el código debe ser legible, auditable y defendible en la entrevista. La autoría de todo el trabajo es del desarrollador responsable.
- **Decisión:** controles automáticos en cuatro niveles:
  1. **Claude Code:** `CLAUDE.md` raíz y por capa, permisos y hooks en `.claude/` (bloquean secretos, atribución a IA, push forzado, `--no-verify`; avisan de tamaño de archivo y comentarios no bilingües), comandos y subagentes de revisión.
  2. **Git:** `commit-msg` con commitlint (Conventional Commits y regla `no-ai-attribution`) y `pre-commit` (secretos, formato, lint y comentarios).
  3. **Código:** ESLint con límites de Clean Code y nombres, Prettier y un verificador propio de comentarios bilingües (`scripts/quality/`).
  4. **CI:** gitleaks sobre todo el historial, commitlint y `pnpm verify`.
- **Alternativas:** husky + lint-staged (más dependencias para lo mismo); solo convenciones escritas (sin garantía).
- **Por qué:** las convenciones sin arnés se erosionan, sobre todo con un asistente que escribe rápido. Cada regla importante tiene un control que falla de forma visible.
- **Consecuencias:** el verificador de comentarios es propio y debe mantenerse; está cubierto por pruebas.
