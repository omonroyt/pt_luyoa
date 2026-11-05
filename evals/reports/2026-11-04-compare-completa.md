# Comparación de modelos (completa) · 2026-11-04

| Modelo | Puntaje (media ± desv.) | Casos con puerta dura | Errores | Costo / conversación (USD) | Primer texto p50 / p95 (s) | Total p50 / p95 (s) | Llamadas al modelo |
|---|---|---|---|---|---|---|---|
| `z-ai/glm-5.3-flash` | 0.93 ± 0.08 | 7 | 0 | 0.0050 | 4.1 / 16.5 | 20.2 / 83.3 | 6.0 |
| `anthropic/claude-haiku-5.5` | 0.92 ± 0.08 | 0 | 0 | 0.0107 | 6.3 / 13.2 | 10.1 / 34.8 | 4.2 |

## Regla de decisión (08 §5.4)

- compare-completa-glm-5.3-flash: descartado (7 casos con puerta dura, 0 con error)
- compare-completa-claude-haiku-5.5 tiene el mejor puntaje entre los que pasan las puertas duras

**Elegido según la regla:** `anthropic/claude-haiku-5.5`
