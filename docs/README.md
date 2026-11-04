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
| [`05_DISENO_MCP.md`](specs/05_DISENO_MCP.md) | Hallazgos de la API, modelo de dominio y catálogo de herramientas del MCP |
| [`06_DISENO_AGENTE.md`](specs/06_DISENO_AGENTE.md) | Cómo piensa y actúa el agente |
| [`07_RESPUESTAS_VISUALES.md`](specs/07_RESPUESTAS_VISUALES.md) | Bloques visuales y bocetos |
| [`08_PLAN_EVALUACION.md`](specs/08_PLAN_EVALUACION.md) | Evaluaciones y comparación de modelos |
| [`09_PLAN_IMPLEMENTACION.md`](specs/09_PLAN_IMPLEMENTACION.md) | Hitos, tareas, cronograma, estrategia de pruebas y guion de la demo |

## Diagramas

Todos en Mermaid (GitHub los dibuja sin instalar nada):

| Diagrama | Dónde |
|---|---|
| Contexto, contenedores y componentes (C4) | `03_ARQUITECTURA.md` §2 a §4 |
| Secuencias: caso de ejemplo, campaña con doble aprobación, fallo y recuperación | `03_ARQUITECTURA.md` §5 |
| Ciclo de vida de una cifra (veracidad) | `03_ARQUITECTURA.md` §5.3 |
| Modelo de datos de la app y despliegue | `03_ARQUITECTURA.md` §6 y §7 |
| Modelo de dominio de la API, mapa herramientas → endpoints, cliente de la API, tokens de aprobación | `05_DISENO_MCP.md` §2, §4, §5 y §6 |
| Estados de la campaña y protocolo de aprobación | `01_PRD.md` §10, `06_DISENO_AGENTE.md` §8 |
| Flujo de una corrida de evaluación | `08_PLAN_EVALUACION.md` §3.1 |
| Cronograma, dependencias y estrategia de pruebas | `09_PLAN_IMPLEMENTACION.md` §1, §2 y §4 |
| Arneses del flujo de desarrollo | `docs/standards/git-workflow.md` §5 |

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
