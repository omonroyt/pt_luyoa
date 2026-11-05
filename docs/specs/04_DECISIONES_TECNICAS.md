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
| ADR-13 | Elección de modelo por medición | Aceptada; cerrada en M6 con `anthropic/claude-haiku-5.5` |
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
- **Implementación (IMP-34):**
  - `request_draft_approval` y `request_send_approval` no tienen `execute`. Al llamarlas, el turno se detiene; la interfaz pide el token a `/api/approvals` solo si la persona pulsa el botón y lo devuelve como resultado de la herramienta.
  - `/api/chat` valida ese resultado contra su esquema antes de dárselo al modelo.
  - Las escrituras del MCP solo se exponen junto con estas herramientas.
  - Las pruebas recorren el flujo completo con el MCP real y fixtures: el turno se detiene, el token emitido crea el borrador, un token inventado no llega a la API y un contenido alterado invalida el token.
- **Requisito para la interfaz (M5):** la tarjeta con los botones de aprobación se dibuja con el `campaign` de `request_draft_approval` (o de `request_send_approval`), que es exactamente el contenido que se firma. Así lo que la persona ve es lo que aprueba, aunque el modelo hubiera mostrado antes una tarjeta distinta.
- **Control del orquestador (M6, IMP-53):** en la corrida de humo, GLM-5.3-Flash pidió la aprobación en texto en E-06, sin llamar `request_draft_approval`, pese a la regla del prompt. Ahora `prepareStep` revisa los pasos del turno. Si se mostró con éxito una tarjeta de campaña y después no hubo una llamada de aprobación, el siguiente paso solo deja activa la herramienta de aprobación y agrega una instrucción para llamarla: `request_draft_approval` para una propuesta y `request_send_approval` para un borrador. No usa `toolChoice`, porque Z.AI, el proveedor original de GLM, rechaza forzar una herramienta, por nombre o con `required` (verificado en M6). El control tiene prioridad sobre el cierre del último paso. Así toda tarjeta llega a la interfaz con sus botones (07 §3.4) y la aprobación no depende de que el modelo obedezca el prompt (`lib/agent/approval-policy.ts`).
- **Aprobación solo después de una tarjeta válida (M6, IMP-53):** con Claude Haiku 5.5, el modelo pedía la aprobación en el mismo paso en que mostraba la tarjeta. Si la tarjeta fallaba el verificador de cifras, la petición llegaba igual y la persona habría aprobado sin ver la evidencia (CA-C03).
  - **Compuerta de tarjeta** (`lib/agent/card-gate.ts`): recuerda el estado de la última tarjeta que pasó el verificador en el turno. La entrada de `request_draft_approval` solo es válida después de una propuesta verificada, y la de `request_send_approval`, después de un borrador verificado. La tarjeta se verifica al validar su entrada, y el AI SDK valida en orden las llamadas de un paso. Por eso una aprobación que llega junto con su tarjeta ya conoce el veredicto: sigue si la tarjeta pasó y se rechaza si no. La ejecución de la tarjeta vuelve a verificar y devuelve el detalle de los problemas. Esperar a la ejecución dentro de la validación no sirve, porque el SDK ejecuta las herramientas después de validar todas las llamadas del paso. Si no, la llamada falla con una instrucción para el modelo ("muestra la tarjeta y vuelve a llamarla; la herramienta sí está disponible"), y la interfaz muestra "El agente pidió un paso antes de tiempo y lo está corrigiendo". La validación del historial de la conversación (`chat-request.ts`) usa las herramientas sin compuerta.
  - **Primer intento descartado:** ocultar las herramientas de aprobación hasta tener tarjeta. El SDK respondía `NoSuchToolError` ("herramienta no disponible") y, en el humo, Haiku dejaba de intentarlo aun cuando el paso siguiente sí se la ofrecía (E-06 y MT-01).
  - **Llamada rechazada:** una llamada de aprobación marcada `invalid` no cuenta como pedida, así que el paso siguiente la exige.
  - **Tarjeta del borrador:** si se creó un borrador (`create_campaign_draft` sin error) y no se mostró su tarjeta, el paso siguiente deja activas `show_campaign_card` y `request_send_approval`, con una instrucción. La aprobación de envío sigue activa porque el modelo suele pedirla junto con la tarjeta, y la compuerta solo la acepta si la tarjeta pasa. En el humo, dejar solo la tarjeta hacía que esa petición conjunta se rechazara. En el humo, Haiku creaba el borrador y pedía el envío solo en texto.
  - **Instrucciones por paso:** el AI SDK arrastra a los pasos siguientes las instrucciones que fija un paso, así que los pasos normales vuelven a fijar el prompt base y la nota de un paso forzado no se queda.
