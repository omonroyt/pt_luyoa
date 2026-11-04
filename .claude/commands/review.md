---
description: Revisa los cambios actuales contra los estándares, la gobernanza de IA y los criterios de aceptación
argument-hint: "[rama o rango de commits opcional]"
---

Revisa los cambios de `$ARGUMENTS`. Si está vacío: en `main`, los cambios sin commit y los commits aún sin push; en una rama de feature, además, todo lo de la rama contra `main`.

1. Obtén el diff con `git diff`, `git diff origin/main...HEAD` (en `main`) o `git diff main...HEAD` (en una rama de feature).
2. Delega la revisión en el subagente `code-reviewer`, pasándole el diff y los archivos tocados.
3. Si el diff toca el agente, el prompt, las herramientas del MCP o las evaluaciones, pide también una revisión al subagente `veracity-auditor`.
4. Si el diff toca configuración, secretos, dependencias, `.claude/`, `.githooks/` o la CI, pide también una revisión al subagente `security-reviewer`.
5. Consolida los hallazgos en una sola lista, ordenada por severidad, con archivo y línea, la regla incumplida (ID de estándar o criterio `CA-`) y la corrección sugerida.
6. No apliques correcciones en este comando; pregunta al desarrollador cuáles aplicar.
