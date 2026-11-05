# Arquitectura: Copiloto Café Alborada

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador) |
| Fecha | 2026-11-04 |
| Stack | TypeScript de punta a punta |
| Relacionados | [`01_PRD.md`](01_PRD.md), [`02_CRITERIOS_ACEPTACION.md`](02_CRITERIOS_ACEPTACION.md), [`04_DECISIONES_TECNICAS.md`](04_DECISIONES_TECNICAS.md) |

> Este documento describe **cómo** se construye y **cómo se comunican** las piezas. El detalle fino de cada herramienta del MCP, del prompt del agente y del contrato de bloques visuales vive en sus propios documentos (05, 06 y 07). Aquí se fija la forma general. Las decisiones con sus alternativas están en el registro de decisiones (`ADR-xx`).

---

## 1. Principios de diseño

Derivados del puntaje de Luyoa ("pequeña y confiable antes que grande y frágil"; veracidad = 30 puntos):

| # | Principio | Consecuencia concreta |
|---|---|---|
| P-1 | **Las cifras las calcula el código, no el modelo** | Las herramientas del MCP devuelven métricas ya calculadas (variaciones, normalizaciones, lift, costos). El modelo elige, interpreta y explica |
| P-2 | **Toda cifra tiene procedencia** | Cada resultado de herramienta lleva un `source` con id, endpoint, parámetros, periodo y `data_as_of`. Los bloques visuales citan esos ids |
| P-3 | **Escribir exige a una persona** | Crear y enviar campañas requiere aprobación en la interfaz y un token firmado por el servidor que el modelo no puede fabricar |
| P-4 | **Poco contexto** | Herramientas a nivel de tarea, respuestas compactas, nada de listados crudos. Paginación y agregación dentro del MCP |
| P-5 | **Fallar con claridad** | Reintentos automáticos cuando tiene sentido; si no, un error que el agente pueda explicar y del que se pueda recuperar |
| P-6 | **Todo se puede observar y medir** | Trazas por paso, costo por conversación y evaluaciones reproducibles desde el día uno |
| P-7 | **Simple de explicar y modificar** | Un solo lenguaje, pocos paquetes, módulos pequeños con nombres de negocio |

---

## 2. Vista de contexto (C4 nivel 1)

```mermaid
flowchart LR
    duena(["👩 Dueña de Café Alborada"])
    evaluador(["🧑‍💻 Evaluador de Luyoa"])

    subgraph sistema["Copiloto Café Alborada"]
        app["Aplicación web<br/>chat + agente + MCP"]
    end

    api[("API Café Alborada<br/>prueba-developer.luyoa.dev")]
    openrouter["OpenRouter<br/>modelos de lenguaje"]
    clienteMcp["Cliente MCP externo<br/>(Claude Desktop, Inspector)"]

    duena -- "pregunta, aprueba campañas" --> app
    evaluador -- "abre demo, revisa trazas, corre evals" --> app
    app -- "HTTPS + X-API-Key" --> api
    app -- "HTTPS + llave OpenRouter" --> openrouter
    clienteMcp -. "MCP (stdio o HTTP)" .-> app
```

**Sistemas externos**

| Sistema | Uso | Restricciones |
|---|---|---|
| API Café Alborada | Única fuente de datos de negocio y de campañas | 120 req/min por llave; 429/503 con `Retry-After`; `limit` ≤ 100 |
| OpenRouter | Inferencia con el modelo elegido | Límite de gasto de la llave; costo por token según modelo |
| Cliente MCP externo | Demostrar que el MCP sirve a cualquier agente (CA-M08) | Opcional, solo para la demo técnica |

---

## 3. Vista de contenedores (C4 nivel 2)

