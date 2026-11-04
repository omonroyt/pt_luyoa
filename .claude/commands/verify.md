---
description: Corre todo el control de calidad y resume el resultado con honestidad
---

Ejecuta el control de calidad completo del repositorio y reporta el resultado.

1. Corre `corepack pnpm verify` (formato, lint, comentarios bilingües, tipos y pruebas).
2. Si algo falla, muestra el comando, el archivo y la línea, y explica la causa probable.
3. No corrijas nada ni desactives ningún arnés en este comando: solo reporta.
4. Cierra con una tabla de una fila por verificación: `formato | lint | comentarios | tipos | pruebas`, con ✅ o ❌.

No afirmes que algo pasa sin haber mostrado su salida (CA-IA-DEV-02).
