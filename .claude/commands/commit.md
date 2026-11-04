---
description: Prepara commits atómicos en Conventional Commits a nombre del desarrollador responsable
argument-hint: "[nota opcional sobre el cambio]"
---

Prepara los commits de los cambios actuales. Contexto adicional del desarrollador: $ARGUMENTS

Reglas (ver `docs/standards/git-workflow.md`):

- El autor es el desarrollador responsable con la identidad de git ya configurada. **No** cambies `user.name` ni `user.email`, **no** uses `--author`.
- **Sin** `Co-Authored-By`, `Signed-off-by` de IA, "Generated with…", "Generado con…" ni menciones a herramientas de IA.
- **Sin** `--no-verify`.
- Nunca en `main`: si la rama actual es `main`, detente y pide crear una rama.

Pasos:

1. Muestra `git status` y `git config user.name` (para confirmar la identidad; no la cambies).
2. Corre `corepack pnpm verify`. Si falla, detente y reporta: no se hace commit con el control de calidad en rojo.
3. Agrupa los cambios en commits atómicos (un cambio lógico por commit).
4. Para cada commit propone: archivos y mensaje `tipo(alcance): descripción` en español, imperativo y minúsculas, con cuerpo y `Refs:` si aplica. Usa solo los tipos y alcances permitidos.
5. **Muestra la propuesta y espera la confirmación explícita del desarrollador.**
6. Con la confirmación, ejecuta cada commit (`git add <archivos>` y `git commit -m "…"`), sin push.
7. Muestra `git log --oneline -n <cantidad>` con el resultado.
