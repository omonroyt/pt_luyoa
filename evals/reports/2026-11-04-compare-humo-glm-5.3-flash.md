# Evaluación compare-humo-glm-5.3-flash · 2026-11-04

Modelo `z-ai/glm-5.3-flash` · juez `minimax/minimax-m3.1-flash` · commit `08a6792+cambios` · prompt `932c93c24281` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 7 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.94 ± 0.06 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 97.2% | 100% |
| Cifras sin fuente | 1 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0065 USD | — |
| Costo total (agente / juez) | 0.0452 USD / 0.0053 USD | — |
| Primer texto p50 / p95 | 11.9 s / 34.2 s | — |
| Total p50 / p95 | 41.4 s / 163.1 s | — |
| Llamadas al modelo por caso | 7.4 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-01 | 0.92 | ✅ | 83.3% | 0 | ✅ | 1.00 | 1.00 | 0.86 | 0.0035 USD · 33.6 s |
| E-02 | 0.96 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.64 | 0.0131 USD · 132.2 s |
| E-03 | 0.97 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.65 | 0.0032 USD · 41.4 s |
| E-04 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.83 | 0.0026 USD · 37.8 s |
| E-05 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.77 | 0.0023 USD · 36.9 s |
| E-06 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.83 | 0.0102 USD · 109.7 s |
| EJEMPLO | 0.79 | ✅ | 100.0% | 1 | ✅ | 1.00 | 0.50 | 0.90 | 0.0103 USD · 163.1 s |

## Detalle de lo que falló

