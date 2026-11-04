# Cómo se trabaja en este repositorio

1. Lee [`CLAUDE.md`](CLAUDE.md): reglas, mapa de la documentación y flujo por tarea.
2. Sigue los [estándares de código](docs/standards/coding-standards.md): Clean Code, límites, nombres y comentarios bilingües `ES:` / `EN:`.
3. Sigue el [flujo de git](docs/standards/git-workflow.md): ramas `tipo/descripcion`, Conventional Commits, pull requests.
4. Antes de cada commit: `pnpm verify`.
5. El trabajo asistido por IA cumple la [política de gobernanza de IA](docs/governance/ai-governance-policy.md) y sus [criterios de aceptación](docs/governance/ai-acceptance-criteria.md).

Los hooks de git (`.githooks/`) se activan solos con `pnpm install` y validan cada commit.
