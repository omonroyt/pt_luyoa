# Copiloto Café Alborada

Copiloto de negocio para la dueña de Café Alborada: le responde cómo va su negocio con datos reales, gráficas y tablas, y le ayuda a decidir y lanzar campañas que solo se envían cuando ella las aprueba.

Prueba técnica de AI Engineer para Luyoa.

> **Estado:** base del proyecto. El servidor MCP, el agente y la interfaz se construyen en las siguientes fases.

## Piezas

| Carpeta | Qué es |
|---|---|
| `packages/mcp-server` | Servidor MCP alrededor de la API de Café Alborada (stdio y HTTP) |
| `packages/shared` | Contratos compartidos (zod): fuentes, periodos, errores, bloques visuales |
| `apps/web` | Next.js: interfaz de chat, orquestador del agente y endpoint `/api/mcp` |
| `evals` | Respuestas de referencia, evaluaciones del agente y comparación de modelos |
| `docs` | Documentación entregable |

## Requisitos

- Node.js 24 o superior
- pnpm (viene con Node vía corepack)

## Cómo correrlo

1. Activa pnpm e instala dependencias:

   ```bash
   corepack enable
   pnpm install
   ```

2. Crea tu archivo de configuración y pega tus llaves:

   ```bash
   cp .env.example .env
   ```

   - `LUYOA_API_KEY`: genérala en https://prueba-developer.luyoa.dev, panel "Tu llave de API".
   - `OPENROUTER_API_KEY`: está en la misma página.
   - `APPROVAL_SECRET` y `MCP_SERVICE_TOKEN`: cualquier valor aleatorio largo. Puedes generarlo con:

     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
     ```

3. Levanta la app:

   ```bash
   pnpm dev
   ```

   Abre http://localhost:3000. En http://localhost:3000/api/health puedes ver qué llaves están configuradas (sin mostrar sus valores).

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la app en modo desarrollo |
| `pnpm verify` | Control de calidad completo: formato, lint, comentarios bilingües, tipos y pruebas |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm check:comments` | Verifica que todos los comentarios sean bilingües (`ES:` / `EN:`) |
| `pnpm typecheck` | Revisa tipos en todos los paquetes |
| `pnpm test` | Pruebas unitarias |
| `pnpm mcp:stdio` | Servidor MCP por stdio (Claude Desktop, Inspector de MCP) |
| `pnpm golden` | Genera respuestas de referencia desde la API |
| `pnpm eval` | Evalúa al agente |
| `pnpm compare` | Compara modelos en calidad, costo y latencia |

## Cómo se trabaja

- [`CLAUDE.md`](CLAUDE.md): reglas del proyecto y mapa de la documentación.
- [`docs/`](docs/README.md): especificaciones, estándares de código y gobernanza de IA.
- Commits en Conventional Commits, validados por los hooks de `.githooks/` (se activan con `pnpm install`).

## Seguridad

Las llaves solo viven en `.env` (ignorado por git) o en las variables de entorno del despliegue. La CI corre gitleaks sobre todo el historial en cada push.