- **Alternativa evaluada en IMP-34: aprobación nativa del AI SDK 7** (`toolApproval` con `experimental_toolApprovalSecret`).
  - Firma con HMAC la solicitud de aprobación y la liga a la herramienta, al id de la llamada y a sus argumentos.
  - Se descartó porque duplica lo que ya garantiza el token propio, que además es de un solo uso, vence a los 10 minutos y lo verifica el MCP.
  - Además obligaría a emitir el token dentro de `/api/chat`, lo que borra la separación entre quien aprueba (la interfaz y `/api/approvals`) y quien ejecuta (el agente).
  - La propia documentación del AI SDK advierte que el historial lo controla el cliente; este diseño no confía en él para autorizar escrituras.

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
- **Implementación (IMP-35):**
  - **El campo `reason`** (`apps/web/lib/agent/with-reason.ts`) se agrega del lado del agente a las 20 herramientas, como campo opcional.
    - No cambia los contratos del MCP ni de los bloques.
    - El esquema original sigue validando el resto de la entrada.
    - El campo se quita antes de ejecutar.
  - **El trazador** (`turn-tracer.ts`) registra cada llamada al modelo con tokens, el costo que informa OpenRouter en `providerMetadata` y la latencia de respuesta.
    - También registra cada herramienta con su tipo (`tool`, `presentation` o `approval`), razón, entrada, resumen del resultado (fuente y número de advertencias, nunca los datos completos), duración y código de error.
    - Los códigos de error son el del MCP, `figure_verification` o `invalid_input`.
  - **Al terminar el turno** (`trace-store.ts`) se guardan la conversación, los mensajes y los pasos, y se acumula el costo de la conversación (CA-Q06).
    - Los tokens de aprobación se enmascaran en los mensajes guardados.
    - Un id de conversación de otro negocio se rechaza (ADR-16).
  - **Metadatos para el panel:** los totales del turno (modelo, llamadas, tokens, costo y latencia) viajan como metadatos del mensaje del asistente, para el panel de trazas de la interfaz.
  - **Si falla al guardar**, el chat continúa y el error se registra sin datos.
  - **Primera medición real (2026-11-04)**, con GLM-5.3-Flash y la pregunta "octubre contra septiembre":
    - 4 llamadas al modelo, 3 herramientas y 52,130 tokens de entrada.
    - 0.00198 USD y 37.7 s de latencia.
    - Cada llamada al modelo tardó entre 8 y 10 s, contra 1.1 s de la consulta al MCP: la latencia la domina el modelo.

## ADR-12 · Evaluaciones: verificaciones deterministas + juez con rúbrica

- **Decisión:** corredor propio en TypeScript (`evals/run.ts`) que ejecuta cada caso contra el agente real y califica con:
  - **Deterministas:** cifras contra respuestas de referencia, cifras sin fuente (M-02), herramientas esperadas usadas, bloques esperados emitidos, ninguna escritura sin aprobación.
  - **Juez con rúbrica:** un modelo distinto califica criterios cualitativos (claridad, especificidad de la recomendación, advertencias) con la rúbrica de `02_CRITERIOS_ACEPTACION.md`.
- **Alternativas:** promptfoo; evalite; Braintrust o Langfuse evals.
- **Por qué:** los criterios más importantes (cifras, aprobación) son deterministas y no necesitan otro framework. Un corredor propio es fácil de explicar y de modificar en la entrevista.
- **Consecuencias:** el mismo corredor sirve para la comparación de modelos (ADR-13).

## ADR-13 · Elección de modelo por medición