```mermaid
flowchart TB
    subgraph navegador["Navegador"]
        ui["Interfaz de chat<br/>React (Next.js) + AI SDK UI<br/>gráficas, tablas, tarjetas, trazas"]
    end

    subgraph servidor["Aplicación Next.js (un solo despliegue)"]
        chatApi["/api/chat<br/>Orquestador del agente<br/>AI SDK + OpenRouter"]
        approvalApi["/api/approvals<br/>Emite tokens de aprobación"]
        traceApi["/api/traces<br/>Lee las trazas guardadas"]
        mcpRoute["/api/mcp<br/>Servidor MCP<br/>(Streamable HTTP)"]
        cron["/api/cron/weekly<br/>Resumen semanal"]
    end

    subgraph paquetes["Paquetes del monorepo"]
        mcpCore["@alborada/mcp-server<br/>herramientas + cliente de API"]
        shared["@alborada/shared<br/>esquemas zod: bloques, fuentes, errores"]
    end

    db[("Base de datos<br/>SQLite local · Turso en la nube<br/>conversaciones, trazas, memoria,<br/>negocios, aprobaciones")]
    api[("API Café Alborada")]
    openrouter["OpenRouter"]
    stdio["CLI MCP (stdio)<br/>para Claude Desktop / Inspector"]

    ui -- "HTTP + streaming (SSE)" --> chatApi
    ui -- "POST aprobar / rechazar" --> approvalApi
    ui -- "GET traza de un mensaje" --> traceApi
    chatApi -- "cliente MCP (HTTP)" --> mcpRoute
    chatApi -- "chat completions" --> openrouter
    chatApi -- "lee/escribe" --> db
    approvalApi -- "lee/escribe" --> db
    traceApi -- "lee" --> db
    cron -- "invoca agente" --> chatApi
    mcpRoute --> mcpCore
    stdio --> mcpCore
    mcpCore -- "HTTPS + X-API-Key" --> api
    mcpCore -. "valida token" .-> db
    ui -. "usa tipos" .-> shared
    chatApi -. "usa tipos" .-> shared
    mcpCore -. "usa tipos" .-> shared
```

| Contenedor | Responsabilidad | Tecnología |
|---|---|---|
| Interfaz de chat | Mostrar conversación, bloques visuales, tarjetas con botones de aprobación y panel de trazas | Next.js (App Router), React, AI SDK UI (`useChat`), Recharts, Tailwind |
| Orquestador del agente (`/api/chat`) | Bucle del agente: prompt de sistema, memoria, herramientas del MCP, herramientas de presentación, streaming, registro de trazas y costo | AI SDK Core (`streamText`), proveedor de OpenRouter, cliente MCP del AI SDK |
| Aprobaciones (`/api/approvals`) | Registrar la decisión de la persona y emitir un token firmado de un solo uso, ligado al contenido exacto de la campaña | Route handler + HMAC |
| Trazas (`/api/traces`) | Entregar al panel de trazas los pasos guardados de un mensaje y el costo acumulado de su conversación, solo del mismo origen y del mismo negocio, con los tokens de aprobación enmascarados | Route handler + Drizzle |
| Servidor MCP (`/api/mcp` y CLI stdio) | Exponer las herramientas de negocio; mismo código para ambos transportes | SDK oficial de MCP para TypeScript, zod |
| `@alborada/mcp-server` | Herramientas, cliente HTTP de la API, caché, reintentos, validaciones, cálculo de métricas | TypeScript, `undici`/`fetch`, zod |
| `@alborada/shared` | Contratos compartidos: bloques visuales, `source`, errores, tipos de dominio | zod |
| Base de datos | Conversaciones, trazas, memoria de preferencias, negocios, aprobaciones, resúmenes | Drizzle ORM + libSQL (archivo local en desarrollo, Turso en la nube) |
| Resumen semanal (`/api/cron/weekly`) | Generar el resumen proactivo (X-02) | Vercel Cron o botón manual |

**¿Por qué el MCP vive dentro de la misma app y no como servicio aparte?** Un solo despliegue, una sola URL y cero infraestructura extra para la demo publicada (X-01). El núcleo del MCP es un paquete independiente con su propio CLI stdio, así que se puede sacar a otro servicio sin reescribir nada. Ver ADR-04.

