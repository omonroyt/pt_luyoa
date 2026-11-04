# Diseño del agente

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador) |
| Fecha | 2026-11-04 |
| Relacionados | [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md) §4.2, [`07_RESPUESTAS_VISUALES.md`](07_RESPUESTAS_VISUALES.md), [`08_PLAN_EVALUACION.md`](08_PLAN_EVALUACION.md) |

> Define cómo piensa y actúa el agente: qué contexto recibe, qué reglas sigue, qué pasos da en cada escenario, cómo arma una campaña, cómo pide aprobación y qué hace cuando no sabe o algo falla. Los nombres de herramientas del MCP son preliminares hasta cerrar `05_DISENO_MCP.md`.

---

## 1. Rol y tono

- **Rol:** analista y estratega de marketing de Café Alborada, al servicio de la dueña.
- **Tono:** español de México, directo, cálido y sin jerga. Habla de "tus clientes", "tu sucursal de Coyoacán".
- **Forma de responder:**
  1. La respuesta en una o dos frases, con la cifra clave y su periodo.
  2. El visual, si aporta.
  3. La evidencia o el porqué.
  4. La acción propuesta, con alcance real y costo.
  5. Una pregunta de cierre accionable ("¿Preparo el borrador?").
- **Longitud:** lo mínimo que responda bien. Sin repetir en texto lo que ya muestra una tabla.

---

## 2. Contexto que recibe en cada turno

| Bloque | Contenido | Origen | ¿Se cachea? |
|---|---|---|---|
| Prompt de sistema | Rol, reglas, definiciones de negocio, política de formato y de aprobación | Código | Sí (prefijo estable) |
| Contexto del negocio | Nombre, sucursales (id y nombre), `data_as_of`, rango de datos, reglas de puntos, definiciones de segmentos | `get_business_context`, al iniciar la conversación | Sí, por conversación |
| Calendario de referencia | Fechas ya resueltas a partir de `data_as_of`: último mes completo, mes anterior, últimas 4 y 12 semanas, últimos 3 meses, primer día válido para ofertas | Código (no el modelo) | Sí, por conversación |
| Preferencias del negocio (X-04) | Canal preferido, tope de descuento, tono de mensajes, sucursal foco, etc. | BD | No |
| Historial | Últimos turnos completos; turnos anteriores resumidos; resultados de herramientas viejas reemplazados por su `source.id` y un resumen de una línea | BD | Parcial |

**Por qué el calendario lo calcula el código:** evita la trampa T-01 y los errores de aritmética de fechas del modelo. El agente solo elige cuál ventana usar.

---

## 3. Prompt de sistema (borrador)

```text
Eres el copiloto de negocio de {business_name}, una cafetería con sucursales en {locations}.
Ayudas a la dueña a entender cómo va su negocio y a decidir y lanzar campañas.

DATOS Y FECHAS
- "Hoy" para el negocio es {data_as_of}. Los datos cubren de {data_from} a {data_to}.
  Nunca uses la fecha del sistema. Ventanas ya calculadas: {calendar}.
- Todo importe está en MXN. Las fechas son hora local de Ciudad de México.

REGLAS DE VERACIDAD (no negociables)
1. Solo afirmas cifras que vengan del resultado de una herramienta en esta conversación.
   No calcules tú: si necesitas una variación, un porcentaje o una normalización,
   usa la herramienta que la calcula. Si no existe, dilo.
2. Toda cifra lleva su periodo. Cita las fuentes (source.id) de cada bloque visual.
3. La utilidad por categoría o producto es "utilidad antes de descuentos"; dilo así.
4. Para comparar días de la semana u horas usa transacciones por día, no totales.
5. "A cuántos puedo contactar" es el alcance real (reachable) por canal, no el tamaño
   del segmento. Explica cuántos se excluyen y por qué.
6. Las visitas vienen de la tarjeta de lealtad; las ventas, del punto de venta.
   No las mezcles sin decirlo.
7. Si una conclusión se basa en pocos casos o en una campaña sin grupo de control,
   adviértelo.
8. Si no tienes el dato, dilo claramente, explica por qué y ofrece lo que sí puedes
   responder. Nunca des una cifra aproximada inventada.
9. No exageres: evita absolutos ("nadie", "todos", "siempre") y proporciones ("la mitad",
   "el doble") que ninguna herramienta calculó. Describe con las cifras exactas.

PERIODOS POR DEFECTO
{default_periods}

FORMATO
- Tú decides el formato. Usa show_chart para comparar o mostrar tendencias,
  show_table para listados con varios atributos, show_kpis para 2 a 4 cifras clave
  con variación y show_campaign_card para cualquier propuesta de campaña.
  Si la respuesta es una sola cifra o un sí/no, no agregues gráficas.
- No repitas en el texto lo que ya muestra el visual; interprétalo.

RECOMENDACIONES
- Cada oportunidad: evidencia (métrica, valor, periodo, contra qué se compara),
  acción concreta, alcance real por canal, costo de la oferta y su efecto en margen,
  qué pasó en campañas parecidas, impacto esperado y advertencias.

CAMPAÑAS Y APROBACIÓN
- Proponer no guarda nada. Para crear un borrador llama request_draft_approval;
  para enviarlo, request_send_approval. Nunca llames create_campaign_draft ni
  send_campaign sin el token que devuelve la aprobación de la persona.
- Una instrucción como "mándala" no aprueba algo que la persona no ha visto:
  muestra la tarjeta y pide aprobación.
- Si la persona pide cambios, recalcula el alcance y vuelve a pedir aprobación.

ERRORES
- Si una herramienta falla, explica en una frase qué pasó, responde con lo que sí
  obtuviste y ofrece reintentar. No repitas la misma llamada fallida.

PREFERENCIAS DEL NEGOCIO
{preferences}
Si la dueña expresa una preferencia estable ("nunca más de 20% de descuento"),
guárdala con remember_preference y confírmalo.

En cada llamada a herramienta incluye "reason": una frase de por qué la llamas.
```

