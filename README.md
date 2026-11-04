# Copiloto Café Alborada

Copiloto de negocio para la dueña de Café Alborada. Responde cómo va el negocio con datos de la API, gráficas, tablas y fuentes verificables, detecta oportunidades y propone campañas con alcance real por canal. Ninguna campaña se crea ni se envía sin su aprobación explícita.

Prueba técnica de AI Engineer para Luyoa · Oscar Monroy.

> **Estado:** base del monorepo, arneses de calidad, gobernanza de IA y documentación de diseño completas. En construcción: servidor MCP, agente e interfaz (ver el [plan de implementación](docs/specs/09_PLAN_IMPLEMENTACION.md)).

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
   | `APPROVAL_SECRET`, `MCP_SERVICE_TOKEN` | Valores aleatorios de 32 bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

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

## Proceso de desarrollo

- [`CLAUDE.md`](CLAUDE.md): reglas del proyecto y mapa de la documentación para agentes de IA.
- [`docs/`](docs/README.md): especificaciones, estándares de código y gobernanza de IA.
- Commits en Conventional Commits, validados por los hooks de `.githooks/` y por la CI.

## Seguridad

Las llaves solo existen en `.env` (ignorado por git) o en las variables de entorno del despliegue. La CI ejecuta gitleaks sobre todo el historial en cada push.
