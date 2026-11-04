# CLAUDE.md — `packages/mcp-server`

Aplican todas las reglas del [`CLAUDE.md` raíz](../../CLAUDE.md). Además, en esta capa:

## Responsabilidad

Servidor MCP alrededor de la API de Café Alborada. Las herramientas están pensadas para lo que un agente necesita, **no** son un espejo 1:1 de los endpoints (R-01). Diseño: [`docs/specs/03_ARQUITECTURA.md`](../../docs/specs/03_ARQUITECTURA.md) §4.1 y `05_DISENO_MCP.md` (pendiente).

## Estructura

```text
src/
  config.ts          Lectura y validación del entorno
  server.ts          createServer(): registra herramientas
  cli.ts             Transporte stdio
  tools/             Una herramienta por archivo + index.ts que las registra
  domain/            Cálculos puros: periodos, normalización, lift, costo de oferta
  api/               Cliente HTTP: paginación, caché, límite de rata, reintentos, errores
```

## Reglas

1. **Una herramienta por archivo** en `tools/`, con: nombre en `snake_case`, descripción para el agente, esquema de entrada zod, ejemplo y prueba.
2. **Las cifras las calcula el código** (ADR-09). Variaciones, porcentajes, normalización por día, lift y costos viven en `domain/` como funciones puras con pruebas.
3. **Toda respuesta con cifras lleva `source`** (endpoint, parámetros, periodo, `data_as_of`) usando el tipo `Source` de `@alborada/shared`.
4. **Salidas compactas.** Nunca devuelvas listados crudos al agente; agrega y recorta.
5. **Errores accionables** con el formato `ToolError` de `@alborada/shared`: código, mensaje, `retryable` y sugerencia.
6. **Reintentos solo para `429` y `503`**, respetando `Retry-After` y un presupuesto máximo por llamada.
7. **Escrituras protegidas.** `create_campaign_draft` y `send_campaign` exigen un token de aprobación válido (ADR-08). Nunca agregues un modo que lo omita, ni para pruebas: en pruebas se firma un token de prueba.
8. **Validar antes de llamar:** longitud del mensaje por canal, oferta posterior a `data_as_of`, campos de la oferta según su tipo.
9. **Nunca inventes campos de la API.** Confírmalos en `/openapi.json` o en las respuestas grabadas (`fixtures`).
10. **Por stdio, nada a stdout** salvo mensajes del protocolo; los registros van a `stderr` y sin secretos.
