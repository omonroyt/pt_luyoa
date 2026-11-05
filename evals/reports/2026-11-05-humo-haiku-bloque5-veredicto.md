# Evaluación humo-haiku-bloque5-veredicto · 2026-11-05

Modelo `anthropic/claude-haiku-5.5` · juez `minimax/minimax-m3.1-flash` · commit `422daff+cambios` · prompt `11d811abcf91` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 2 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.80 ± 0.01 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0247 USD | — |
| Costo total (agente / juez) | 0.0494 USD / 0.0022 USD | — |
| Primer texto p50 / p95 | 3.5 s / 14.3 s | — |
| Total p50 / p95 | 39.6 s / 47.9 s | — |
| Llamadas al modelo por caso | 9.0 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-06 | 0.81 | ✅ | 100.0% | 0 | ❌ | 0.67 | 1.00 | 0.91 | 0.0228 USD · 39.6 s |
| MT-01 | 0.79 | ✅ | 100.0% | 0 | ❌ | 0.67 | 1.00 | 0.69 | 0.0266 USD · 47.9 s |

## Detalle de lo que falló

- **E-06** (repetición 1): no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-E06-5 no_cumple: El envío no se realizó: la herramienta de aprobación no estaba disponible y la campaña quedó en estado draft, sin confirmación de envío.
- **MT-01** (repetición 1): no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-C05 parcial: Recalculó el alcance tras el cambio a push (242 alcanzables) y dejó el borrador cmp_eval_001, pero no volvió a pedir explícitamente la aprobación de envío, arguing que la herramienta de aprobación no estaba disponible.; juez CA-C10 no_cumple: No se envió ninguna campaña, por lo que no hay estado 'sent', id de envío ni audiencia fijada; solo un borrador en estado proposal/draft.; juez evidencia parcial: Las estimaciones push (28-87 visitas, $2,624-$8,154) no provienen de resultados de herramientas para push sino de una suposición basada en campañas similares, y la referencia WhatsApp se presenta sin periodo dentro de las tarjetas de resultados mostradas.; juez claridad parcial: Abre con WhatsApp y luego recorre el cambio a push con段的 Marketing Concise. 2025-05-27T14:29:23-03.</mm:think>- **CA-C05 — parcial**: Recalculó el alcance para push (242) y creó el borrador `cmp_eval_001`, pero no volvió a pedir explícitamente la aprobación de envío, señalando que la herramienta de aprobación no estaba disponible; la aprobación quedó pendiente, no solicitada de nuevo en la respuesta final. Al menos la tarjeta push muestra `approvalId: propuesta-at-risk-push-concha`, y la tarjeta final muestra estado `draft`, coherente con no haber enviado, lo que evita afirmar un envío no realizado. Por tanto cumple la mitad del criterio (recalcular y mantener borrador) pero falla en el segundo verbo (volver a pedir aprobación). El texto final sí dice 
