# Contexto: prueba técnica AI Engineer en Luyoa

> Fuente única de verdad sobre **qué se pide**. Todo documento posterior (PRD, criterios de aceptación, arquitectura) debe poder rastrearse hasta un ID de este archivo (`R-xx`, `B-xx`, `X-xx`, `E-xx`).
>
> - Recibido: 2026-11-04
> - Plazo: 7 días (entrega a más tardar **2026-11-11**)
> - Esfuerzo estimado por Luyoa: 8 a 12 horas
> - Meta propia: cumplir **todo** lo requerido, **todos** los bonus y **todos** los extras, sin sacrificar confiabilidad.

---

## 1. El reto

**Café Alborada** es una cafetería con **tres sucursales** en la Ciudad de México. Tiene programa de lealtad (tarjetas) y punto de venta (POS). Su dueña no tiene tiempo ni equipo para analizar los datos.

Hay que construir un **copiloto** al que ella pueda:

- Preguntarle cómo va su negocio.
- Pedirle ayuda para decidir y lanzar campañas.

El copiloto debe:

- Responder con **datos reales** (de la API).
- Mostrar **gráficas y otros elementos visuales** cuando ayuden.
- Proponer **acciones concretas**.

Tono esperado (ejemplo del enunciado):

> Esta franja de la semana tiene poco tráfico. Te recomiendo una promoción para moverla. Con esta audiencia llegarías a tantas personas, y esto fue lo que funcionó en campañas parecidas. ¿Preparo el borrador?

---

## 2. Qué recibimos

| Recurso | Detalle |
|---|---|
| API de datos dummy | `https://prueba-developer.luyoa.dev` con 12 meses de datos. Documentación en `/docs`, esquema en `/openapi.json`. Se entra con el correo registrado. |
| Llave `X-API-Key` | Se genera en esa página. Se muestra una sola vez; generar otra invalida la anterior. **Secreto: no va al repositorio.** |
| Llave de OpenRouter | Con límite de gasto, en la misma página. **Secreto: no va al repositorio.** |

> **Nota:** la llave que venía en el artefacto compartido es **ilustrativa/falsa**. No se usa. Las llaves reales se obtienen después desde el portal y viven solo en un `.env` local ignorado por git.

---

## 3. Qué se debe construir

### 3.1 Servidor MCP
- Envuelve la API de Café Alborada.
- **No** es una copia 1:1 de los endpoints. Las herramientas se diseñan para lo que un agente necesita para trabajar bien (nivel de abstracción a nuestra elección).
- Debe manejar bien los errores (401, 404, 409, 422, 429, 503).

### 3.2 Agente
Usa el MCP para interactuar con los datos. Debe poder:
1. Responder preguntas sobre **ventas, visitas, clientes, productos y sucursales**.
2. **Encontrar oportunidades** y explicar la evidencia detrás de cada una.
3. **Proponer campañas** con audiencia, canal, oferta, mensaje y **alcance real**.
4. **Crear un borrador** y **enviarlo solo después** de que la persona lo apruebe.

### 3.3 Interfaz de chat con respuestas visuales
- El agente puede responder con **gráficas, tablas, tarjetas de campaña y referencias** a los datos que usó.
- El **agente decide** qué formato conviene en cada respuesta.

### 3.4 Elección de modelo
- Usar **OpenRouter** para elegir uno o varios modelos.
- Explicar por qué se eligieron y **qué alternativas se probaron**, con base en **calidad, costo y latencia**.

---

## 4. Escenarios de prueba (se graban en la demo)

| ID | Pregunta de la dueña |
|---|---|
| E-01 | "¿Cómo me fue en octubre comparado con septiembre?" |
| E-02 | "¿Cuál es mi peor día de la semana y qué harías al respecto?" |
| E-03 | "¿Qué sucursal me debería preocupar?" |
| E-04 | "¿Qué clientes estoy perdiendo y a cuántos puedo contactar?" |
| E-05 | "¿Qué campañas me han funcionado mejor? ¿Repetirías alguna?" |
| E-06 | "Prepara una campaña para recuperar clientes y mándala." |

### Caso de ejemplo (nivel esperado; no es escenario de prueba)

**Pregunta:** "¿Qué categoría de productos me deja más utilidad y cómo la empujo?"

**Pasos del agente:**
1. Consulta la fecha de corte (`data_as_of`) para saber qué periodo analizar.
2. Obtiene ventas y utilidad por categoría.
3. Calcula el alcance real de una audiencia en el canal que propone.
4. Revisa campañas pasadas parecidas.