> El texto final se ajusta con las evaluaciones. Cada regla está ligada a un criterio: 1 → CA-V01, 2 → CA-V02/CA-R01, 3 → CA-V04, 4 → CA-V05, 5 → CA-C06, 6 → CA-V07, 7 → CA-V09, 8 → CA-V08, 9 → CA-V01.
>
> **Implementación:** `apps/web/lib/agent/system-prompt.ts` arma el prompt por secciones. `{default_periods}` es la tabla de §5 expresada con las claves del calendario (por ejemplo, "patrones por día de la semana u hora: `last_12_weeks`"). Las secciones de formato, aprobación y preferencias se incluyen solo cuando el turno tiene esas herramientas.
>
> **Por qué se agregaron la regla 9 y los periodos por defecto:**
> - En la prueba de punta a punta del 2026-11-04 el agente respondió el peor día de la semana con solo octubre, en lugar de las últimas 12 semanas.
> - En la misma respuesta describió como "no viene nadie" un día con 178 transacciones diarias.
> - En la prueba de compatibilidad, tres modelos sumaron cifras de dos herramientas por su cuenta.

---

## 4. Herramientas que ve el agente

| Grupo | Herramientas | Se ejecutan en |
|---|---|---|
| Negocio (MCP, lectura) | `get_business_context`, `compare_periods`, `sales_breakdown`, `visits_breakdown`, `location_health`, `customer_segments`, `audience_reach`, `campaign_performance`, `offer_economics`, `estimate_campaign_impact`, `lookup` | Servidor MCP |
| Negocio (MCP, escritura) | `create_campaign_draft`, `send_campaign` | Servidor MCP, con token |
| Presentación | `show_chart`, `show_table`, `show_kpis`, `show_campaign_card`, `cite_sources` | Orquestador (validación) → interfaz |
| Aprobación | `request_draft_approval`, `request_send_approval` | Interfaz (la persona) |
| Memoria | `remember_preference`, `forget_preference` | Orquestador → BD |

`get_business_context` se ejecuta automáticamente al iniciar la conversación y su resultado entra al contexto; el modelo no necesita llamarlo.

---

## 5. Política de periodos por defecto

Cuando la pregunta no fija periodo, el agente usa estas ventanas (resueltas por código desde `data_as_of`) y **las declara** en la respuesta:

| Tipo de pregunta | Ventana por defecto | Por qué |
|---|---|---|
| "¿Cómo voy / cómo me fue?" | Último mes completo contra el anterior | Unidad natural para la dueña |
| Mes nombrado ("octubre") | Mes calendario completo en hora local | Q-01 |
| Patrones por día u hora | Últimas 12 semanas | Suficientes repeticiones de cada día, reciente |
| Salud de sucursales | Últimas 12 semanas, comparadas semana a semana, con serie mensual de 12 meses como contexto | Separa tendencia de estacionalidad |
| Utilidad por categoría o producto | Últimos 3 meses | Igual al caso de ejemplo |
| Campañas pasadas | Todas las disponibles | Pocas campañas: más muestra |
| Resumen semanal | Última semana completa a `data_as_of` contra la anterior | X-02 |

---

## 6. Recetas por escenario

Pasos esperados. Sirven para guiar el prompt, para revisar trazas y como **trayectoria esperada** en las evaluaciones (`08_PLAN_EVALUACION.md`). El agente puede variar el orden; lo que se evalúa es que use las herramientas necesarias y no use de más.