---

## 4. Vista de componentes (C4 nivel 3)

### 4.1 Servidor MCP

```mermaid
flowchart TB
    subgraph transporte["Transportes"]
        http["Streamable HTTP<br/>(/api/mcp)"]
        stdio["stdio (CLI)"]
    end

    subgraph mcp["@alborada/mcp-server"]
        auth["Contexto de negocio<br/>resuelve tenant → llave de API"]
        registry["Registro de herramientas<br/>descripciones + esquemas zod"]

        subgraph lectura["Herramientas de lectura"]
            t1["get_business_context"]
            t2["compare_periods"]
            t3["sales_breakdown"]
            t4["visits_breakdown"]
            t5["location_health"]
            t6["customer_segments"]
            t7["audience_reach"]
            t8["campaign_performance"]
            t9["offer_economics"]
            t10["estimate_campaign_impact"]
            t11["lookup (producto, cliente, ticket)"]
        end

        subgraph escritura["Herramientas de escritura (requieren token)"]
            w1["create_campaign_draft"]
            w2["send_campaign"]
        end

        domain["Dominio<br/>periodos desde data_as_of, normalización,<br/>lift, costo de oferta, validaciones"]
        source["Procedencia<br/>arma el objeto source de cada resultado"]
        errors["Errores<br/>traduce 401/404/409/422/429/503<br/>a mensajes accionables"]
        client["Cliente de la API<br/>paginación, caché, límite de rata,<br/>reintentos con Retry-After"]
        guard["Verificador de token<br/>HMAC + un solo uso + hash del contenido"]
    end

    api[("API Café Alborada")]
    db[("BD: aprobaciones")]

    http --> auth
    stdio --> auth
    auth --> registry
    registry --> lectura
    registry --> escritura
    lectura --> domain
    escritura --> guard
    guard --> db
    escritura --> domain
    domain --> client
    domain --> source
    client --> errors
    client --> api
```

**Catálogo preliminar de herramientas** (el detalle va en `05_DISENO_MCP.md`):

| Herramienta | Qué resuelve | Endpoints que combina | Escenarios |
|---|---|---|---|
| `get_business_context` | Fecha de corte, rango de datos, sucursales, reglas de puntos, definiciones de segmentos | `/business`, `/locations`, `/segments` | Todos |
| `compare_periods` | KPIs de dos periodos con variación absoluta, porcentual y por día; desglose opcional por sucursal o categoría | `/analytics/sales`, `/analytics/visits` | E-01 |
| `sales_breakdown` | Ventas agrupadas por una dimensión, ordenadas, con la métrica correcta (`transactions_per_day`, utilidad antes de descuentos) y notas de interpretación | `/analytics/sales` | E-02, E-03, ejemplo |
| `visits_breakdown` | Igual, para visitas con tarjeta | `/analytics/visits` | E-02, E-03 |
| `location_health` | Tendencia por sucursal (ventana reciente contra anterior) en ventas, tickets, ticket promedio, visitas y participación de miembros, con alertas | `/analytics/sales`, `/analytics/visits` | E-03 |
| `customer_segments` | Tamaño de cada segmento, con filtro por sucursal de origen, y sus reglas | `/segments`, `/customers` | E-04 |
| `audience_reach` | Alcance real de una audiencia en uno o varios canales, con exclusiones | `/campaigns/preview` (una llamada por canal) | E-02, E-04, E-06, ejemplo |
| `campaign_performance` | Campañas pasadas con resultados, lift contra control, tamaño de muestra y alertas de confiabilidad | `/campaigns`, `/campaigns/{id}` | E-05, E-06 |
| `offer_economics` | Costo por redención y efecto en margen de una oferta, usando precio y costo del catálogo | `/products` | E-02, E-06, ejemplo |
| `estimate_campaign_impact` | Rango de visitas y ventas adicionales esperadas a partir del alcance y del lift de campañas parecidas | Usa los resultados de las anteriores | E-06 (X-03) |
| `lookup` | Detalle puntual de un producto, cliente o ticket | `/products`, `/customers/{id}`, `/transactions/{id}` | Preguntas puntuales |
| `create_campaign_draft` | Crea el borrador. **Exige token de aprobación** | `POST /campaigns` | E-06 |
| `send_campaign` | Envía el borrador. **Exige token de aprobación** | `POST /campaigns/{id}/send` | E-06 |