**Respuesta esperada (valores ilustrativos):**
> En los últimos 3 meses, [categoría] te dejó $[X] de utilidad antes de descuentos, [Y]% del total.
> [Gráfica de barras: utilidad por categoría]
> Te propongo una campaña por [canal] para el segmento [segmento], con [oferta]. Puedes contactar a [N] de sus [M] clientes. Los demás no tienen consentimiento o no se pueden contactar.
> [Tarjeta de campaña: audiencia, canal, oferta y mensaje]
> Fuente: ventas por categoría del [fecha] al [fecha]. ¿Preparo el borrador?

**Criterios del caso (aplican a todas las respuestas):**

| Criterio | Bien resuelto |
|---|---|
| Cifras | Coinciden con la API y se indica el periodo |
| Precisión | Aclara que la utilidad es **antes de descuentos** |
| Formato | Usa gráfica porque compara categorías |
| Alcance | Reporta **quién se puede contactar** (`reachable`), no el tamaño del segmento |
| Evidencia | Se ve de qué datos sale cada cifra |
| Control | No crea ni envía nada hasta que la dueña aprueba |

---

## 5. Entregables

| ID | Entregable |
|---|---|
| D-01 | Repositorio con el código y un **README** para correr todo en pocos pasos |
| D-02 | **Demo en video** de hasta **5 minutos** con los seis escenarios |
| D-03 | **Documento breve** con: decisiones de arquitectura, elección de modelo, **costo aproximado por conversación** y qué haríamos con más tiempo |

Stack y frameworks libres; se permite usar IA para programar. **En la entrevista pedirán explicar y modificar lo construido**, así que todo debe entenderse a fondo.

---

## 6. Cómo evalúan

### 6.1 Requerido (si falta uno, no pasa)

| ID | Requisito |
|---|---|
| R-01 | El servidor MCP funciona contra la API y sus herramientas están diseñadas para un agente |
| R-02 | El agente resuelve los seis escenarios con cifras correctas que vienen de los datos |
| R-03 | El agente reconoce lo que no sabe y **no inventa cifras** |
| R-04 | Recomendaciones específicas, con evidencia y **alcance real por canal** |
| R-05 | La interfaz muestra **al menos gráficas y tablas**, y el agente elige el formato |
| R-06 | Una campaña se envía solo después de que la persona ve **audiencia, oferta y mensaje**, y la **aprueba** |
| R-07 | Se explica qué modelo se eligió y por qué |
| R-08 | Se entregan repositorio, README, demo y documento de decisiones |
| R-09 | **Ninguna llave aparece en el repositorio** (ni en el historial de git) |

### 6.2 Bonus (suben puntaje)

| ID | Bonus |
|---|---|
| B-01 | Evaluaciones automáticas de la calidad del agente |
| B-02 | Comparación **medida** de modelos en calidad, costo y latencia |
| B-03 | Trazas para ver qué herramientas usó el agente y por qué |
| B-04 | Respuestas que consideran **margen y costo de la oferta**, y advierten límites como **muestras pequeñas** |
| B-05 | Aprendizajes de campañas pasadas aplicados a las recomendaciones |
| B-06 | Referencias que permiten verificar cada cifra |
| B-07 | Recuperación clara cuando falla una herramienta |

### 6.3 Extras (diferenciadores; nunca a costa de lo requerido)

| ID | Extra |
|---|---|
| X-01 | Demo publicada que se pueda abrir sin instalar nada |
| X-02 | Resumen semanal proactivo con oportunidades |
| X-03 | Estimación del impacto esperado de una campaña antes de enviarla |
| X-04 | Memoria de preferencias del negocio entre conversaciones |
| X-05 | Diseño para varios negocios con datos y permisos separados |

### 6.4 Puntaje

| Área | Peso | Qué buscan |
|---|---|---|
| Veracidad | **30** | Cifras correctas, vienen de los datos, el agente reconoce lo que no sabe |
| Criterio de negocio | 20 | Recomendaciones específicas, con evidencia, considerando su costo |
| Diseño del MCP | 15 | Herramientas claras, útiles para un agente, buen manejo de errores |
| Agente | 15 | Elige bien sus pasos, usa poco contexto, pide aprobación antes de actuar |
| Experiencia | 10 | Las respuestas visuales aportan y la interfaz se entiende |
| Ingeniería | 10 | Código claro y alguna forma de evaluar la calidad del agente |

