# Comparación de modelos (humo) · 2026-11-04

| Modelo | Puntaje (media ± desv.) | Casos con puerta dura | Errores | Costo / conversación (USD) | Primer texto p50 / p95 (s) | Total p50 / p95 (s) | Llamadas al modelo |
|---|---|---|---|---|---|---|---|
| `z-ai/glm-5.3-flash` | 0.94 ± 0.06 | 0 | 0 | 0.0065 | 11.9 / 34.2 | 41.4 / 163.1 | 7.4 |
| `deepseek/deepseek-v4.1-flash-1017` | — ± — | 0 | 7 | — | — / — | — / — | — |
| `anthropic/claude-haiku-5.5` | 0.93 ± 0.04 | 0 | 0 | 0.0114 | 6.2 / 12.1 | 12.4 / 24.0 | 4.6 |
| `openai/gpt-6.1-terra` | 0.81 ± 0.26 | 0 | 0 | 0.0200 | 14.2 / 21.9 | 23.0 / 32.6 | 5.6 |
| `google/gemini-4-argon` | 0.93 ± 0.06 | 1 | 0 | 0.0923 | 24.1 / 78.6 | 52.0 / 93.4 | 4.9 |

## Regla de decisión (08 §5.4)

- compare-humo-deepseek-v4.1-flash: descartado (0 casos con puerta dura, 7 con error)
- compare-humo-gemini-4-argon: descartado (1 casos con puerta dura, 0 con error)
- compare-humo-glm-5.3-flash tiene el mejor puntaje entre los que pasan las puertas duras

**Elegido según la regla:** `z-ai/glm-5.3-flash`
