# Estándares de código

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-11-04 |
| Responsable | Oscar Monroy |
| Aplica a | Todo el código del repositorio, escrito por personas o con asistencia de IA |

> Objetivo: código **legible, auditable y fácil de modificar** por un equipo que trabaja en español o en inglés. Cada regla con un arnés automático lo indica en la columna "Lo verifica".

---

## 1. Principios

| Principio | En la práctica |
|---|---|
| **Responsabilidad única** | Un módulo, una razón para cambiar. Una herramienta MCP por archivo, un componente por archivo |
| **Nombres con intención** | El nombre dice qué es o qué hace; si necesitas un comentario para explicar un nombre, cambia el nombre |
| **Funciones pequeñas** | Hacen una cosa, en un nivel de abstracción, con pocos parámetros |
| **DRY con criterio** | Si la misma lógica aparece dos veces, se extrae; no se abstrae "por si acaso" (YAGNI) |
| **KISS** | La solución más simple que cumple el criterio de aceptación |
| **Sin efectos ocultos** | Las funciones de dominio son puras; los efectos (red, BD, reloj) se aíslan en adaptadores |
| **Fallar explícito** | Errores con tipo y mensaje accionable; nunca tragarlos en silencio |
| **Fronteras validadas** | Todo dato que entra (API, usuario, modelo, entorno) se valida con zod |

---

## 2. Límites duros

| Regla | Límite | Lo verifica |
|---|---|---|
| Líneas efectivas por archivo (sin comentarios ni líneas en blanco) | 250 | ESLint `max-lines` |
| Líneas efectivas por función | 60 | ESLint `max-lines-per-function` |
| Complejidad ciclomática | 10 | ESLint `complexity` |
| Profundidad de anidamiento | 3 | ESLint `max-depth` |
| Parámetros por función | 4 (si son más, un objeto con nombre) | ESLint `max-params` |
| Callbacks anidados | 3 | ESLint `max-nested-callbacks` |
| Ancho de línea | 100 | Prettier |
| `any` | Prohibido | ESLint `no-explicit-any` |
| `@ts-ignore` / `@ts-nocheck` | Prohibidos; `@ts-expect-error` solo con explicación bilingüe | ESLint `ban-ts-comment` |
| `console.log` en código de producción | Prohibido (se permiten `console.warn` y `console.error`) | ESLint `no-console` |
| Comentarios | Siempre bilingües | `pnpm check:comments` |

Si un archivo se acerca al límite, se divide por responsabilidad, no por número de líneas.

---

## 3. Nombres

### 3.1 Identificadores (en inglés)

| Elemento | Formato | Ejemplo |
|---|---|---|
| Variables y funciones | `camelCase` | `reachableCustomers`, `comparePeriods()` |
| Booleanos | Prefijo `is`, `has`, `can`, `should` | `isRetryable`, `hasControlGroup` |
| Constantes de módulo | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `DEFAULT_TIMEZONE` |
| Tipos, interfaces, clases | `PascalCase` | `CampaignPreview`, `ToolError` |
| Esquemas zod | `PascalCase`, mismo nombre que su tipo | `const Source = z.object(...)`; `type Source = z.infer<typeof Source>` |
| Componentes de React | `PascalCase` | `CampaignCard` |
| Herramientas MCP | `snake_case` (convención MCP) | `compare_periods` |
| Funciones que devuelven promesas | Verbo de acción, sin sufijo `Async` | `fetchSegments()` |
| Manejadores de eventos | `handle` + evento | `handleApproveClick` |

Reglas adicionales:

- Sin abreviaturas ambiguas: `transactionsPerDay`, no `tpd`; `customer`, no `cust`.
- Sin números mágicos: constantes con nombre (`const PUSH_MESSAGE_LIMIT = 140`).
- El vocabulario del dominio es el de la API: `reachable`, `segment`, `campaign`, `data_as_of`. No se inventan sinónimos.

### 3.2 Archivos y carpetas

| Elemento | Formato | Ejemplo |
|---|---|---|
| Archivos de código | `kebab-case` | `compare-periods.ts`, `campaign-card.tsx` |
| Pruebas | Junto al archivo, sufijo `.test` | `compare-periods.test.ts` |
| Carpetas | `kebab-case`, en plural si agrupan | `tools/`, `blocks/` |
| Documentos | `kebab-case.md` (las especificaciones conservan su numeración) | `git-workflow.md` |
| `index.ts` | Solo reexporta; sin lógica | — |

---

## 4. Comentarios bilingües

**Regla:** todo comentario lleva el mismo contenido en español y en inglés, primero `ES:` y luego `EN:`. Lo verifica `pnpm check:comments` (también en `pre-commit` y en CI).

### 4.1 Cuándo comentar