> **Principio rector de Luyoa:** "Valoramos más una solución pequeña y confiable que una grande y frágil." Si hay que recortar alcance, se recorta y se explica qué quedó fuera y por qué.

---

## 7. Referencia de la API de Café Alborada

### 7.1 Reglas generales

| Tema | Regla |
|---|---|
| Autenticación | Header `X-API-Key` |
| Rango de datos | 2025-11-01 a 2026-10-31 |
| "Hoy" del dataset | `data_as_of` de `GET /v1/business`. Métricas relativas (`visits_60d`, etc.) se calculan contra esa fecha, **no** contra el reloj del sistema |
| Zona horaria | Timestamps en **UTC**; el negocio opera en **America/Mexico_City (UTC-6)**. Los filtros `from`/`to` y los endpoints de analytics usan **hora local** |
| Moneda | MXN |
| Paginación | `limit` (máx. 100) y `offset`. Respuesta: `{ data: [], pagination: { total, limit, offset, has_more } }` |
| Errores | Formato `{ "error": { "code", "message" } }`. Códigos 401, 404, 409, 422, 429, 503 |
| Rate limit | 120 solicitudes/min por llave. `429 rate_limited` y `503 busy` → reintentar tras `Retry-After` segundos |

### 7.2 Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/v1/business` | Datos del negocio, reglas de puntos, fecha de corte |
| GET | `/v1/locations` | Sucursales |
| GET | `/v1/products` | Catálogo con precio y costo |
| GET | `/v1/customers` | Clientes con tarjeta, con filtros |
| GET | `/v1/customers/{id}` | Detalle de un cliente |
| GET | `/v1/visits` | Visitas registradas con la tarjeta |
| GET | `/v1/transactions` | Tickets del POS |
| GET | `/v1/transactions/{id}` | Ticket con sus productos |
| GET | `/v1/analytics/sales` | Ventas agregadas |
| GET | `/v1/analytics/visits` | Visitas agregadas |
| GET | `/v1/segments` | Segmentos y su tamaño |
| GET | `/v1/campaigns` | Campañas históricas y propias |
| GET | `/v1/campaigns/{id}` | Campaña y sus resultados |
| POST | `/v1/campaigns/preview` | Alcance real de una audiencia (no guarda nada) |
| POST | `/v1/campaigns` | Crear campaña en borrador (no contacta a nadie) |
| POST | `/v1/campaigns/{id}/send` | Enviar un borrador (simulado) |

### 7.3 Conceptos del modelo de datos

- **Tarjeta vs. POS:** `/v1/visits` viene del programa de lealtad; `/v1/transactions` del punto de venta. Son fuentes distintas.
  - Ticket con `customer_id` nulo = venta **sin tarjeta**.
  - Visita con `transaction_id` nulo = el cliente escaneó y **no compró**.
  - Ticket con `status: refunded` conserva su importe original. **Los endpoints de analytics ya lo excluyen.**
- **Puntos:** 1 punto por cada $10 MXN pagados. 150 puntos = bebida gratis de hasta $68 MXN.
- **Segmentos** (calculados a la fecha de corte):

| Segmento | Regla |
|---|---|
| `new` | Se inscribió en los últimos 45 días |
| `dormant` | Más de 90 días sin venir, o sin visitas |
| `at_risk` | 10 o más visitas y entre 30 y 90 días sin venir |
| `champions` | 8 o más visitas en los últimos 60 días |
| `regulars` | 3 a 7 visitas en los últimos 60 días |
| `occasional` | El resto |

### 7.4 Analytics

`GET /v1/analytics/sales` acepta `group_by`, `from`, `to`, `location_id`, `customer_type`.

- `group_by`: `day`, `week`, `month`, `weekday`, `hour`, `location`, `category`, `product`.
- Campos típicos: `key`, `label`, `transactions`, `net_sales`, `avg_ticket`, `discounts`, `gross_profit`, `member_share`, `active_days`, `transactions_per_day`.
- Con `weekday` y `hour` → comparar **`transactions_per_day`** (cada día de la semana aparece un número distinto de veces en el rango).
- Con `category` y `product` → la respuesta trae `units`, `gross_sales` y **`gross_profit_before_discounts`** (los descuentos se aplican al ticket completo, no a la línea).

`GET /v1/analytics/visits` funciona igual, **sin** `category`, `product` ni `customer_type`. Solo cuenta visitas con tarjeta.