**Forma de toda respuesta de herramienta:**

```json
{
  "data": { "...": "métricas ya calculadas y compactas" },
  "notes": ["La utilidad por categoría es antes de descuentos."],
  "warnings": ["Solo 38 destinatarios: muestra pequeña."],
  "source": {
    "id": "src_7f3a",
    "tool": "sales_breakdown",
    "endpoints": ["GET /v1/analytics/sales?group_by=category&from=2026-08-01&to=2026-10-31"],
    "period": { "from": "2026-08-01", "to": "2026-10-31", "timezone": "America/Mexico_City" },
    "data_as_of": "2026-10-31",
    "fetched_at": "2026-11-06T17:02:11Z"
  }
}
```

Errores con la misma forma: `{ "error": { "code", "message", "retryable", "suggestion" } }`.

### 4.2 Orquestador del agente

```mermaid
flowchart TB
    req["Solicitud del chat<br/>(mensajes + id de conversación)"]

    subgraph orq["/api/chat"]
        tenant["Resolver negocio y sesión<br/>(X-05, protección de demo)"]
        ctx["Armar contexto<br/>prompt de sistema + data_as_of<br/>+ memoria de preferencias (X-04)<br/>+ historial recortado"]
        loop["Bucle del agente<br/>streamText con tope de pasos"]
        mcpClient["Cliente MCP<br/>herramientas de negocio"]
        present["Herramientas de presentación<br/>show_chart, show_table, show_kpis,<br/>show_campaign_card, cite_sources"]
        approvalGate["Herramientas de aprobación<br/>request_draft_approval<br/>request_send_approval<br/>(se resuelven en la UI)"]
        memory["Herramientas de memoria (X-04)<br/>remember_preference<br/>forget_preference"]
        checker["Verificador de cifras<br/>¿cada número del bloque está<br/>en una fuente citada?"]
        tracer["Trazas + costo<br/>por paso y por conversación"]
    end

    llm["OpenRouter"]
    mcp["Servidor MCP"]
    db[("BD")]
    out["Stream al navegador<br/>texto + partes de herramienta"]

    req --> tenant --> ctx --> loop
    loop <--> llm
    loop --> mcpClient --> mcp
    loop --> present --> checker
    loop --> approvalGate
    loop --> memory --> db
    loop --> tracer --> db
    ctx --> db
    loop --> out
```

**Cómo elige el formato el agente (R-05):** los bloques visuales son **herramientas de presentación**. Cuando el modelo decide que una comparación se entiende mejor en gráfica, llama `show_chart` con datos y los `source.id` que la respaldan. La interfaz dibuja la parte de herramienta como un componente. Si no llama ninguna, la respuesta es solo texto. La decisión es del modelo, guiada por reglas en el prompt (gráfica para comparar, tabla para listar, tarjeta para campañas).

**Cliente MCP dentro del proceso:** el orquestador habla el protocolo MCP real, con Streamable HTTP y el token de servicio, contra el mismo manejador que atiende `/api/mcp`. Lo hace dentro del proceso: el `fetch` del cliente del AI SDK entrega cada solicitud al manejador sin pasar por la red. Así se evita un salto HTTP y no hace falta conocer la URL pública del despliegue. Los clientes externos, como el Inspector de MCP o Claude Desktop, usan el endpoint HTTP o stdio.

**Contexto y tope de pasos:** al inicio de cada turno el orquestador llama `get_business_context` por el MCP. Con su resultado arma el prompt de sistema: fecha de corte, calendario resuelto y sucursales. El bucle tiene un tope de 12 pasos; en el último se retiran las herramientas y se pide cerrar con lo obtenido. Hasta que existan las herramientas de aprobación (IMP-34), el agente solo ve las herramientas de lectura.

