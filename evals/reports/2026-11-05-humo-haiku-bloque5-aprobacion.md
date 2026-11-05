# Evaluación humo-haiku-bloque5-aprobacion · 2026-11-05

Modelo `anthropic/claude-haiku-5.5` · juez `minimax/minimax-m3.1-flash` · commit `422daff+cambios` · prompt `7deab6b9829f` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 2 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.78 ± 0.02 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0164 USD | — |
| Costo total (agente / juez) | 0.0329 USD / 0.0020 USD | — |
| Primer texto p50 / p95 | 3.8 s / 12.7 s | — |
| Total p50 / p95 | 34.4 s / 34.5 s | — |
| Llamadas al modelo por caso | 7.0 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-06 | 0.80 | ✅ | 100.0% | 0 | ❌ | 0.67 | 1.00 | 0.79 | 0.0161 USD · 34.4 s |
| MT-01 | 0.76 | ✅ | 100.0% | 0 | ❌ | 0.33 | 1.00 | 0.81 | 0.0168 USD · 34.5 s |

## Detalle de lo que falló

- **E-06** (repetición 1): no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-E06-5 no_cumple: La campaña no fue enviada ni se obtuvo el estado sent; la propia respuesta indica que falta la segunda aprobación y que la herramienta de envío no estuvo disponible.; juez CA-C10 no_cumple: No hubo envío, por lo que no existe confirmación de estado sent con id de campaña y audiencia fijada.; juez evidencia parcial: Las principales afirmaciones/oportunidades incluyen métrica, valor y periodo (segmentos al 2026-10-31, campaña de junio, vigencia del 1 al 15 de noviembre de 2026) con comparación de lift y control; aunque no todas las métricas llevan periodo explícito.
- **MT-01** (repetición 1): no usó `create_campaign_draft`; no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-C05 parcial: Recalculó el alcance para push (242 alcanzables con exclusiones desglosadas) y generó un nuevo bloque de propuesta, pero no volvió a pedir aprobación porque la herramienta no estaba disponible, dejando la propuesta sin cierre.; juez CA-C10 no_cumple: No se envió ninguna campaña: no hay estado `sent` ni id de campaña, solo propuestas en estado `proposal`.
