---
description: Sube la rama y abre un pull request a nombre del desarrollador, sin atribución a IA
---

Abre un pull request de la rama actual hacia `main`.

1. Verifica que la rama no sea `main`, que no haya cambios sin commit y que `corepack pnpm verify` pase.
2. Revisa que todos los commits de la rama (`git log main..HEAD`) sigan Conventional Commits y no tengan atribución a IA. Si alguno no cumple, detente y reporta.
3. Redacta el PR con la plantilla `.github/pull_request_template.md`:
   - Título en formato Conventional Commits.
   - Qué cambia, por qué, requisitos y criterios que atiende (`R-`, `CA-`, `ADR-`), cómo se probó.
   - **Sin** "Generated with…", "Generado con…" ni menciones a herramientas de IA.
4. **Muestra el título y la descripción y espera la confirmación explícita del desarrollador** antes de hacer push o crear el PR.
5. Con la confirmación: `git push -u origin <rama>` (nunca `--force`) y `gh pr create` con el título y el cuerpo aprobados.
6. Devuelve el enlace del PR.