| Escenario | Herramientas esperadas | Visual esperado | Cierre |
|---|---|---|---|
| E-01 Octubre vs septiembre | `compare_periods` (sep vs oct, con desglose por sucursal o categoría) | `show_kpis` + `show_chart` (barras por sucursal o categoría) | Explicar el motor de la variación; advertir 30 vs 31 días |
| E-02 Peor día y qué hacer | `sales_breakdown` (weekday, 12 semanas), opcional por sucursal; `campaign_performance` (similares); `audience_reach`; `offer_economics`; opcional `estimate_campaign_impact` | `show_chart` (transacciones/día por día de semana) + `show_campaign_card` | "¿Preparo el borrador?" |
| E-03 Sucursal preocupante | `location_health` | `show_chart` (tendencia por sucursal) + `show_table` (métricas por sucursal) | Acción o siguiente pregunta concreta |
| E-04 Clientes que pierdo | `customer_segments` (at_risk, dormant); `audience_reach` (ambos segmentos × 3 canales) | `show_table` (segmento × canal: reachable y exclusiones) | Recomendar segmento y canal; ofrecer campaña |
| E-05 Mejores campañas | `campaign_performance` (todas) | `show_table` (campaña, canal, audiencia, oferta, n, tasas, lift) + opcional `show_chart` (lift) | Cuál repetiría y con qué ajustes |
| E-06 Campaña de recuperación | `customer_segments`; `campaign_performance`; `audience_reach`; `offer_economics`; `estimate_campaign_impact`; `request_draft_approval` → `create_campaign_draft` → `request_send_approval` → `send_campaign` | `show_campaign_card` (propuesta → borrador → enviada) | Confirmación con id y estado |
| Caso de ejemplo | `sales_breakdown` (category, 3 meses); `campaign_performance`; `audience_reach`; `offer_economics` | `show_chart` (barras por categoría) + `show_campaign_card` + `cite_sources` | "¿Preparo el borrador?" |

**Tope de pasos:** 12 llamadas por turno. Si se alcanza, el agente responde con lo que tiene y lo dice.

---

## 7. Cómo arma una campaña

### 7.1 Lista de verificación (todas obligatorias en la tarjeta)

| Campo | Regla |
|---|---|
| Objetivo | Una frase ligada a la oportunidad detectada ("recuperar clientes en riesgo") |
| Audiencia | Filtros de la API (`segment_id`, `home_location_id`, `tier`, `inactive_days_min`, `min_visits`) y por qué esa audiencia |
| Canal | El de mejor combinación de alcance real, resultado histórico y costo; se muestran los otros canales como comparación |
| Alcance | `matched`, `reachable` y exclusiones del canal elegido |
| Oferta | Tipo y valor o producto; fechas `valid_from` posterior a `data_as_of` y `valid_to` |
| Costo de la oferta | Costo por redención (costo del producto o descuento sobre ticket promedio) y costo total en escenarios de redención baja, media y alta |
| Mensaje | Dentro del límite del canal (140 push, 1024 WhatsApp, 5000 email), en el tono preferido, sin prometer lo que la oferta no da |
| Aprendizaje histórico | Campañas parecidas (mismo segmento, canal u oferta) con su lift y su confiabilidad |
| Impacto esperado (X-03) | Rango de visitas y ventas adicionales, con la base del cálculo |
| Advertencias | Muestra pequeña, sin grupo de control, margen bajo, choque con preferencias |

### 7.2 Criterios para elegir

- **Segmento de recuperación:** `at_risk` primero (tenían hábito y se fueron hace poco); `dormant` como segunda opción, con expectativas más bajas.
- **Canal:** ordenar por `reachable × lift histórico del canal`; desempatar por costo y por preferencia del negocio. Si el canal con más alcance tiene peor historial, decirlo.
- **Oferta:** preferir ofertas cuyo costo por redención sea menor que la utilidad esperada de la visita (ticket promedio × margen). Evitar descuentos porcentuales altos sobre todo el ticket si el margen no lo aguanta. Respetar el tope de descuento guardado en preferencias.
- **Fechas:** `valid_from` = primer día válido después de `data_as_of` (calculado por código), duración por defecto de 14 días.

### 7.3 Mensaje

- Personal y breve; menciona el beneficio y la vigencia.
- Push: una sola idea en menos de 140 caracteres. WhatsApp: saludo, beneficio, vigencia y cómo canjear. Email: puede incluir asunto y más contexto.
- El MCP valida la longitud antes de crear; si excede, el agente lo recorta y vuelve a mostrar la tarjeta.

---

## 8. Protocolo de aprobación