- **Estado:** Aceptada. Se cerró en M6: el modelo del agente es `anthropic/claude-haiku-5.5` (ver "Decisión final" al final de este ADR).
- **Decisión:** comparar al menos 4 modelos de OpenRouter con el set de evaluación completo, midiendo calidad (puntaje del corredor), costo por conversación (desde el `usage` de OpenRouter) y latencia (primer token y total).
- **Estudio previo (2026-11-04):** se revisaron los 454 modelos del catálogo de OpenRouter (389 con herramientas) y se puntuaron 16 con criterios fijados de antemano: uso de herramientas (AutomationBench de Artificial Analysis, 30%), veracidad (alucinación en AA-Omniscience, 25%), costo por conversación con el perfil de tokens medido (20%), latencia (10%) y disponibilidad (5%). La calidad del español no tiene medición comparable entre fabricantes y se mide en M6.
- **Modelo de desarrollo (M4 y M5):** `z-ai/glm-5.3-flash`, solo con el proveedor original y sin versiones de precisión reducida (fp4). Desde M6, cuando se conoce el proveedor original, OpenRouter no recurre a otros (`allow_fallbacks: false`): en la corrida de humo, un proveedor de respaldo devolvió una llamada a herramienta incompleta y el turno falló. La contrapartida es que, si el proveedor original falla, el turno falla y la interfaz ofrece reintentar. **Hallazgo de M6:** Z.AI rechazaba todas las solicitudes del agente, porque la tarjeta de campaña tenía un esquema con tupla (`z.tuple`), y el respaldo las mandaba en silencio a otros proveedores. Las mediciones de GLM anteriores al tercer humo de M6 (prueba de compatibilidad, M4, M5 y primer humo) probablemente no fueron de Z.AI. Los rangos ahora son listas de dos números y una prueba impide volver a usar tuplas en los bloques. Es el único candidato que queda entre los tres primeros con cualquier combinación de pesos probada. Respaldo: `deepseek/deepseek-v4.1-flash-1017`.
- **Candidatos de M6:**

  | Modelo | Familia | Papel |
  |---|---|---|
  | `z-ai/glm-5.3-flash` | Z.ai, pesos abiertos | Modelo de desarrollo (M4 y M5) |
  | `deepseek/deepseek-v4.1-flash-1017` | DeepSeek, pesos abiertos | Mayor puntaje base; vigilar veracidad |
  | `anthropic/claude-haiku-5.5` | Anthropic | Cerrado de bajo costo |
  | `openai/gpt-6.1-terra` | OpenAI | Cerrado de gama media |
  | `google/gemini-4-argon` | Google | Referencia de calidad (corrida reducida) |

- **Cambio respecto de los candidatos iniciales:** Gemini 4 Argon sustituye a la familia Sonnet como referencia de gama alta (mejor en herramientas y en alucinación, a menor costo). Dos modelos de pesos abiertos sustituyen a la familia Gemini Flash (alucinación de 55%, errores conocidos de llamadas a herramientas con streaming y aumento de precio anunciado).
- **Presupuesto:** la llave de OpenRouter tiene un límite de 20 USD para todo el proyecto. Una conversación típica consume ~56 mil tokens de entrada (las definiciones de herramientas y el prompt se reenvían en cada paso), lo que descarta un modelo de gama alta para el desarrollo.
- **Prueba de compatibilidad (2026-11-04):** los cinco candidatos completaron una pregunta de dos herramientas por el stack real (AI SDK 7, `@openrouter/ai-sdk-provider` y cliente MCP), sin argumentos inválidos y citando fuentes reales; costo total 0.037 USD. Reporte: `evals/reports/2026-11-04-compat.json`. Tres modelos sumaron cifras en el texto en lugar de citar las de la herramienta, lo que confirma la necesidad del verificador de cifras (ADR-09).
- **Criterios de desempate:** confiabilidad al llamar herramientas, calidad del español, respeto de la aprobación y costo.
- **Opción de dos modelos:** si los números lo justifican, uno principal para el agente y uno barato para el juez o para el resumen semanal.

