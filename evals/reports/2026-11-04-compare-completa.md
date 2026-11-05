# Comparación de modelos (completa) · 2026-11-04

| Modelo | Puntaje (media ± desv.) | Casos con puerta dura | Errores | Costo / conversación (USD) | Primer texto p50 / p95 (s) | Total p50 / p95 (s) | Llamadas al modelo |
|---|---|---|---|---|---|---|---|
| `z-ai/glm-5.3-flash` | 0.94 ± 0.07 | 8 | 0 | 0.0052 | 7.9 / 27.8 | 33.3 / 126.9 | 6.0 |
| `anthropic/claude-haiku-5.5` | 0.91 ± 0.13 | 2 | 50 | 0.0092 | 5.3 / 9.7 | 9.4 / 29.1 | 3.7 |

## Regla de decisión (08 §5.4)

- compare-completa-glm-5.3-flash: descartado (8 casos con puerta dura, 0 con error)
- compare-completa-claude-haiku-5.5: descartado (2 casos con puerta dura, 50 con error)
- Ningún modelo pasa las puertas duras.

**Sin modelo elegible.**
