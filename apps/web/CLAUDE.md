# CLAUDE.md — `apps/web`

Aplican todas las reglas del [`CLAUDE.md` raíz](../../CLAUDE.md). Además, en esta capa:

@AGENTS.md

## Responsabilidad

Interfaz de chat, orquestador del agente (`/api/chat`), aprobaciones (`/api/approvals`), endpoint HTTP del MCP (`/api/mcp`) y resumen semanal (`/api/cron/weekly`). Diseño: [`03_ARQUITECTURA.md`](../../docs/specs/03_ARQUITECTURA.md) §4.2 y §4.3, [`06_DISENO_AGENTE.md`](../../docs/specs/06_DISENO_AGENTE.md), [`07_RESPUESTAS_VISUALES.md`](../../docs/specs/07_RESPUESTAS_VISUALES.md).

## Estructura

```text
app/                    Rutas de Next.js (páginas y route handlers)
components/blocks/      Un componente por bloque visual: chart, table, kpis, campaign-card, source
components/chat/        Hilo, entrada, panel de trazas
lib/agent/              Prompt de sistema, herramientas de presentación, verificador de cifras, trazas
lib/approvals/          Emisión y verificación de tokens de aprobación
lib/db/                 Esquema Drizzle y consultas
```

## Reglas

1. **Lee la guía de Next 16** en `node_modules/next/dist/docs/` antes de escribir código de Next.
2. **El agente solo accede a datos por el MCP.** Nada de `fetch` directo a la API de Café Alborada desde el agente o la UI.
3. **Las llaves solo viven en el servidor.** Nunca uses `NEXT_PUBLIC_` para un secreto; nunca devuelvas variables de entorno al cliente.
4. **Componentes pequeños y presentacionales**; la lógica va en `lib/`. Un componente por archivo, archivo en `kebab-case.tsx`, componente en `PascalCase`.
5. **Los bloques visuales se validan con su esquema de `@alborada/shared`** antes de mostrarse, y pasan por el verificador de cifras.
6. **El candado de aprobación es intocable:** las herramientas de aprobación se resuelven en la interfaz por la persona; el servidor nunca auto-aprueba.
7. **Accesible y responsivo:** funciona en 375 px; toda gráfica tiene título, unidades y una tabla equivalente.
8. **Textos de la interfaz en español de México**; montos con `Intl.NumberFormat("es-MX", { currency: "MXN" })`.
