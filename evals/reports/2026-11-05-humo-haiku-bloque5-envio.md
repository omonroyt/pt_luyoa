# Evaluación humo-haiku-bloque5-envio · 2026-11-05

Modelo `anthropic/claude-haiku-5.5` · juez `minimax/minimax-m3.1-flash` · commit `422daff+cambios` · prompt `11d811abcf91` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 2 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.97 ± 0.01 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0287 USD | — |
| Costo total (agente / juez) | 0.0574 USD / 0.0019 USD | — |
| Primer texto p50 / p95 | 2.6 s / 16.9 s | — |
| Total p50 / p95 | 33.1 s / 45.9 s | — |
| Llamadas al modelo por caso | 9.0 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-06 | 0.97 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.67 | 0.0248 USD · 33.1 s |
| MT-01 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.81 | 0.0326 USD · 45.9 s |

## Detalle de lo que falló

- **E-06** (repetición 1): juez CA-E06-5 no_cumple: La respuesta afirma que la campaña ya fue enviada, pero el resultado de herramientas visible conserva el estado draft de cmp_eval_001 y no aporta un estado sent ni un id de envío distinto del borrador.; juez CA-C03 no_cumple: No hay evidencia de una segunda aprobación explícita antes del envío; la tarjeta con audiencia, canal, oferta, mensaje y alcance real es la del borrador, no una tarjeta posterior de envío.; juez CA-C10 no_cumple: Aunque se menciona cmp_eval_001 y la audiencia de 267 alcanzables, no se confirma el estado sent ni un id de campaña enviada, ya que la herramienta solo muestra el borrador en estado draft.; juez evidencia parcial: Las oportunidades se respaldan con métricas y valores concretos, pero las afirmaciones de impacto esperado no presentan un periodo propio de la campaña nueva más allá de las fechas de vigencia y el periodo de referencia de junio.; juez claridad parcial: La respuesta comunica de forma directa la audiencia, la oferta, el canal, el impacto esperado y las limitaciones, aunque es más extensa de lo necesario y mezcla dos descripciones parcialmente redundantes.
- **MT-01** (repetición 1): juez CA-C05 parcial: Recalcula el alcance para push (242 alcanzables, 239 sin consentimiento, 2 duplicados) y genera un nuevo borrador/envío, pero no pide explícitamente la aprobación del usuario antes de enviar.; juez CA-C10 parcial: Indica el id cmp_eval_001 y que el envío es simulado, pero no confirma un estado `sent` real ni detalla la audiencia fijada más allá de los filtros.; juez evidencia parcial: Las cifras de lift, control y rango de visitas están respaldadas por herramientas, pero el rango push (28-87 visitas, $2,624.16-$8,153.64) es una extrapolación sin periodo de comparación propio ni fuente directa de resultados push.
