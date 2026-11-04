---
description: Crea una herramienta del servidor MCP siguiendo el diseño y los estándares del proyecto
argument-hint: "<nombre_snake_case> <qué resuelve>"
---

Crea la herramienta MCP `$ARGUMENTS`.

Antes de escribir código:

1. Confirma en `docs/specs/05_DISENO_MCP.md` (o en `03_ARQUITECTURA.md` §4.1 mientras no exista) que la herramienta está en el catálogo. Si no está, detente y pregunta.
2. Confirma en `/openapi.json` o en las respuestas grabadas los endpoints y campos que usará. **No inventes campos.**
3. Lee `packages/mcp-server/CLAUDE.md`.

Implementación:

1. `packages/mcp-server/src/tools/<nombre-kebab>.ts`: descripción para el agente, esquema de entrada zod, handler que orquesta `api/` y `domain/`, salida compacta con `source` y errores `ToolError`.
2. Cálculos nuevos en `packages/mcp-server/src/domain/` como funciones puras.
3. Registro en `src/tools/index.ts`.
4. Pruebas `*.test.ts` para el dominio y para la herramienta con respuestas grabadas (sin red).
5. Comentarios bilingües `ES:` / `EN:` en todo.
6. Actualiza la ficha de la herramienta en la documentación del MCP.
7. Corre `corepack pnpm verify` y reporta el resultado. Propón el commit con `/commit`.
