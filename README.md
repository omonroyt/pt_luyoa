# Copiloto Café Alborada

Copiloto de negocio para la dueña de Café Alborada. Responde cómo va el negocio con datos de la API, gráficas, tablas y fuentes verificables, detecta oportunidades y propone campañas con alcance real por canal. Ninguna campaña se crea ni se envía sin su aprobación explícita.

Prueba técnica de AI Engineer para Luyoa · Oscar Monroy.

> **Estado:** servidor MCP con 13 herramientas (11 de lectura y 2 de escritura protegidas por aprobación), base de datos, endpoints `/api/mcp` y `/api/approvals`, arneses de calidad y gobernanza de IA. En construcción: agente e interfaz (ver el [plan de implementación](docs/specs/09_PLAN_IMPLEMENTACION.md)).

## Arquitectura

| Pieza | Ubicación | Responsabilidad |
|---|---|---|
| Servidor MCP | `packages/mcp-server` | Herramientas de negocio sobre la API de Café Alborada; cifras calculadas en código y con procedencia; transporte stdio y HTTP |
| Contratos | `packages/shared` | Esquemas zod compartidos: fuentes, periodos, errores, bloques visuales |
| Aplicación | `apps/web` | Next.js: interfaz de chat, orquestador del agente (`/api/chat`), aprobaciones y endpoint `/api/mcp` |
| Evaluaciones | `evals` | Respuestas de referencia, evaluaciones automáticas y comparación de modelos |
| Documentación | `docs` | Especificaciones, estándares de código y gobernanza de IA |

Detalle y diagramas: [`docs/specs/03_ARQUITECTURA.md`](docs/specs/03_ARQUITECTURA.md).

## Requisitos

- Node.js 24 o superior.
- pnpm 12, incluido en Node a través de corepack.

## Instalación y ejecución

1. Instalar dependencias (también activa los git hooks del proyecto):

   ```bash
   corepack enable
   pnpm install
   ```

2. Configurar el entorno a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   | Variable | Origen |
   |---|---|
   | `LUYOA_API_KEY` | Portal https://prueba-developer.luyoa.dev, panel "Tu llave de API" |
   | `OPENROUTER_API_KEY` | Mismo portal; llave con límite de gasto |
   | `APPROVAL_SECRET`, `MCP_SERVICE_TOKEN`, `CRON_SECRET` | Valores aleatorios de 32 bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `BUSINESSES` (opcional) | Registro de varios negocios con los nombres de sus variables secretas; formato en `.env.example` (ADR-16) |

3. Levantar la aplicación:

   ```bash
   pnpm dev
   ```

   La aplicación queda en http://localhost:3000. El endpoint http://localhost:3000/api/health indica qué variables están configuradas, sin exponer sus valores.

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | Aplicación en modo desarrollo |
| `pnpm verify` | Control de calidad completo: formato, lint, comentarios bilingües, tipos y pruebas |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm check:comments` | Verificación de comentarios bilingües (`ES:` / `EN:`) |
| `pnpm typecheck` | Tipos en todos los paquetes |
| `pnpm test` | Pruebas unitarias |
| `pnpm mcp:stdio` | Servidor MCP por stdio (Claude Desktop, Inspector de MCP) |
| `pnpm golden` | Respuestas de referencia generadas desde la API |
| `pnpm eval` | Evaluación del agente |
| `pnpm compare` | Comparación de modelos en calidad, costo y latencia |

## Servidor MCP

Herramientas de nivel de tarea sobre la API de Café Alborada. Toda cifra se calcula en código y llega con su procedencia (`source`: endpoints, periodo y `data_as_of`). Diseño completo: [`docs/specs/05_DISENO_MCP.md`](docs/specs/05_DISENO_MCP.md).

| Herramienta | Resuelve |
|---|---|
| `get_business_context` | Fecha de corte, sucursales, segmentos y calendario de periodos resuelto |
| `compare_periods` | Dos periodos con variación, promedio por día y principal motor del cambio |
| `sales_breakdown` / `visits_breakdown` | Agrupaciones con la métrica correcta (transacciones por día, utilidad antes de descuentos) |
| `location_health` | Tendencia de cada sucursal contra su historial, con nivel de preocupación y razones |
| `customer_segments` | Tamaño y definición de segmentos, también por sucursal |
| `audience_reach` | Alcance real por canal con exclusiones |
| `campaign_performance` | Campañas pasadas con lift contra control, intervalo de confianza y confiabilidad |
| `offer_economics` | Costo por canje y efecto en margen de una oferta |
| `estimate_campaign_impact` | Rango de visitas, ventas y utilidad esperadas de una campaña |
| `lookup` | Detalle de un producto, cliente (sin datos personales) o campaña |
| `create_campaign_draft` | Crea un borrador; exige un token de aprobación emitido para el contenido exacto |
| `send_campaign` | Envía un borrador; exige un segundo token de aprobación y verifica contra el borrador guardado |

Las dos herramientas de escritura exigen un token HMAC de un solo uso, ligado a la acción, la campaña y el hash del contenido que la persona aprobó (ADR-08). Por stdio no hay aprobaciones configuradas, así que ahí el servidor solo permite lecturas.

Uso fuera de la aplicación:

| Comando | Descripción |
|---|---|
| `pnpm mcp:stdio` | Servidor por stdio |
| `npx @modelcontextprotocol/inspector node --env-file=.env --import tsx packages/mcp-server/src/cli.ts` | Inspector de MCP (desde la raíz del repositorio) |
| `pnpm --filter @alborada/mcp-server smoke` | Prueba de humo por stdio contra la API real |
| `pnpm --filter @alborada/mcp-server fixtures:record` | Regrabación de fixtures de prueba, sin datos personales |

## Endpoints de la aplicación

| Endpoint | Uso | Protección |
|---|---|---|
| `GET /api/health` | Variables configuradas, sin exponer valores | Pública |
| `POST /api/mcp` | Servidor MCP por Streamable HTTP sin sesión | `Authorization: Bearer <MCP_SERVICE_TOKEN>` |
| `POST /api/approvals` | Emite el token de aprobación cuando la persona aprueba una campaña | Solo mismo origen |

## Base de datos

SQLite local en `data/local.db` (ignorado por git) o Turso en despliegue, según `DATABASE_URL`. Las migraciones de `apps/web/lib/db/migrations` se aplican automáticamente al abrir la conexión. Tras cambiar el esquema: `pnpm --filter @alborada/web db:generate`.

## Respuestas de referencia

`pnpm golden` calcula las cifras correctas de cada escenario directamente desde la API, con un cliente independiente del servidor MCP, y las guarda en `evals/golden/`. Una prueba de consistencia compara esas cifras con las de las herramientas del MCP: si divergen, alguno de los dos cálculos es incorrecto.

## Proceso de desarrollo

- [`CLAUDE.md`](CLAUDE.md): reglas del proyecto y mapa de la documentación para agentes de IA.
- [`docs/`](docs/README.md): especificaciones, estándares de código y gobernanza de IA.
- Commits en Conventional Commits, validados por los hooks de `.githooks/` y por la CI.

## Créditos

- Ilustración de la taza: "Hot beverage" de [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) © Microsoft Corporation, licencia MIT, recoloreada para la marca (`apps/web/public/brand/taza-cafe.png`, `apps/web/app/icon.png`).

## Seguridad

Las llaves solo existen en `.env` (ignorado por git) o en las variables de entorno del despliegue. La CI ejecuta gitleaks sobre todo el historial en cada push.