**Verificador de cifras (veracidad):** antes de emitir un bloque, el orquestador comprueba que cada número del bloque aparece en el resultado de alguna de las fuentes citadas (con tolerancia de redondeo). Si no, devuelve un error a la herramienta de presentación para que el modelo corrija. Lo mismo corre en las evaluaciones sobre el texto final (M-02).

Así se implementa (`apps/web/lib/agent/source-registry.ts` y `figure-verifier.ts`):

- **Registro de fuentes.** Cada turno arma un registro con dos orígenes: los resultados de herramientas que ya vienen en el historial y cada resultado nuevo del MCP. Para lo segundo, las herramientas de negocio se envuelven y registran su salida.
- **Coincidencia de cifras.** Una cifra del bloque coincide con una de la fuente si son iguales al redondear la de la fuente a los decimales mostrados. También se acepta una proporción mostrada como porcentaje (0.5569 como 55.7).
- **Alcance de la tarjeta.** La tarjeta de campaña debe repetir el alcance del último `audience_reach` citado para su canal.
- **Mensaje de la tarjeta.** El mensaje debe declarar su longitud real y respetar el límite del canal.
- **Si un bloque falla:** el modelo recibe la lista de problemas y la interfaz solo un aviso de corrección.
- **Alcance del verificador.** Revisa los bloques, no el texto libre. En la prueba de punta a punta del 2026-11-04 el modelo de desarrollo sumó cifras en el texto pese a la regla 1 del prompt. Eso lo mide la métrica de cifras sin fuente en las evaluaciones.

### 4.3 Interfaz

```mermaid
flowchart LR
    subgraph pagina["Página de chat"]
        hilo["Hilo de mensajes"]
        entrada["Entrada + sugerencias<br/>(los 6 escenarios)"]
        resumen["Resumen semanal (X-02)"]
        panel["Panel de trazas (B-03)<br/>herramientas, parámetros, razón,<br/>tiempo, tokens, costo"]
    end

    subgraph bloques["Renderizadores de partes"]
        texto["Texto (markdown)"]
        chart["Gráfica (Recharts)"]
        table["Tabla"]
        kpis["Indicadores"]
        card["Tarjeta de campaña<br/>+ botones Aprobar / Cambiar / Descartar"]
        fuente["Fuente: chip que abre<br/>endpoint, parámetros y periodo"]
        err["Error con opción de reintentar"]
    end

    hilo --> bloques
    card -- "POST /api/approvals" --> aprob["Token de aprobación"]
```

---

## 5. Flujos de comunicación

### 5.1 Pregunta analítica con propuesta (caso de ejemplo)

```mermaid
sequenceDiagram
    autonumber
    actor D as Dueña
    participant UI as Interfaz
    participant AG as Orquestador
    participant LLM as OpenRouter
    participant MCP as Servidor MCP
    participant API as API Alborada

    D->>UI: "¿Qué categoría me deja más utilidad y cómo la empujo?"
    UI->>AG: POST /api/chat (stream)
    AG->>LLM: prompt + data_as_of + herramientas
    LLM-->>AG: llamar sales_breakdown(category, últimos 3 meses)
    AG->>MCP: sales_breakdown
    MCP->>API: GET /analytics/sales?group_by=category&from&to
    API-->>MCP: filas por categoría
    MCP-->>AG: ranking + % del total + nota "antes de descuentos" + source
    LLM-->>AG: llamar campaign_performance y audience_reach en paralelo
    AG->>MCP: campaign_performance(similares)
    AG->>MCP: audience_reach(segmento, canales)
    MCP->>API: GET /campaigns, POST /campaigns/preview ×3
    MCP-->>AG: lift histórico + reachable por canal + sources
    LLM-->>AG: llamar offer_economics(oferta)
    AG->>MCP: offer_economics
    MCP-->>AG: costo por redención, margen
    LLM-->>AG: show_chart(utilidad por categoría, sources)
    AG->>AG: verificador de cifras ✔
    LLM-->>AG: show_campaign_card(propuesta, sources)
    AG-->>UI: texto + gráfica + tarjeta + fuentes (stream)
    UI-->>D: "...¿Preparo el borrador?"
    Note over AG,API: Hasta aquí solo lecturas y preview: nada guardado
```

