---
description: Registra una decisión técnica nueva o actualiza una existente
argument-hint: "<título de la decisión>"
---

Registra la decisión `$ARGUMENTS` en `docs/specs/04_DECISIONES_TECNICAS.md`.

1. Revisa el índice para no duplicar una decisión existente; si ya existe, actualízala y cambia su estado.
2. Agrega la entrada con el siguiente número (`ADR-NN`) y el formato del documento: contexto, decisión, alternativas, por qué y consecuencias.
3. Basa las alternativas y razones en hechos verificables (mediciones, documentación, restricciones del proyecto). Lo que sea opinión, márcalo como tal.
4. Actualiza el índice y, si la decisión cambia la arquitectura, `03_ARQUITECTURA.md`.
5. Si reemplaza otra decisión, marca la anterior como **Reemplazada** y enlázalas.
6. Propón el commit como `docs(docs): registra ADR-NN …` con `/commit`.