- **Decisión final (M6, 2026-11-04): `anthropic/claude-haiku-5.5`.**
  - **Medición:** corrida completa de 36 casos × 2 repeticiones, con el mismo prompt, herramientas, API real, verificador de cifras y juez (`evals/reports/2026-11-04-compare-completa-recalificada.md`):

    | Modelo | Puntaje | Casos con cifras sin fuente | USD / conversación | Total p50 / p95 | Llamadas al modelo |
    |---|---|---|---|---|---|
    | `z-ai/glm-5.3-flash` | 0.94 ± 0.08 | 5 | 0.0050 | 20.2 / 83.3 s | 6.0 |
    | `anthropic/claude-haiku-5.5` | 0.92 ± 0.08 | 0 | 0.0107 | 10.1 / 34.8 s | 4.2 |

  - **Por qué:** GLM-5.3-Flash dio cifras sin fuente en 5 casos de escenarios y variantes: sumas ("391" = 219 + 172; "577" = 330 + 247), una proporción ("2.5 veces"), una diferencia que no coincide con los datos y la longitud del mensaje contada por el modelo. Con eso se cumplen dos condiciones de la regla de cambio del estudio: cifra inventada en los escenarios, y un candidato que lo iguala sin puertas duras. Haiku no dio cifras sin fuente en esos grupos, responde en la mitad del tiempo y su costo cabe en el presupuesto.
  - **Controles de la medición:**
    - cada cifra marcada se revisó a mano y se corrigieron los falsos positivos del verificador (años, truncamiento, miles abreviados y aproximaciones marcadas);
    - las transcripciones guardadas se recalificaron con `pnpm rescore`; GLM pasó de 7 a 5 casos con puerta dura y Haiku siguió en 0;
    - una corrida anterior se descartó por el límite de solicitudes de la API.
  - **Contraste con el estudio previo:** Haiku tenía el menor puntaje del grupo en uso de herramientas (AutomationBench 35.4%), pero en esta carga no inventó cifras y completó el flujo de doble aprobación. Además, las mediciones previas de GLM probablemente no fueron de su proveedor original (ver arriba). La medición propia sustituye a las métricas generales para esta decisión.
  - **Límites:**
    - 2 repeticiones de las 3 previstas, por el tope de gasto;
    - Terra (0.81) y Gemini Argon (0.93, 14 veces el costo de GLM) solo se midieron en la corrida de humo;
    - DeepSeek quedó fuera por la configuración de privacidad de la cuenta.
  - **Consecuencia:** `OPENROUTER_MODEL=anthropic/claude-haiku-5.5` en el entorno de la app (configuración del responsable). La política de proveedor original aplica: Anthropic sin respaldo de otros proveedores.

## ADR-14 · Vercel + Turso para la demo publicada

- **Estado:** Aceptada y confirmada. La demo está desplegada en https://copiloto-cafe-alborada.vercel.app (Vercel, región `iad1`, con Turso en AWS us-east-1). Se verificó el build, `/api/health`, la puerta de acceso, una respuesta del agente, las migraciones aplicadas en Turso y el cron registrado.
- **Decisión:** desplegar la app en Vercel (con el Cron del resumen semanal) y la base de datos en Turso, con la demo protegida en capas (IMP-63):
  - **Puerta:** `proxy.ts` (el middleware de Next 16) exige en páginas y rutas de la interfaz una sesión en cookie firmada con HMAC. La llave se deriva de `APPROVAL_SECRET` con una etiqueta propia. La sesión se obtiene en `/acceso` con el código del negocio, comparado en tiempo constante, y fija el negocio de la sesión.
  - **Topes:** turnos por sesión y por IP al día, en contadores de la base con incremento atómico; intentos de código por IP; gasto diario sumado desde las trazas. Todos son configurables con `DEMO_*`.
  - **Empaquetado:** `outputFileTracingIncludes` incluye las migraciones SQL y `pnpm-workspace.yaml` en las funciones de la API, porque el rastreo de archivos no los detecta y la base no podría migrarse en Vercel.
  - Sin código configurado no hay puerta ni topes (desarrollo local y evaluaciones).
- **Alternativas:**
  - **Plataforma:** Render, Fly.io o Railway con un contenedor; Cloudflare.
  - **Puerta:** la protección con contraseña de Vercel (plan de pago); autenticación básica HTTP (sin cierre de sesión ni negocio); un proveedor de cuentas (otro servicio para una demo).
  - **Contadores:** en memoria (no se comparten entre instancias serverless); Upstash o Vercel KV (otro servicio).
  - **Tope de gasto:** solo el límite de la llave de OpenRouter, que se conserva como última red.