### 7.5 Campañas

Flujo: **calcular alcance → crear borrador → enviar**.

1. **Preview** (`POST /v1/campaigns/preview`): `{ channel, audience }` → `matched`, `excluded_suspended`, `excluded_no_consent`, `excluded_duplicates`, **`reachable`**. `reachable` ya descuenta tarjetas suspendidas, sin consentimiento en ese canal y duplicadas.
2. **Borrador** (`POST /v1/campaigns`): `name`, `objective`, `channel`, `audience`, `offer`, `message`.
3. **Enviar** (`POST /v1/campaigns/{id}/send`): pasa a `sent`, fija la audiencia. Simulado. **Un borrador solo se envía una vez.**

| Campo | Valores |
|---|---|
| `channel` | `push`, `whatsapp`, `email` |
| `audience` | `segment_id`, `home_location_id`, `tier`, `inactive_days_min`, `min_visits` |
| `offer.type` | `percent_off`, `points_multiplier` (requieren `value`); `two_for_one`, `free_item` (requieren `product_id`). Llevan `valid_from` / `valid_to` |
| `message` | Máx. **140** caracteres en push, **1024** en WhatsApp, **5000** en email |

- La oferta debe **iniciar después de `data_as_of`**.
- Las campañas que crea nuestra llave solo son visibles para nosotros.
- Las campañas históricas tienen `results`, con `treatment_visit_rate` y `control_visit_rate` cuando hubo grupo de control.

---

## 8. Trampas de veracidad detectadas en el enunciado

Cosas que, si el agente las ignora, producen cifras incorrectas o recomendaciones engañosas. Cada una debe quedar cubierta por diseño (herramienta, prompt o evaluación).

| # | Trampa | Cómo se evita |
|---|---|---|
| T-01 | Usar la fecha del sistema como "hoy" | Toda ventana relativa se calcula desde `data_as_of` |
| T-02 | Comparar días/horas por totales | Usar `transactions_per_day` con `weekday`/`hour` |
| T-03 | Llamar "utilidad" a secas a la de categoría/producto | Decir siempre "utilidad **antes de descuentos**" |
| T-04 | Reportar el tamaño del segmento como alcance | Reportar `reachable` del preview, por canal, y explicar exclusiones |
| T-05 | Mezclar visitas (tarjeta) con tickets (POS) | Distinguir fuentes; ventas sin tarjeta existen |
| T-06 | Contar reembolsos al calcular desde tickets crudos | Preferir analytics; si se usan tickets, excluir `refunded` |
| T-07 | Desfase de zona horaria | Filtros en hora local; convertir timestamps UTC al mostrar |
| T-08 | Concluir con muestras pequeñas | Advertir tamaño de muestra (p. ej. campañas con pocos destinatarios) |
| T-09 | Juzgar campañas sin grupo de control | Usar lift = treatment − control cuando exista; si no, decirlo |
| T-10 | Crear o enviar sin aprobación | Aprobación explícita de la persona en la UI antes de `create` y antes de `send` |
| T-11 | Oferta que inicia antes de `data_as_of` o mensaje demasiado largo | Validar antes de llamar a la API |
| T-12 | Enviar dos veces el mismo borrador | Manejar `409` y estado del borrador |
| T-13 | Recomendar ofertas que destruyen margen | Usar precio y costo del catálogo para estimar costo de la oferta |

---

## 9. Supuestos y preguntas abiertas

| # | Tema | Estado |
|---|---|---|
| Q-01 | ¿El "mes" de octubre/septiembre es calendario completo en hora local? | Supuesto: sí (01 a fin de mes, America/Mexico_City) |
| Q-02 | ¿"Aprobar" requiere dos pasos (crear borrador y luego enviar) o uno? | Supuesto: dos aprobaciones explícitas, la de envío mostrando audiencia, oferta, mensaje y alcance |
| Q-03 | ¿La demo publicada (X-01) puede usar nuestras llaves con límite de gasto? | Pendiente: decidir protección (rate limit propio, contraseña o modo demo) |
| Q-04 | Detalles del esquema OpenAPI (filtros exactos de `/customers`, campos de `results`) | Pendiente: explorar `/openapi.json` con la llave real y guardar hallazgos en `04_exploracion/` |

---

## 10. Dónde sigue la documentación

El mapa completo de la documentación del repositorio está en [`CLAUDE.md`](../../CLAUDE.md) §2 y en [`docs/README.md`](../README.md).
