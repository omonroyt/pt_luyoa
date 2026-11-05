# Evaluación compare-humo-gemini-4-argon · 2026-11-04

Modelo `google/gemini-4-argon` · juez `minimax/minimax-m3.1-flash` · commit `08a6792+cambios` · prompt `932c93c24281` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 7 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.93 ± 0.06 | ≥ 0.90 |
| Casos con puerta dura | 1 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 2 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0923 USD | — |
| Costo total (agente / juez) | 0.6460 USD / 0.0064 USD | — |
| Primer texto p50 / p95 | 24.1 s / 78.6 s | — |
| Total p50 / p95 | 52.0 s / 93.4 s | — |
| Llamadas al modelo por caso | 4.9 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-01 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.75 | 0.0573 USD · 30.8 s |
| E-02 | 0.87 | ✅ | 100.0% | 0 | ✅ | 0.00 | 1.00 | 0.68 | 0.1109 USD · 52.0 s |
| E-03 | 0.83 | ❌ cifras sin fuente: 90, 90 | 100.0% | 2 | ✅ | 1.00 | 1.00 | 0.78 | 0.0585 USD · 32.3 s |
| E-04 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.75 | 0.0540 USD · 27.4 s |
| E-05 | 0.89 | ✅ | 100.0% | 0 | ✅ | 0.00 | 1.00 | 0.86 | 0.0913 USD · 64.0 s |
| E-06 | 1.00 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.96 | 0.1377 USD · 76.9 s |
| EJEMPLO | 0.99 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.95 | 0.1363 USD · 93.4 s |

## Detalle de lo que falló

- **E-01** (repetición 1): juez especificidad no_cumple: La recomendación solo plantea dos focos genéricos ('reactivar clientes en riesgo' o 'empujar Comida') sin audiencia, canal, oferta, fechas ni alcance de campaña.; juez criterio_de_negocio no_cumple: No considera costo, margen ni rentabilidad de la acción propuesta, y no formula ninguna oferta concreta cuya razonabilidad en margen pueda evaluarse.; juez advertencias parcial: Aporta la salvedad metodológica de que el desglose por categoría usa ventas brutas antes de descuentos, pero no menciona limitaciones de comparabilidad estacional ni de diseño (ausencia de grupo de control).
- **E-02** (repetición 1): no menciona /martes/; no menciona /por d[ií]a/; juez CA-E02-1 parcial: ; juez CA-E02-3 no_cumple: ; juez CA-E02-6 no_cumple: ; juez evidencia parcial: ; juez claridad parcial: 
- **E-03** (repetición 1): cifra sin fuente 90; cifra sin fuente 90; juez especificidad parcial: La recomendación identifica audiencia (219 clientes en riesgo), pero no canal, oferta ni fechas de campaña, y solo ofrece preparar la propuesta sin ejecutarla.; juez criterio_de_negocio parcial: Se alude a cuidar el margen al elegir la oferta, pero no se cuantifica costo, margen ni rentabilidad de la reactivación propuesta.; juez advertencias no_cumple: La respuesta no menciona limitaciones del análisis, como la ausencia de grupo de control, posible efecto estacional o diferencias entre sucursales.
- **E-04** (repetición 1): juez especificidad parcial: Nombra audiencia (en riesgo), canal (email) y alcance (330 contactables), pero no propone una oferta concreta ni fechas de campaña.; juez evidencia parcial: Las oportunidades se apoyan en métricas, valores y periodo de corte, pero no hay comparaciones de conversión, costo o retorno que sustenten la prioridad más allá del alcance y gasto promedio.; juez criterio_de_negocio no_cumple: No considera costo, margen ni una oferta razonable; solo menciona el gasto histórico promedio y deja la propuesta de oferta y campañas para una interacción posterior.; juez advertencias parcial: Aclara que los segmentos son excluyentes y que los canales pueden traslaparse, pero no advierte sobre la ausencia de grupo de control u otras limitaciones para evaluar la recuperación.
- **E-05** (repetición 1): no menciona /control/; juez CA-E05-4 parcial: Calcula el costo de la oferta propuesta ($10 por canje, $840 total) y su margen, pero no compara el costo de oferta entre las campañas históricas evaluadas.; juez CA-E05-5 parcial: La tabla incluye campaña, canal, oferta, entregados, apertura, canje, lift y confiabilidad, pero omite la audiencia y el tamaño (n) de cada campaña.; juez claridad parcial: Los visuales son claros y la propuesta aparece de inmediato, pero no hay texto de respuesta que exponga primero la conclusión y el lector debe interpretar la tabla por su cuenta.
- **E-06** (repetición 1): juez evidencia parcial: Las oportunidades principales incluyen métricas, valores y periodos, pero la comparación de canales se apoya en alcance y en una única campaña comparable, sin una comparación explícita de resultados por canal.
- **EJEMPLO** (repetición 1): juez CA-EJ-5 parcial: Presenta una tarjeta de campaña con fuentes citadas y periodo, pero no incluye la pregunta explícita '¿Preparo el borrador?' que exige el criterio; solo dice 'Aquí tienes la tarjeta de la propuesta lista por si quieres crear el borrador'.