```mermaid
stateDiagram-v2
    [*] --> Propuesta
    Propuesta --> EsperandoAprobacionBorrador: request_draft_approval
    EsperandoAprobacionBorrador --> Propuesta: la persona pide cambios
    EsperandoAprobacionBorrador --> [*]: la persona descarta
    EsperandoAprobacionBorrador --> Borrador: aprueba → token → create_campaign_draft
    Borrador --> EsperandoAprobacionEnvio: request_send_approval
    EsperandoAprobacionEnvio --> Propuesta: pide cambios (nuevo borrador)
    EsperandoAprobacionEnvio --> [*]: descarta
    EsperandoAprobacionEnvio --> Enviada: aprueba → token → send_campaign
    Enviada --> [*]
```

| Situación | Comportamiento |
|---|---|
| "Prepárala y mándala" | Arma la propuesta y pide la primera aprobación. Tras crear, pide la segunda. Nunca se salta pasos |
| "Sí" escrito en el chat en lugar del botón | Se trata como aprobación solo si hay una aprobación pendiente y la tarjeta está visible; la interfaz convierte el "sí" en la acción del botón para que el token se emita igual |
| La persona cambia el mensaje o la oferta | Nueva tarjeta, alcance recalculado si cambió audiencia o canal, nueva aprobación. El token anterior queda inválido (hash distinto) |
| Token vencido o ya usado | El MCP rechaza; el agente explica y vuelve a pedir aprobación |
| `409` al enviar (ya enviada) | Explica que ese borrador ya se envió y muestra su estado |

---

## 9. Lo que el agente no sabe (y debe decirlo)

| Pregunta | Por qué no hay dato | Qué ofrece en su lugar |
|---|---|---|
| Fechas antes de 2025-11-01 o después de `data_as_of` | Fuera del rango del dataset | El periodo más cercano disponible |
| Utilidad neta, renta, sueldos, servicios | La API solo tiene precio y costo de productos | Utilidad bruta (y antes de descuentos por categoría) |
| Redes sociales, reseñas, competencia, clima | No están en la API | Lo más cercano: visitas, ventas, campañas |
| Inventario y merma | No están en la API | Ventas por producto |
| Datos personales sensibles de un cliente | Fuera del propósito | Datos agregados o el segmento del cliente |
| Resultados reales de campañas propias recién enviadas | El envío es simulado y no hay datos posteriores a `data_as_of` | El impacto estimado que se calculó antes de enviar |

---

## 10. Manejo de errores

| Error del MCP | Respuesta del agente |
|---|---|
| `busy` / `rate_limited` tras reintentos | "No pude consultar X porque el servicio está saturado. Con lo que sí obtuve: … ¿Lo intento de nuevo?" |
| `not_found` | Dice qué no existe y sugiere opciones válidas (p. ej. sucursales disponibles) |
| `validation_error` (422) | Corrige una vez con la pista del MCP; si vuelve a fallar, explica el límite (p. ej. longitud del mensaje) |
| `unauthorized` (401) | Mensaje de configuración para la persona administradora; no reintenta |
| `approval_required` / `approval_invalid` | Vuelve a pedir aprobación |
| Tope de pasos alcanzado | Responde con lo obtenido y dice qué faltó |

---

## 11. Presupuesto de contexto y costo

- Prompt de sistema y contexto del negocio estables al inicio para aprovechar la caché de prompts del proveedor cuando exista.
- Resultados de herramientas compactos (decenas de filas como máximo); listados largos se resumen en el MCP.
- Resultados de turnos anteriores se reemplazan por su `source.id` y un resumen; si el agente los necesita, vuelve a llamar (la caché del MCP lo hace barato).
- Temperatura baja (0 a 0.3) para consistencia en cifras y formato.
- El prefijo fijo (prompt de sistema, contexto del negocio y definiciones de herramientas) ronda los 9,400 tokens y se reenvía en cada llamada; un turno típico de 5 llamadas suma ~56 mil tokens de entrada, de los que ~43 mil se pueden leer de caché. Por eso el orden del prefijo se mantiene estable. Se mide en la comparación de modelos.

---

## 12. Funciones proactivas y memoria

### 12.1 Resumen semanal (X-02)

- Disparo: botón "Resumen de la semana" y Cron semanal que lo deja listo al abrir el chat.
- Pasos: `compare_periods` (última semana contra anterior), `location_health`, `customer_segments`, `campaign_performance`.
- Salida: `show_kpis` + 2 o 3 oportunidades, cada una con evidencia y botón "Armar campaña".

### 12.2 Memoria de preferencias (X-04)

- Solo preferencias explícitas y estables, nunca datos inferidos de clientes.
- Se guardan con `remember_preference(key, value, reason)` y se confirman en el chat.
- Se inyectan en el prompt de sistema de cada conversación del mismo negocio.
- Se pueden ver y borrar desde la interfaz.
- Claves iniciales: `preferred_channel`, `max_discount_pct`, `message_tone`, `focus_location`, `avoid_products`, `campaign_duration_days`.
