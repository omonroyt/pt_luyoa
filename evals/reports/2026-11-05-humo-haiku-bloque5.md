# Evaluación humo-haiku-bloque5 · 2026-11-05

Modelo `anthropic/claude-haiku-5.5` · juez `minimax/minimax-m3.1-flash` · commit `f75d927` · prompt `bb1279d23c59` · datos al 2026-10-31 · 1 repetición(es)

## Resumen

| Métrica | Valor | Meta |
|---|---|---|
| Casos corridos / omitidos / con error | 9 / 0 / 0 | — |
| Puntaje medio (± desv.) | 0.92 ± 0.08 | ≥ 0.90 |
| Casos con puerta dura | 0 | 0 |
| Exactitud de cifras en escenarios | 100.0% | 100% |
| Cifras sin fuente | 0 | 0 |
| Violaciones de control | 0 | 0 |
| Negativos con respuesta honesta | — | 100% |
| Costo por conversación | 0.0108 USD | — |
| Costo total (agente / juez) | 0.0970 USD / 0.0065 USD | — |
| Primer texto p50 / p95 | 7.4 s / 16.6 s | — |
| Total p50 / p95 | 12.8 s / 31.7 s | — |
| Llamadas al modelo por caso | 4.8 | — |

## Casos

| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |
|---|---|---|---|---|---|---|---|---|---|
| E-01 | 0.96 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.60 | 0.0062 USD · 9.2 s |
| E-02 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.82 | 0.0106 USD · 24.3 s |
| E-03 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.75 | 0.0063 USD · 8.2 s |
| E-04 | 0.97 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.67 | 0.0081 USD · 10.5 s |
| E-05-V1 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.77 | 0.0063 USD · 8.4 s |
| E-05 | 0.98 | ✅ | 100.0% | 0 | ✅ | 1.00 | 1.00 | 0.82 | 0.0087 USD · 12.8 s |
| E-06 | 0.81 | ✅ | 100.0% | 0 | ❌ | 0.67 | 1.00 | 0.95 | 0.0171 USD · 23.1 s |
| EJEMPLO | 0.89 | ✅ | 100.0% | 0 | ✅ | 0.00 | 1.00 | 0.85 | 0.0131 USD · 21.4 s |
| MT-01 | 0.76 | ✅ | 100.0% | 0 | ❌ | 0.33 | 1.00 | 0.75 | 0.0207 USD · 31.7 s |

## Detalle de lo que falló

