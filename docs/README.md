# Documentación

| Carpeta | Contenido |
|---|---|
| [`specs/`](specs/) | Especificaciones del producto: contexto de la prueba, PRD, criterios de aceptación, arquitectura, decisiones técnicas, diseño del agente, respuestas visuales y plan de evaluación |
| [`standards/`](standards/) | Cómo se escribe el código y cómo se trabaja con git |
| [`governance/`](governance/) | Gobernanza de IA: política, criterios de aceptación para trabajo con IA, datos y secretos, registro de riesgos |

## Especificaciones

| Documento | Qué responde |
|---|---|
| [`CONTEXTO_PRUEBA_TECNICA.md`](specs/CONTEXTO_PRUEBA_TECNICA.md) | Qué pide la prueba; IDs `R-`, `B-`, `X-`, `E-`, `T-` |
| [`01_PRD.md`](specs/01_PRD.md) | Qué se construye y por qué |
| [`02_CRITERIOS_ACEPTACION.md`](specs/02_CRITERIOS_ACEPTACION.md) | Cómo se sabe que está bien hecho; trazabilidad |
| [`03_ARQUITECTURA.md`](specs/03_ARQUITECTURA.md) | Piezas, comunicación y despliegue (diagramas) |
| [`04_DECISIONES_TECNICAS.md`](specs/04_DECISIONES_TECNICAS.md) | Decisiones con alternativas (ADR) |
| `05_DISENO_MCP.md` | Catálogo de herramientas del MCP (pendiente de explorar la API) |
| [`06_DISENO_AGENTE.md`](specs/06_DISENO_AGENTE.md) | Cómo piensa y actúa el agente |
| [`07_RESPUESTAS_VISUALES.md`](specs/07_RESPUESTAS_VISUALES.md) | Bloques visuales y bocetos |
| [`08_PLAN_EVALUACION.md`](specs/08_PLAN_EVALUACION.md) | Evaluaciones y comparación de modelos |

## Estándares

| Documento | Qué responde |
|---|---|
| [`coding-standards.md`](standards/coding-standards.md) | Clean Code, límites, nombres, comentarios bilingües, capas, pruebas |
| [`git-workflow.md`](standards/git-workflow.md) | Autoría, Conventional Commits, ramas y pull requests |

## Gobernanza de IA

| Documento | Qué responde |
|---|---|
| [`ai-governance-policy.md`](governance/ai-governance-policy.md) | Principios, roles, marcos (ISO/IEC 42001 y otros), impacto, ciclo de vida, incidentes |
| [`ai-acceptance-criteria.md`](governance/ai-acceptance-criteria.md) | Qué debe cumplir todo trabajo hecho con IA (`CA-IA-`) |
| [`data-and-secrets.md`](governance/data-and-secrets.md) | Clasificación de datos, secretos, privacidad y retención |
| [`ai-risk-register.md`](governance/ai-risk-register.md) | Riesgos de IA, controles e indicadores |