- **Por qué:** despliegue directo desde GitHub, variables de entorno cifradas y niveles gratuitos suficientes.
- **Consecuencias:** límite de duración por función; protección de la demo con código de acceso, límite de mensajes y tope de gasto.
- **Cron (M7):** `apps/web/vercel.json` programa `/api/cron/weekly` los lunes a las 13:00 UTC. La ruta exige `Authorization: Bearer CRON_SECRET`, que Vercel envía cuando la variable está configurada.

## ADR-15 · Recharts para gráficas

- **Decisión:** Recharts para barras, líneas y combinaciones simples.
- **Alternativas:** Chart.js, ECharts, Vega-Lite.
- **Por qué:** componentes de React declarativos, fáciles de alimentar desde el esquema del bloque, responsivos y suficientes para el tipo de gráficas que se necesitan.

## ADR-16 · Multi-negocio por configuración aislada

- **Contexto:** X-05 pide un diseño para varios negocios con datos y permisos separados.
- **Decisión:** aislamiento lógico en un solo despliegue y una sola base de datos.
  - **Registro.** La variable opcional `BUSINESSES` lista cada negocio con su id, su nombre y el *nombre* de las variables que guardan su llave de la API y su token del MCP (`lib/tenancy/business-registry.ts`). Sin `BUSINESSES` se arma un solo negocio con `BUSINESS_ID`, `LUYOA_API_KEY` y `MCP_SERVICE_TOKEN`.
  - **Validación al arrancar.** Se rechazan ids, llaves o tokens repetidos entre negocios y las variables faltantes. Los errores nombran variables, nunca valores.
  - **Un servidor MCP por negocio** (`lib/mcp/runtime.ts`), con su propio cliente de la API: su llave, su caché y su límite de solicitudes.
  - **Candado de identidad.** El servidor MCP recibe el `businessId` esperado y no entrega datos si la llave responde con otro negocio.
  - **El negocio de una solicitud sale siempre de una credencial del servidor** (`lib/tenancy/current-business.ts`), nunca de un dato que manda el navegador:
    - en `/api/mcp`, del token de servicio, comparado en tiempo constante contra todos los negocios;
    - en las rutas de la interfaz, de la sesión firmada que entrega el código de acceso (IMP-63); sin códigos configurados, del negocio por defecto.
  - **Datos por fila.** Conversaciones, trazas, aprobaciones, preferencias y resúmenes guardan `business_id`, y cada almacén recibe el negocio al crearse.
  - **Cron.** Genera un resumen por cada negocio registrado, por separado.
- **Alternativas:**
  - **Un despliegue por negocio.** El aislamiento más fuerte, pero N despliegues, N bases y N crons, y no se puede demostrar con pruebas.
  - **Una base de datos por negocio.** Separación física, pero migraciones repetidas y una conexión por negocio.
  - **Negocios y llaves cifradas en una tabla.** Exige llave maestra y rotación, y la base pasa a guardar secretos.
  - **Todo el registro con sus secretos en un solo JSON.** Mezcla todos los secretos y el escaneo no los reconoce.
  - **Registro en un archivo versionado.** La lista de clientes de un despliegue es un dato de operación, no código.
  - **Elegir el negocio con un encabezado o parámetro.** El navegador podría suplantar a otro negocio.
  - **Un servidor MCP que cambia de llave por solicitud.** La caché compartida filtraría datos entre negocios.
  - **Solo documentar el diseño.**
- **Por qué:** es aislamiento suficiente con un solo despliegue y se demuestra con pruebas. La demo usa un negocio, y las pruebas verifican el aislamiento con dos (CA-X05).
- **Consecuencias:**
  - El aislamiento depende de que el código filtre por negocio. Por eso el negocio se fija al crear cada almacén y cada servidor, y hay pruebas con dos negocios configurados a la vez (`two-businesses.test.ts`, `business-registry.test.ts`, y las pruebas de los almacenes de preferencias, resúmenes y trazas).
  - Todos los negocios comparten `APPROVAL_SECRET`. El negocio va dentro del token firmado y se compara con el de la llave, así que una llave por negocio no cerraría ningún hueco adicional.
  - Todos los negocios usan el mismo modelo. Un modelo por negocio queda como trabajo futuro.
  - Si un cliente exigiera separación física, el paso siguiente es una base por negocio, sin cambiar el registro ni el candado.

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