### 5.2 Campaña con doble aprobación (E-06)

```mermaid
sequenceDiagram
    autonumber
    actor D as Dueña
    participant UI as Interfaz
    participant AP as /api/approvals
    participant AG as Orquestador
    participant MCP as Servidor MCP
    participant API as API Alborada

    D->>UI: "Prepara una campaña para recuperar clientes y mándala"
    UI->>AG: POST /api/chat
    AG->>MCP: customer_segments, audience_reach, campaign_performance,<br/>offer_economics, estimate_campaign_impact
    MCP->>API: lecturas + preview
    AG-->>UI: tarjeta de propuesta + request_draft_approval
    Note over UI: El "mándala" no aprueba un contenido no visto

    D->>UI: Aprobar "Preparar borrador"
    UI->>AP: POST aprobación {acción: create, hash del contenido}
    AP-->>UI: token firmado, un solo uso
    UI->>AG: resultado de la aprobación (con token)
    AG->>MCP: create_campaign_draft(contenido, token)
    MCP->>MCP: valida firma, hash y uso único
    MCP->>API: POST /campaigns
    API-->>MCP: borrador {id}
    AG-->>UI: tarjeta de borrador {id} + request_send_approval

    D->>UI: Aprobar "Enviar"
    UI->>AP: POST aprobación {acción: send, campaign_id, hash}
    AP-->>UI: token
    UI->>AG: resultado de la aprobación (con token)
    AG->>MCP: send_campaign(id, token)
    MCP->>API: POST /campaigns/{id}/send
    API-->>MCP: status: sent
    AG-->>UI: confirmación: enviada, id, audiencia fijada
```

**Dos candados (P-3):**

1. **En el agente:** las acciones de escritura solo se piden mediante herramientas de aprobación que se resuelven en la interfaz, no en el servidor. El modelo no puede "auto-aprobar".
2. **En el MCP:** aunque alguien llame la herramienta directamente (por ejemplo desde Claude Desktop), sin un token válido emitido por `/api/approvals` la escritura se rechaza. El token está ligado al hash del contenido: si el modelo cambia una coma del mensaje después de aprobado, el token ya no sirve.

### 5.3 Ciclo de vida de una cifra (veracidad)

Cómo una cifra viaja de la API a la pantalla sin que el modelo la invente ni la recalcule:

```mermaid
flowchart LR
    api[("API<br/>Café Alborada")] --> client["Cliente del MCP<br/>lista blanca de filtros,<br/>caché, reintentos"]
    client --> domain["Dominio (código)<br/>periodos desde data_as_of,<br/>variaciones, normalización,<br/>lift, costos"]
    domain --> result["Resultado de herramienta<br/>cifras + notes + warnings<br/>+ source {id, endpoint,<br/>periodo, data_as_of}"]
    result --> llm["Modelo<br/>elige, interpreta y explica;<br/>no calcula"]
    llm --> block["Bloque visual<br/>cita source.id"]
    block --> verifier{"Verificador de cifras<br/>¿cada número está en<br/>una fuente citada?"}
    verifier -- no --> llm
    verifier -- sí --> ui["Interfaz<br/>bloque + chip de fuente"]
    result -. "mismo dato" .-> evals["Evaluaciones<br/>cifras vs respuestas<br/>de referencia"]
```

### 5.4 Fallo de herramienta y recuperación (B-07)