- **E-01** (repetición 1): cifra faltante `previous.net_sales`; juez CA-E01-1 parcial: Reporta las variaciones de ventas netas, tickets y ticket promedio, pero no da los valores absolutos de septiembre ni la variación absoluta y porcentual de la utilidad bruta.; juez advertencias parcial: Advierte correctamente el efecto de los días distintos, pero no menciona limitaciones de los datos, como que las visitas solo cuentan clientes con tarjeta de lealtad escaneada.
- **E-02** (repetición 1): juez CA-E02-3 no_cumple: Afirma que el problema es de tráfico sin comparar el patrón entre sucursales, pese a que la evidencia incluye un desglose por sede.; juez CA-E02-5 parcial: Considera el costo por canje de $11, el margen de $55.54 y el canje del 39.9% de la campaña piloto, aunque omite la tasa de la campaña similar Te extrañamos y sus limitaciones.; juez CA-E02-6 no_cumple: No cierra preguntando si se prepara el borrador, aunque no crea ningún borrador ni envía la campaña.; juez especificidad parcial: Define audiencia, canal, oferta y alcance, pero no especifica fechas concretas de envío o vigencia de la promoción.; juez evidencia parcial: Las cifras principales del problema están respaldadas por el periodo y la comparación, pero la afirmación sobre elticket promedio similar al resto y el alcance de WhatsApp no se compara con un benchmark explícito.; juez advertencias parcial: Reconoce que el piloto de febrero no tuvo grupo de control, pero no menciona la muestra pequeña de 67 del grupo de control de Te extrañamos ni la fiabilidad media de esa campaña similar.
- **E-03** (repetición 1): juez CA-E03-4 parcial: Aclara que Polanco, aunque tiene las ventas más altas y la menor caída (-4.6%), "es la que mejor aguanta", mostrando que el tamaño no determina la preocupación; sin embargo, no lo formula de forma explícita.; juez especificidad parcial: Define audiencia (219 en riesgo y 172 dormidos con origen en Roma Norte), pero deja el canal, la oferta, el alcance total y las fechas de la campaña pendientes de calcular, sin concretarlos.; juez evidencia parcial: Las afirmaciones principales incluyen métrica, valor y comparación de periodo (Roma Norte -31% en $558,080, Coyoacán -16.5%, Polanco -4.6%, visitas -38.4% y -23.2%), pero la tendencia mensual de octubre ($182,498) y los conteos de clientes en riesgo y dormidos se presentan sin su periodo o comparación correspondiente.; juez criterio_de_negocio no_cumple: No considera costo, margen ni la razonabilidad de una oferta concreta; solo propone una campaña de recuperación sin evaluar su rentabilidad.; juez advertencias no_cumple: No menciona limitaciones de los datos, muestra pequeña o ausencia de grupo de control, aunque los datos cubren periodos de 12 semanas y no requieren esos descargos; no se incluye ninguna advertencia metodológica.
- **E-04** (repetición 1): juez especificidad parcial: Nombra audiencia y canal concretos, pero no propone oferta ni fechas específicas de campaña, por lo que la propuesta queda incompleta.; juez evidencia parcial: Las cifras de segmentos, gasto y alcance llevan fecha de corte (31 oct 2026) y comparaciones entre segmentos y canales, pero no se indica explícitamente el periodo de los datos de clientes más allá del corte.; juez criterio_de_negocio parcial: Compara valor por cliente y alcance alcanzable, pero no estima costo, margen ni ROI de la campaña y la oferta solo se plantea como siguiente paso.
- **E-05** (repetición 1): juez CA-E05-5 parcial: La tabla incluye campaña, canal, oferta, canje, lift y costo por canje, pero omite audiencia, tamaño de muestra y tasas de visita, por lo que no cumple todos los campos solicitados.; juez CA-E05-6 parcial: Responde que repetiría 'Te extrañamos' y propone November con alcance real y costo estimado, además de sugerir control para el 2x1, aunque el texto mostrado no concreta el alcance ni el costo y no explicita la fecha del segundo ajuste.; juez especificidad parcial: Nombra la campaña, canal (WhatsApp), audiencia implícita ('clientes con 4+ visitas y 21+ días sin venir', presente en los datos pero no citada en el texto), oferta de concha gratis y mes de noviembre, pero no detailing alcance concreto ni fecha exacta.; juez evidencia parcial: Las afirmaciones principales Accompañan métricas y valores, pero el texto no incluye el periodo de cada campaña ni una comparación completa contra un benchmark, y el 77.2% de apertura se cita sin periodo.; juez criterio_de_negocio parcial: Contrasta el costo por canje con el margen, cuestiona el 2x1 por su costo de $65.25 y presenta 'Te extrañamos' como opción de costo acotado, aunque no calcula el margen neto de ninguna campaña.
- **E-06** (repetición 1): juez CA-E06-4 parcial: Se creó el borrador (cmp_eval_001) y aparece en los resultados de herramientas, pero la respuesta no muestra explícitamente el id del borrador ante el usuario.; juez CA-C03 parcial: El envío ocurre tras aprobación y la tarjeta incluye audiencia, canal, oferta, mensaje y alcance real, pero no consta una segunda aprobación explícita antes del envío.; juez CA-C10 parcial: Confirma el estado `sent` y la audiencia fijada (483 en riesgo, 267 alcanzables), pero no muestra el id de la campaña enviada.; juez evidencia parcial: Las cifras clave tienen valor y periodo (cmp_0004, junio 2026, +23.9 pts vs control), pero la proyección de noviembre no lleva periodo de comparación explícito más allá de la base histórica.
- **EJEMPLO** (repetición 1): cifra sin fuente 60; faltó el bloque campaign_card; juez CA-EJ-5 parcial: No muestra la tarjeta visual de campaña ni formula una pregunta formal de aprobación ('¿Preparo el borrador?'), aunque sí cita fuentes con periodo y pide al usuario que diga 'prepara la campaña' para generarla en el siguiente turno.; juez claridad parcial: Abre con la respuesta directa y el desglose es legible, pero intercala relleno meta ('Reviso alcance y experiencias pasadas', 'Última verificación pendiente: tu consulta llegó al límite de pasos') que rompe la fluidez.
