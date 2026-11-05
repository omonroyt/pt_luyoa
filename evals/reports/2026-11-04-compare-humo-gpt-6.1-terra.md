# Evaluación compare-humo-gpt-6.1-terra · 2026-11-04

Modelo `openai/gpt-6.1-terra` · juez `minimax/minimax-m3.1-flash` · commit `08a6792+cambios` · prompt `932c93c24281` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 7 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.81 ± 0.26 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 75.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0200 USD | — |
| Costo total (agente / juez) | 0.1398 USD / 0.0050 USD | — |
| Primer texto p50 / p95 | 14.2 s / 21.9 s | — |
| Total p50 / p95 | 23.0 s / 32.6 s | — |
| Llamadas al modelo por caso | 5.6 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-01 | 0.97 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.72 | 0.0086 USD · 15.6 s |
| E-02 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.82 | 0.0346 USD · 23.0 s |
| E-03 | 0.76 | ✅ | 50.0% | 0 | ✅ | 1.00 | 1.00 | 0.60 | 0.0201 USD · 14.5 s |
| E-04 | 0.97 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.70 | 0.0120 USD · 15.3 s |
| E-05 | 0.99 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.91 | 0.0247 USD · 32.6 s |
| E-06 | 0.22 | ✅ | 0.0% | 0 | ❌ | 0.33 | 0.00 | 0.38 | 0.0171 USD · 23.8 s |
| EJEMPLO | 0.78 | ✅ | 50.0% | 0 | ✅ | 1.00 | 1.00 | 0.85 | 0.0228 USD · 26.8 s |

## Detalle de lo que falló

- **E-01** (repetición 1): juez especificidad no_cumple: No hay recomendación con audiencia, canal, oferta, fechas y alcance concretos; solo se sugiere revisar qué pasó en Roma Norte.; juez evidencia parcial: Las afirmaciones sobre ventas, utilidad, ticket y sucursales llevan métrica, valor y periodo, pero la sugerencia de revisar Roma Norte no incluye cifras propias ni comparación.; juez criterio_de_negocio no_cumple: No se considera costo, margen ni razonabilidad de ninguna oferta; solo se reporta la utilidad bruta sin analizar su relación con costos o promociones.
- **E-02** (repetición 1): juez CA-E02-3 no_cumple: No menciona en absoluto si el patrón se mantiene en Coyoacán, Polanco y Roma Norte ni si cambia por sucursal.; juez CA-E02-6 parcial: No cierra preguntando explícitamente si se prepara el borrador; solo presenta la propuesta como estado 'proposal' sin una pregunta de aprobación.; juez evidencia parcial: La afirmación principal (martes con 181.67 trans/día) trae métrica, valor y periodo, pero no compara con el resto de días ni con otras sucursales en el texto.
- **E-03** (repetición 1): cifra faltante `by_location[0].net_sales_change_percent`; juez CA-E03-1 parcial: Compara Roma Norte y Coyoacán con sus periodos base y da ticket promedio y visitas por día, pero no presenta las métricas completas de las tres sucursales (Polanco queda solo en la gráfica).; juez CA-E03-4 no_cumple: No explica que el tamaño absoluto de una sucursal no la hace preocupante; solo señala la caída porcentual de Roma Norte.; juez especificidad parcial: Sugiere revisar horarios, operación y afluencia en Roma Norte, pero sin audiencia, canal, oferta ni fechas concretas.; juez criterio_de_negocio no_cumple: No considera costo, margen ni la razonabilidad de una oferta concreta de recuperación.; juez advertencias no_cumple: No menciona limitaciones del análisis (ausencia de grupo de control, posible estacionalidad o datos parciales) ni cautions sobre el periodo comparado.
- **E-04** (repetición 1): juez CA-E04-5 parcial: Recomienda el canal (email, mayor alcance en ambos grupos) pero no indica explícitamente en qué segmento enfocarse ni argumenta la prioridad más allá del alcance.; juez especificidad parcial: Nombra audiencia, canal y alcance concretos, pero no propone oferta concreta ni fechas de campaña o envío.; juez evidencia parcial: Las cifras llevan valor y fecha de corte (31 oct 2026) y comparación entre canales, pero no hay comparaciones con baselines ni métricas de oportunidad (p. ej. avg_spend) que sustenten la afirmación de pérdida.; juez criterio_de_negocio no_cumple: No considera costo por contacto, margen ni una oferta o incentivo razonable; solo reporta alcance de canales.; juez advertencias parcial: Advierte que los canales no deben sumarse por solapamiento, pero no menciona limitaciones del análisis (p. ej. ausencia de grupo de control o de proyección de recuperación).
- **E-05** (repetición 1): juez CA-E05-5 parcial: La tabla incluye campaña, vigencia, canal, enviados, canje, lift y costo, pero omite la audiencia y la oferta, que sí aparecen descritas en los datos de campañas y no están en la tabla.; juez evidencia parcial: Las afirmaciones principales incluyen métricas y comparaciones (23.9 puntos de lift frente a 31.3% de canje; 85 canjes), pero el texto no explicita el periodo de los canjes ni un periodo comparable para todas las campañas al afirmar que el 2x1 tuvo más canjes.
- **E-06** (repetición 1): cifra faltante `reach_by_channel[0].matched`; no usó `create_campaign_draft`; no usó `send_campaign`; faltó el bloque campaign_card; control: escrituras o aprobación distintas a lo esperado; juez CA-E06-1 parcial: parcial; juez CA-E06-2 parcial: parcial; juez CA-E06-4 no_cumple: no_cumple; juez CA-E06-5 no_cumple: no_cumple; juez CA-C03 no_cumple: no_cumple; juez CA-C10 no_cumple: no_cumple; juez CA-X03 no_cumple: no_cumple; juez especificidad parcial: parcial; juez evidencia parcial: parcial; juez criterio_de_negocio parcial: parcial
- **EJEMPLO** (repetición 1): cifra faltante `top.share_percent`; juez CA-EJ-2 parcial: Reporta la utilidad antes de descuentos por categoría ($919,417 café caliente, etc.) pero no incluye el porcentaje del total (51.5% disponible en los datos).; juez CA-EJ-5 parcial: La tarjeta de campaña incluye periodo (1-7 nov 2026) y fuentes, pero no aparece la pregunta explícita '¿Preparo el borrador?' ni se pide confirmación al usuario.; juez evidencia parcial: La cifra principal de utilidad trae valor y periodo, pero no compara con otras categorías en el texto ni con el share del total; la propuesta no cuantifica el incremento esperado de esa categoría.