```mermaid
sequenceDiagram
    autonumber
    participant AG as Orquestador
    participant MCP as Servidor MCP
    participant API as API Alborada

    AG->>MCP: location_health
    MCP->>API: GET /analytics/sales
    API-->>MCP: 429 rate_limited, Retry-After: 4
    MCP->>MCP: espera 4 s (dentro del presupuesto)
    MCP->>API: reintento
    API-->>MCP: 503 busy, Retry-After: 30
    MCP-->>AG: error {code: busy, retryable: true,<br/>suggestion: "reintenta en 30 s o usa datos parciales"}
    AG->>AG: el modelo explica qué falló,<br/>responde con lo que sí tiene y ofrece reintentar
```

Reglas: reintento automático solo si `Retry-After` cabe en el presupuesto del turno (p. ej. ≤ 10 s); errores `422` regresan al modelo con el campo inválido para que corrija una vez; `401` corta y muestra un mensaje de configuración; nunca bucles de la misma llamada fallida.

---

## 6. Modelo de datos de la aplicación

La API de Café Alborada es la fuente de los datos de negocio. La base propia solo guarda lo que la API no tiene:

```mermaid
erDiagram
    BUSINESS ||--o{ CONVERSATION : tiene
    BUSINESS ||--o{ PREFERENCE : tiene
    BUSINESS ||--o{ APPROVAL : tiene
    BUSINESS ||--o{ WEEKLY_SUMMARY : tiene
    CONVERSATION ||--o{ MESSAGE : contiene
    MESSAGE ||--o{ TRACE_STEP : genera
    CONVERSATION ||--o{ APPROVAL : origina

    BUSINESS {
        string id PK
        string name
        string api_key_ref "nombre de variable de entorno, nunca la llave"
        string default_model
    }
    CONVERSATION {
        string id PK
        string business_id FK
        datetime created_at
        float cost_usd
    }
    MESSAGE {
        string id PK
        string conversation_id FK
        string role
        json parts "texto y partes de herramienta"
    }
    TRACE_STEP {
        string id PK
        string message_id FK
        string kind "llm | tool | presentation | approval"
        string name
        json input
        json output_summary
        string reason
        int latency_ms
        int tokens_in
        int tokens_out
        float cost_usd
        string error_code
    }
    PREFERENCE {
        string id PK
        string business_id FK
        string key
        string value
        datetime updated_at
    }
    APPROVAL {
        string id PK
        string business_id FK
        string conversation_id FK
        string action "create | send"
        string content_hash
        string campaign_id
        string status "pending | approved | rejected | used"
        datetime expires_at
    }
    WEEKLY_SUMMARY {
        string id PK
        string business_id FK
        date week_end
        json content
    }
```

---

## 7. Despliegue

```mermaid
flowchart LR
    subgraph local["Desarrollo local"]
        devNext["next dev<br/>(chat + /api/mcp)"]
        devDb[("SQLite<br/>archivo local")]
        devEnv[".env en la raíz<br/>(ignorado por git)"]
        devCli["mcp-server CLI (stdio)"]
    end

    subgraph nube["Demo publicada (X-01)"]
        vercel["Vercel<br/>Next.js + funciones<br/>+ Cron semanal"]
        turso[("Turso<br/>libSQL")]
        secrets["Variables de entorno<br/>cifradas en Vercel"]
    end

    gh["GitHub<br/>repo + CI<br/>(lint, tipos, tests, gitleaks)"]

    gh -- "deploy al hacer push a main" --> vercel
    vercel --> turso
    vercel -. "lee" .-> secrets
    devNext --> devDb
    devNext -. "lee" .-> devEnv
```

**Protección de la demo pública (RG-04, CA-S04):**

- Las llaves solo existen en el servidor; el navegador nunca las ve.
- Código de acceso para entrar a la demo, compartido con Luyoa. `proxy.ts` exige una sesión en cookie firmada (HMAC, 7 días, `HttpOnly`, `SameSite=Lax`) en todas las páginas y rutas de la interfaz; el código decide el negocio de la sesión (ADR-16).
- Límite de turnos por sesión e IP (IP cifrada con HMAC), tope de pasos por turno (12) y tope de gasto diario calculado con el costo de las trazas. Los contadores viven en la base porque en serverless la memoria no se comparte.
- El límite de gasto de la propia llave de OpenRouter es la última red.

