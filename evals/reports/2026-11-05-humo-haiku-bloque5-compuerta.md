# Evaluación humo-haiku-bloque5-compuerta · 2026-11-05

Modelo `anthropic/claude-haiku-5.5` · juez `minimax/minimax-m3.1-flash` · commit `422daff+cambios` · prompt `907b897fb11e` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 2 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.88 ± 0.09 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0309 USD | — |
| Costo total (agente / juez) | 0.0618 USD / 0.0021 USD | — |
| Primer texto p50 / p95 | 4.5 s / 6.4 s | — |
| Total p50 / p95 | 35.7 s / 55.2 s | — |
| Llamadas al modelo por caso | 10.5 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-06 | 0.79 | ✅ | 100.0% | 0 | ❌ | 0.67 | 1.00 | 0.75 | 0.0174 USD · 35.7 s |
| MT-01 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.75 | 0.0444 USD · 55.2 s |

## Detalle de lo que falló

- **E-06** (repetición 1): no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-E06-5 no_cumple: La campaña nunca se envió: el copiloto declara que la herramienta de aprobación no estuvo disponible y el estado final sigue siendo draft, sin confirmación sent.; juez CA-C03 parcial: Se respetó el flujo de no enviar sin aprobación y la tarjeta muestra audiencia, canal, oferta, mensaje y alcance real, pero nunca se produjo la segunda aprobación explícita ni el envío posterior.; juez CA-C10 no_cumple: No hubo envío, por lo que no existe confirmación de estado sent con id de campaña y audiencia fijada.; juez evidencia parcial: Las cifras clave tienen valor y fuente, pero la comparación histórica (+23.9 pts) no incluye periodo explícito de la campaña pasada ni la comparación de costo por canje ($33.6 histórico vs $10 actual).
- **MT-01** (repetición 1): juez CA-C10 no_cumple: Afirma que la campaña quedó enviada, pero el bloque visual y el propio texto indican que solo se creó un borrador en modo simulado (cmp_eval_001, pending, sin envío real), por lo que no hay confirmación válida de estado sent con id y audiencia fijada.; juez evidencia parcial: Las oportunidades se cuantifican con valores y periodos (ticket promedio $93.72 últimos 3 meses, lift +23.9 pts con IC 11.7-36, control de 67, 242 alcanzables), aunque la proyección de push se apoya en referencias de otro canal sin medición directa.; juez criterio_de_negocio parcial: Considera costo de $10 por canje, margen de $56.54 por visita y costo total estimado, aunque la proyección de canjes 24-97 es una estimación no medida para push.
