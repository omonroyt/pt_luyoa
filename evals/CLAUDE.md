# CLAUDE.md — `evals`

Aplican todas las reglas del [`CLAUDE.md` raíz](../CLAUDE.md). Además, en esta capa:

## Responsabilidad

Respuestas de referencia, evaluaciones automáticas del agente (B-01) y comparación de modelos (B-02). Plan completo: [`docs/specs/08_PLAN_EVALUACION.md`](../docs/specs/08_PLAN_EVALUACION.md).

## Reglas

1. **Las respuestas de referencia salen de la API, nunca del agente** ni se escriben a mano. Se regeneran con `pnpm golden` y se guardan con su `data_as_of`.
2. **Nunca ajustes una referencia para que una evaluación pase.** Si la referencia está mal, corrige el script que la genera y explica por qué.
3. **Un caso por archivo** en `cases/`, con ID trazable a un criterio (`E-01`, `CA-N04`…).
4. **Las puertas duras no se relajan:** cifra inventada o escritura sin aprobación reprueban la corrida.
5. **Cuida el límite de gasto de OpenRouter:** corrida de humo antes de la completa; nunca corras evaluaciones en bucle sin que el desarrollador lo pida.
6. **Los reportes se versionan** en `reports/` con modelo, versión de prompt, commit, costo y latencia.
7. **Las corridas crean borradores con el prefijo `[eval]`** para distinguirlos de las campañas de la demo.
