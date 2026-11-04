# CLAUDE.md — `packages/shared`

Aplican todas las reglas del [`CLAUDE.md` raíz](../../CLAUDE.md). Además, en esta capa:

## Responsabilidad

Contratos compartidos entre el MCP, el agente, la interfaz y las evaluaciones: `Source`, `Period`, `ToolError` y los esquemas de los bloques visuales ([`docs/specs/07_RESPUESTAS_VISUALES.md`](../../docs/specs/07_RESPUESTAS_VISUALES.md)).

## Reglas

1. **Sin dependencias de otras capas** y sin APIs de Node ni del navegador: este paquete corre en servidor y en cliente.
2. **Esquema zod primero, tipo derivado después** (`z.infer`). Nunca un tipo escrito a mano que duplique un esquema.
3. **Un archivo por contrato** (`source.ts`, `errors.ts`, `blocks/chart.ts`…) y `index.ts` solo reexporta.
4. **Cambiar un contrato es un cambio de API:** actualiza el documento que lo describe y todos sus consumidores en el mismo cambio.