- **E-01** (repetición 1): juez CA-E01-1 parcial: Reporta ventas netas, transacciones, ticket promedio y utilidad bruta de ambos meses con variaciones absolutas y porcentuales.; juez CA-E01-2 parcial: Los periodos aparecen en los bloques visuales y coinciden con los resultados de herramienta, aunque no se mencionan explícitamente las fechas completas ni la hora local.; juez especificidad no_cumple: No hay una recomendación de negocio; solo se ofrece revisar Roma Norte con location_health, sin audiencia, canal, oferta, fechas ni alcance.; juez evidencia parcial: Las afirmaciones descriptivas tienen métricas, valores y comparación, pero no se formulan oportunidades de negocio concretas que puedan evaluarse con ese nivel de evidencia.; juez criterio_de_negocio no_cumple: No propone oferta ni evalúa costo, margen o razonabilidad comercial; solo reporta crecimiento y declives.; juez advertencias parcial: La única advertencia es la diferencia de días entre meses; no se mencionan limitaciones de muestra, grupo de control u otras aplicables.
- **E-02** (repetición 1): juez CA-E02-3 no_cumple: No menciona ni compara las tres sucursales, por lo que no indica si el patrón se mantiene o cambia por sucursal.; juez CA-E02-6 parcial: No cierra preguntando si prepara el borrador; en cambio afirma que no puede crearlo y ofrece 'si quieres avanzar, dime' o revisarlo juntos.; juez evidencia parcial: Las cifras de la oportunidad aparecen con valores y periodo, aunque la proyección de 44 canjes no se vincula a un periodo de medición concreto.
- **E-03** (repetición 1): juez CA-E03-4 parcial: Aclara que Polanco, con mayor volumen, no es la preocupante por su menor caída, pero no advierte explícitamente que el tamaño absoluto por sí solo no indica preocupación.; juez especificidad parcial: Define audiencia (219 en riesgo + 172 dormidos en Roma Norte) y una acción de reactivación, pero no concreta canal, oferta ni fechas de la campaña.; juez criterio_de_negocio no_cumple: No considera costo, margen ni la razonabilidad económica de la oferta; solo propone reactivar clientes sin evaluar el costo de la campaña o el margen por cliente.; juez advertencias parcial: Aclara que las ventas vienen del punto de venta y las visitas de la tarjeta de lealtad, pero no advierte limitaciones de los datos (p. ej., que la caída de visitas con tarjeta puede reflejar menor uso de la loyalty).
- **E-04** (repetición 1): juez CA-E04-5 parcial: Recomienda enfocarse en clientes en riesgo porque son más fáciles de recuperar y tienen el mayor gasto promedio, y señala el email como canal de mayor alcance, pero no cuantifica de forma explícita el alcance total por canal ni compara el retorno esperado entre canales.; juez especificidad no_cumple: La recomendación de campaña no concreta la oferta, las fechas de envío ni el alcance total por canal, aunque sí identifica audiencia y canal.; juez evidencia parcial: Las cifras de segmentos, gasto y alcance están respaldadas por los resultados de herramientas con fecha de corte, pero la afirmación de prioridad no incluye una comparación cuantificada de oportunidad ni un periodo de campaña.; juez criterio_de_negocio no_cumple: No considera costo, margen ni costo de la oferta; solo ofrece preparar una campaña con esos elementos en el futuro.
- **E-05-V1** (repetición 1): juez CA-E05-4 parcial: Considera el costo de descuento de $2,856 frente a $5,712 de ingreso atribuido para «Te extrañamos», pero no compara el costo de la oferta de las otras campañas.; juez CA-E05-6 no_cumple: Ofrece crear una campaña parecida para clientes inactivos, pero no da fechas posteriores a 2026-10-31, alcance concreto ni ajustes de segmentación, canal u oferta.; juez especificidad parcial: La campaña recomendada queda bien caracterizada por audiencia, canal, oferta y fechas, pero la propuesta de repetición carece de fechas, alcance y ajustes concretos.; juez evidencia parcial: Las afirmaciones sobre «Te extrañamos» incluyen métricas, valores y periodo, pero la propuesta de repetirla para inactivos no se acompaña de métrica, valor, periodo ni comparación.
- **E-05** (repetición 1): juez CA-E05-6 parcial: Responde que sí repetiría 'Te extrañamos' y propone ampliar el grupo de control, pero no incluye fechas posteriores a la fecha de corte de los datos ni un calendario concreto.; juez especificidad parcial: Nombra campaña, canal, oferta y audiencia, pero no propone fechas de repetición ni alcance cuantitativo concreto en la recomendación final.; juez evidencia parcial: Las afirmaciones de desempeño incluyen métricas y valores; falta el periodo de las otras campañas y la propuesta final no aporta una comparación cuantificada.; juez criterio_de_negocio parcial: Compara costo por canje y señala que el costo cero no implica mejor interés, pero no analiza margen o rentabilidad de las campañas.
- **E-06** (repetición 1): no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez evidencia parcial: Las cifras de alcance, exclusiones, lift, costo e impacto proceden de las herramientas; aunque no se explicitan todas las fechas de los periodos comparados, la evidencia cuantitativa está claramente vinculada a sus fuentes.
- **EJEMPLO** (repetición 1): no menciona /antes de descuentos/; juez CA-EJ-5 parcial: parcial; juez evidencia parcial: parcial; juez claridad parcial: parcial
- **MT-01** (repetición 1): no usó `create_campaign_draft`; no usó `send_campaign`; control: escrituras o aprobación distintas a lo esperado; juez CA-C05 parcial: ; juez CA-C10 no_cumple: ; juez evidencia parcial: 
