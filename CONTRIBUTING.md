# Proceso de contribución

| Referencia | Contenido |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Reglas del proyecto, mapa de la documentación y flujo por tarea |
| [`docs/standards/coding-standards.md`](docs/standards/coding-standards.md) | Clean Code, límites, nombres y comentarios bilingües `ES:` / `EN:` |
| [`docs/standards/git-workflow.md`](docs/standards/git-workflow.md) | Política de ramas, Conventional Commits y pull requests |
| [`docs/governance/ai-governance-policy.md`](docs/governance/ai-governance-policy.md) | Uso de IA en el desarrollo y en el producto |
| [`docs/governance/ai-acceptance-criteria.md`](docs/governance/ai-acceptance-criteria.md) | Criterios que debe cumplir todo trabajo asistido por IA |

Todo cambio pasa `pnpm verify` antes del commit. Los hooks de `.githooks/` se activan con `pnpm install` y validan formato, lint, comentarios, secretos y mensajes de commit.