---

## 8. Estructura del repositorio

```text
pt_luyoa/
├─ apps/
│  └─ web/                      Next.js: chat, /api/chat, /api/mcp, /api/approvals, /api/traces, /api/cron
│     ├─ app/
│     ├─ components/blocks/     chart, table, kpis, campaign-card, source, error
│     ├─ components/chat/       hilo, entrada, panel de trazas
│     ├─ lib/agent/             prompt, herramientas de presentación, verificador, trazas
│     ├─ lib/approvals/         emisión de tokens de aprobación
│     └─ lib/db/                esquema Drizzle y consultas
├─ packages/
│  ├─ mcp-server/               src/tools, src/domain, src/api, CLI stdio
│  └─ shared/                   esquemas zod compartidos
├─ evals/
│  ├─ cases/                    escenarios, ejemplo, negativos
│  ├─ golden/                   respuestas de referencia sacadas de la API
│  ├─ reports/                  reportes de evaluación y comparación de modelos
│  └─ src/                      golden, corredor y comparación
├─ scripts/quality/             arneses propios (comentarios bilingües)
├─ docs/                        especificaciones, estándares y gobernanza
├─ .claude/                     permisos, hooks, comandos y subagentes de Claude Code
├─ .githooks/                   commit-msg y pre-commit
├─ .github/                     CI, plantilla de PR, CODEOWNERS
├─ CLAUDE.md · AGENTS.md        contexto para agentes de IA
├─ .env.example                 variables sin valores
└─ README.md
```

---

## 9. Requisitos no funcionales: cómo se cumplen

| RNF | Mecanismo |
|---|---|
| RNF-01 Secretos | Variables de entorno; `.env*` en `.gitignore`; gitleaks en pre-commit y en CI; `api_key_ref` en BD guarda el nombre de la variable, no la llave |
| RNF-02 Confiabilidad | Reintentos con `Retry-After`, errores accionables, respuestas parciales declaradas |
| RNF-03 Contexto mínimo | Herramientas a nivel de tarea con salidas compactas; historial recortado; definiciones fijas en el prompt de sistema (se cachean) |
| RNF-04 Latencia | Streaming; llamadas paralelas de herramientas; caché en memoria de respuestas de la API por `(endpoint, params, data_as_of)` |
| RNF-05 Costo | Tokens y costo por paso desde el `usage` de OpenRouter; tope de pasos; modelo configurable por negocio |
| RNF-06 Mantenibilidad | TypeScript estricto, zod en las fronteras, módulos por herramienta, pruebas por herramienta |
| RNF-07 Portabilidad | Node LTS + pnpm; SQLite local sin instalar nada; un comando para levantar todo |
| RNF-08 Idioma | Prompt y UI en español de México; formateo con `Intl` en `es-MX` y MXN |
| RNF-09 Responsivo | Tailwind, diseño de una columna; panel de trazas plegable |
| RNF-10 Zona horaria | El dominio trabaja en fechas locales `America/Mexico_City`; conversión explícita de timestamps UTC |

---

## 10. Exploración de la API (resuelto)

La exploración del 2026-11-04 cerró los pendientes de esta sección. Resultados en [`05_DISENO_MCP.md`](05_DISENO_MCP.md) §1:

- `/customers` filtra con `segment` (no con `segment_id`, que se ignora en silencio); `/segments` ignora el filtro por sucursal, así que los conteos por sucursal salen de `/customers`.
- Campos de `results` en campañas confirmados; solo una de cuatro campañas históricas tiene grupo de control.
- Latencia observada de 170 ms a 1.8 s, sin cabeceras de límite de rata: caché y limitador propios.
- Queda por confirmar con `/openapi.json` (detrás de Cloudflare Access) la respuesta exacta de crear y enviar campañas.