- **Sí:** el *porqué* de una decisión, una regla de negocio, una restricción externa, un contrato público (JSDoc de funciones y tipos exportados).
- **No:** lo que el código ya dice. Un comentario que repite el código es ruido y se borra.

### 4.2 Formato

```ts
/**
 * ES: Normaliza transacciones por día activo, porque cada día de la semana
 *     aparece un número distinto de veces en el rango (trampa T-02).
 * EN: Normalizes transactions per active day, because each weekday appears
 *     a different number of times in the range (pitfall T-02).
 */
export function transactionsPerDay(transactions: number, activeDays: number): number {
  // ES: Sin días activos no hay promedio; se devuelve 0 en lugar de NaN.
  // EN: Without active days there is no average; return 0 instead of NaN.
  if (activeDays === 0) return 0;
  return transactions / activeDays;
}
```

Reglas del formato:

- Un bloque de comentario (JSDoc, `/* */` o líneas `//` consecutivas) debe tener al menos una línea `ES:` y una `EN:`.
- Las continuaciones se indentan bajo el texto, no se repite la etiqueta.
- Etiquetas JSDoc (`@param`, `@returns`, `@throws`, `@example`) van después del texto bilingüe; su descripción también es bilingüe: `@param activeDays ES: días con ventas. EN: days with sales.`
- Están exentos de la regla: directivas de herramientas (`eslint-…`, `prettier-ignore`), bloques que solo contienen anotaciones de tipo JSDoc (`@type`, `@typedef`, `@template`), el shebang `#!` y las referencias `/// <reference … />`. `@ts-expect-error` no está exento: su explicación va en formato bilingüe.
- En archivos de shell (`.githooks/`) se usa el mismo formato con `#`.

---

## 5. Estructura y separación

- **Capas y dependencias:** ver la tabla de capas en [`CLAUDE.md`](../../CLAUDE.md) §6. Ninguna capa importa "hacia arriba".
- **Dominio puro, adaptadores aparte:** cálculos en `domain/` sin red ni reloj; llamadas a la API en `api/`; las herramientas MCP orquestan.
- **Un concepto por archivo.** Si un archivo tiene dos secciones que podrían vivir solas, se separan.
- **Tipos cerca de su uso**, salvo contratos compartidos, que viven en `@alborada/shared`.
- **Sin código muerto** ni comentado: el historial de git lo conserva.
- **Configuración centralizada:** variables de entorno se leen y validan en un solo lugar por paquete (`config.ts`).

---

## 6. TypeScript

- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` activados (ver `tsconfig.base.json`).
- `import type` para importar solo tipos.
- Tipos de retorno explícitos en funciones exportadas.
- Preferir uniones discriminadas sobre banderas booleanas combinadas.
- `unknown` en lugar de `any`, y validar antes de usar.
- Imports relativos sin extensión; nada de rutas relativas que crucen paquetes (usar el nombre del paquete). Excepción: `scripts/` importa con extensión `.ts` porque Node lo ejecuta sin compilar desde los hooks.
- TypeScript 6.0 (ADR-18).

---

## 7. Errores, registros y asincronía

- Los errores de la API se traducen a `ToolError` (`@alborada/shared`) con `retryable` y una sugerencia.
- Nunca se registra una llave, un token, un `.env` ni datos personales de clientes. Se registra el id, no el contenido.
- `async/await` siempre; nada de promesas sueltas sin `await` o sin manejo.
- Llamadas independientes en paralelo con `Promise.all`; reintentos solo donde el estándar lo define (429 y 503).

---

## 8. Pruebas

- Toda función de dominio tiene pruebas unitarias; toda herramienta MCP tiene pruebas contra respuestas grabadas.
- Nombre de la prueba en español, describe el comportamiento: `it("usa transacciones por día y no totales")`.
- Patrón *preparar, ejecutar, verificar*; una razón de fallo por prueba.
- Sin llamadas reales a la red en `pnpm test`; las pruebas de integración van aparte.

---

## 9. Formato

- Prettier define el formato; no se discute a mano. `pnpm format` lo aplica.
- Indentación de 2 espacios, comillas dobles, punto y coma, comas finales, fin de línea LF (`.editorconfig`, `.gitattributes`).

---

## 10. Revisión

Antes de proponer un commit se revisa con el subagente `code-reviewer` o con `/review`, que aplica esta lista:

- [ ] ¿Cada archivo y función tiene una sola responsabilidad y respeta los límites?
- [ ] ¿Los nombres dicen la intención y usan el vocabulario del dominio?
- [ ] ¿Hay duplicación que se pueda extraer?
- [ ] ¿Los comentarios explican el porqué y son bilingües?
- [ ] ¿Los datos de entrada se validan y los errores son accionables?
- [ ] ¿Hay pruebas del comportamiento nuevo?
- [ ] ¿Se respetan las capas y no hay secretos ni datos personales en registros?
