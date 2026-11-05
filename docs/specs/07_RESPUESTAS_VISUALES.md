# Respuestas visuales: contrato de bloques y bocetos

| Campo | Valor |
|---|---|
| Versión | 0.1 (borrador) |
| Fecha | 2026-11-04 |
| Relacionados | [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md) §4.3, [`04_DECISIONES_TECNICAS.md`](04_DECISIONES_TECNICAS.md) ADR-07, [`06_DISENO_AGENTE.md`](06_DISENO_AGENTE.md) |

> Define los bloques que el agente puede mostrar, su esquema, cuándo usar cada uno y cómo se ven. Los esquemas viven en código en `@alborada/shared` (zod) y se usan igual en el orquestador (validación) y en la interfaz (renderizado).

---

## 1. Reglas de selección

| Si la respuesta… | Bloque | Ejemplo |
|---|---|---|
| Compara 2 a 12 elementos en una métrica | `show_chart` tipo `bar` | Utilidad por categoría; transacciones/día por día de la semana |
| Muestra evolución en el tiempo | `show_chart` tipo `line` | Ventas semanales por sucursal |
| Compara dos periodos en pocas métricas | `show_kpis` (+ `bar` agrupada si hay desglose) | Octubre vs septiembre |
| Lista elementos con 3 o más atributos | `show_table` | Campañas con canal, oferta, n, tasas y lift |
| Propone, muestra o confirma una campaña | `show_campaign_card` | Propuesta, borrador, enviada |
| Es una cifra o un sí/no | Solo texto (con fuente) | "Tienes 3 sucursales" |
| No hay datos | Solo texto | "No tengo datos de renta…" |

Toda respuesta con cifras termina con fuentes: cada bloque trae sus `sources` y el texto puede llevar `cite_sources`.

---

## 2. Tipos base

> **Implementación:**
> - Los esquemas zod de §2 y §3 viven en `packages/shared/src/blocks/`, un archivo por bloque.
> - Las herramientas `show_*` y `cite_sources` del agente los usan como esquema de entrada (`apps/web/lib/agent/presentation-tools.ts`).
> - `SourceRef` exige el formato exacto de `Source.id` (`src_` seguido de 10 caracteres hexadecimales), para que el modelo no cite fuentes inventadas.
> - Si un argumento no cumple el esquema, el modelo recibe el detalle y corrige en el paso siguiente. La interfaz recibe solo un aviso de corrección.

```ts
// Referencia a un resultado de herramienta (ver 03_ARQUITECTURA.md §4.1)
type SourceRef = string; // p. ej. "src_7f3a"

type Unit = "mxn" | "count" | "percent" | "per_day" | "ratio";

interface Period {
  from: string; // "2026-08-01" (fecha local)
  to: string;   // "2026-10-31"
  label?: string; // "Últimos 3 meses"
}

interface BlockBase {
  title: string;
  subtitle?: string;      // p. ej. "Utilidad antes de descuentos"
  period: Period;
  sources: SourceRef[];   // al menos uno si hay cifras
  notes?: string[];       // aclaraciones que deben verse junto al visual
}
```

---

## 3. Bloques

### 3.1 `show_chart`

```ts
interface ChartBlock extends BlockBase {
  kind: "bar" | "line" | "grouped_bar";
  x: { key: string; label: string };
  series: Array<{ key: string; label: string; unit: Unit }>; // 1 a 4 series
  data: Array<Record<string, string | number>>;              // máx. 60 puntos
  highlight?: { x: string; reason: string };                  // p. ej. el peor día
  sort?: "asc" | "desc" | "none";
}
```

```text
┌──────────────────────────────────────────────────────────┐
│ Transacciones por día · por día de la semana             │
│ 2026-08-08 a 2026-10-31 · últimas 12 semanas             │
│                                                          │
│  lun ████████████████████ 81                             │
│  mar ███████████████████  78                             │
│  mié ██████████████████   74                             │
│  jue ███████████████████  77                             │
│  vie ██████████████████████ 88                           │
│  sáb ████████████████████████ 95                         │
│  dom ███████████▒▒        52   ◀ el más bajo             │
│                                                          │
│ ⓘ Se compara por día porque cada día aparece un número   │
│   distinto de veces en el rango.                         │
│ [Fuente: ventas por día de la semana]                    │
└──────────────────────────────────────────────────────────┘
```

> Valores ilustrativos.

### 3.2 `show_table`

```ts
interface TableBlock extends BlockBase {
  columns: Array<{
    key: string;
    label: string;
    unit?: Unit;
    align?: "left" | "right";
    emphasis?: boolean; // resalta la columna clave (p. ej. lift)
  }>;
  rows: Array<Record<string, string | number | null>>; // máx. 25 filas
  totalRow?: Record<string, string | number | null>;
  footnote?: string;
}
```

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Alcance real por canal · clientes que estás perdiendo                │
│ Segmentos a 2026-10-31                                               │
├───────────┬──────────┬─────────┬──────────────┬────────────┬─────────┤
│ Segmento  │ Canal    │ En seg. │ Sin consent. │ Duplicados │ Alcance │
├───────────┼──────────┼─────────┼──────────────┼────────────┼─────────┤
│ En riesgo │ WhatsApp │     483 │          214 │          2 │     267 │
│ En riesgo │ Push     │     483 │            … │          … │       … │
│ En riesgo │ Email    │     483 │            … │          … │       … │
│ Dormidos  │ …        │       … │            … │          … │       … │
├───────────┴──────────┴─────────┴──────────────┴────────────┴─────────┤
│ "Alcance" ya descuenta suspendidos, sin consentimiento y duplicados. │
│ [Fuente: alcance de audiencia ×6]                                    │
└──────────────────────────────────────────────────────────────────────┘
```

> Valores ilustrativos tomados del ejemplo de la API.

### 3.3 `show_kpis`

```ts
interface KpisBlock extends BlockBase {
  comparisonLabel?: string; // "vs septiembre"
  items: Array<{
    key: string;
    label: string;
    value: number;
    unit: Unit;
    previous?: number;
    deltaAbs?: number;   // calculado por el MCP, no por el modelo
    deltaPct?: number;
    goodWhen?: "up" | "down"; // para colorear la variación
  }>; // 2 a 4
}
```

```text
┌──────────────────────────────────────────────────────────┐
│ Octubre vs septiembre 2026                               │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│ │Ventas netas│ │Transacc.   │ │Ticket prom.│ │Utilidad │ │
│ │ $X         │ │ N          │ │ $Y         │ │ $Z      │ │
│ │ ▲ +4.2%    │ │ ▲ +1.1%    │ │ ▲ +3.0%    │ │ ▼ −0.8% │ │
│ └────────────┘ └────────────┘ └────────────┘ └─────────┘ │
│ ⓘ Octubre tiene 31 días y septiembre 30.                 │
│ [Fuente: comparación de periodos]                        │
└──────────────────────────────────────────────────────────┘
```

### 3.4 `show_campaign_card`

```ts
interface CampaignCardBlock extends BlockBase {
  state: "proposal" | "awaiting_draft_approval" | "draft"
       | "awaiting_send_approval" | "sent" | "discarded";
  campaignId?: string;             // a partir de "draft"
  name: string;
  objective: string;
  audience: {
    filters: Record<string, string | number>; // los de la API
    description: string;                       // "Clientes en riesgo de Coyoacán"
  };
  channel: "push" | "whatsapp" | "email";
  reach: {
    matched: number;
    reachable: number;
    excludedNoConsent: number;
    excludedSuspended: number;
    excludedDuplicates: number;
    otherChannels?: Array<{ channel: string; reachable: number }>;
  };
  offer: {
    type: "percent_off" | "points_multiplier" | "two_for_one" | "free_item";
    value?: number;
    productId?: string;
    productName?: string;
    validFrom: string;
    validTo: string;
  };
  economics: {
    costPerRedemption: number;
    marginNote: string;                 // "Cuesta $18 por canje; la visita deja $54"
    totalCostRange: [number, number];   // escenarios de redención
  };
  expectedImpact?: {                    // X-03
    extraVisitsRange: [number, number];
    extraSalesRange: [number, number];
    basis: string;                      // "Lift de 6 pts en 'Te extrañamos' (n=410)"
  };
  history: Array<{ name: string; lift: number | null; n: number; reliable: boolean }>;
  message: { text: string };          // longitud y límite los calcula el sistema
  warnings: string[];
  approvalId?: string;                  // cuando hay una aprobación pendiente
}
```

**Propuesta (espera la primera aprobación):**

```text
┌──────────────────────────────────────────────────────────┐
│ 📣 Te extrañamos · Coyoacán            PROPUESTA         │
│ Objetivo: recuperar clientes en riesgo                   │
├──────────────────────────────────────────────────────────┤
│ Audiencia   En riesgo (10+ visitas, 30–90 días sin venir)│
│ Canal       WhatsApp                                     │
│ Alcance     267 de 483  ·  214 sin consentimiento,       │
│             2 duplicados   (Push: …  Email: …)           │
│ Oferta      Bebida gratis hasta $68 · 10 al 24 nov       │
│ Costo       ~$18 por canje · $X–$Y total                 │
│ Impacto     +N a +M visitas · +$A a +$B en ventas        │
│             Base: campaña "…" (lift 6 pts, n=410)        │
├──────────────────────────────────────────────────────────┤
│ Mensaje (98/1024)                                        │
│ "¡Te extrañamos! Ven esta semana y tu bebida va por      │
│  nuestra cuenta. Válido del 10 al 24 de noviembre."      │
├──────────────────────────────────────────────────────────┤
│ ⚠ La campaña de referencia no tuvo grupo de control.     │
├──────────────────────────────────────────────────────────┤
│ [ Preparar borrador ]   [ Cambiar ]   [ Descartar ]      │
│ [Fuentes: segmentos · alcance · campañas · catálogo]     │
└──────────────────────────────────────────────────────────┘
```

> Valores ilustrativos.

**Estados de la tarjeta:**

| Estado | Etiqueta | Botones |
|---|---|---|
| `proposal` / `awaiting_draft_approval` | PROPUESTA | Preparar borrador · Cambiar · Descartar |
| `draft` / `awaiting_send_approval` | BORRADOR `cmp_…` | Enviar · Cambiar · Descartar |
| `sent` | ENVIADA ✓ (simulado) | Ninguno; muestra id, fecha y audiencia fijada |
| `discarded` | DESCARTADA | Ninguno |

Al pulsar un botón, la tarjeta se bloquea (sin doble clic) hasta que el agente responde.

**Implementación (IMP-42):** los botones viven en un panel de aprobación que la interfaz dibuja a partir de la llamada `request_draft_approval` o `request_send_approval`, justo debajo de la tarjeta. El panel muestra el contenido exacto que firmará el token: nombre, canal, filtros de audiencia, oferta con sus fechas y el mensaje con su conteo de caracteres. La tarjeta (`show_campaign_card`) queda como evidencia y estado. Así la persona aprueba lo que se va a crear o enviar, no un resumen redactado por el modelo.

| Botón | Qué devuelve al agente |
|---|---|
| Preparar borrador · Enviar | Pide el token a `/api/approvals` con el contenido sin modificar y devuelve `{ approved: true, approval_token, approval_id, expires_at }`. Si la solicitud falla, nada queda aprobado y el panel lo indica |
| Cambiar | Abre un campo de texto y devuelve `{ approved: false, reason: "La persona pidió cambios: …" }` |
| Descartar | Devuelve `{ approved: false, reason: "La persona descartó la campaña." }` |

Mientras haya una aprobación sin resolver, la entrada de texto y las sugerencias se bloquean: el agente espera el resultado de esa llamada.

### 3.5 `cite_sources` y chip de fuente

```ts
interface CiteSourcesBlock {
  sources: SourceRef[];
}
```

Cada chip `[Fuente: …]` abre un panel:

```text
┌──────────────────────────────────────────────────────────┐
│ Fuente src_7f3a · sales_breakdown                        │
│ GET /v1/analytics/sales?group_by=category                │
│     &from=2026-08-01&to=2026-10-31                       │
│ Periodo: 2026-08-01 a 2026-10-31 (America/Mexico_City)   │
│ Datos a: 2026-10-31 · Consultado: 2026-11-06 11:02       │
│ [ Ver respuesta resumida ]                               │
└──────────────────────────────────────────────────────────┘
```

### 3.6 Bloques de sistema (no los llama el modelo)

| Bloque | Cuándo |
|---|---|
| Error de herramienta | Un paso falló: muestra qué falló, en una línea, y botón "Reintentar" si `retryable` |
| Paso en curso | "Consultando ventas por categoría…" con el nombre amable de la herramienta |
| Aviso de verificación | El verificador de cifras rechazó un bloque y el agente lo corrigió (solo en el panel de trazas) |
| Resumen de la semana | Sugerencia "Resumen de la semana" al inicio de la lista. Si el cron dejó un resumen y el chat está vacío, un aviso "Tu resumen de la semana al AAAA-MM-DD está listo" con "Ver resumen", que carga la pregunta y la respuesta guardadas en el chat (X-02) |
| Panel de preferencias | Botón "Preferencias" del encabezado: lista lo que el agente recuerda del negocio (canal, descuento máximo, tono, sucursal, productos a evitar y duración), con "Olvidar" en cada una. Misma hoja inferior en celular y columna lateral en escritorio que el panel de trazas; solo hay un panel abierto a la vez (X-04) |

---

## 4. Página de chat

**Escritorio:**

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ☕ Café Alborada · Copiloto             Datos al 31 oct 2026   [Trazas ▸] │
├──────────────────────────────────────────────────────┬────────────────────┤
│                                                      │ Trazas del turno   │
│  ┌ Resumen de la semana ─────────────────────────┐   │ 1 compare_periods  │
│  │ KPIs · 3 oportunidades · [Armar campaña]      │   │   "comparar meses" │
│  └───────────────────────────────────────────────┘   │   412 ms           │
│                                                      │ 2 show_kpis        │
│  👩 ¿Cómo me fue en octubre comparado con sept?      │ 3 show_chart       │
│                                                      │ ────────────────── │
│  🤖 En octubre vendiste $X, +4.2% que septiembre…    │ Tokens 8.1k / 0.9k │
│     [KPIs]                                           │ Costo  $0.006      │
│     [Gráfica por sucursal]                           │ Tiempo 6.4 s       │
│     [Fuente]                                         │ Modelo …           │
│                                                      │                    │
├──────────────────────────────────────────────────────┴────────────────────┤
│ [¿Cómo me fue en oct vs sep?] [¿Peor día?] [¿Sucursal?] [¿Qué clientes…?] │
│ ┌───────────────────────────────────────────────────────────────┐ [Enviar]│
│ │ Pregúntame sobre tu negocio…                                  │         │
│ └───────────────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────────────┘
```

**Celular (375 px):** una columna; las trazas se abren como hoja inferior; las tablas anchas se desplazan horizontalmente dentro de su tarjeta (la página no); las gráficas de barras pasan a horizontales.

**Diseño visual (implementado en `apps/web`):**
- **Marca:** taza de café en 3D sin recuadro ("Hot beverage" de Fluent Emoji, Microsoft, licencia MIT, recoloreada al terracota de la paleta). Nombre en Fraunces; interfaz en Geist.
- **Superficies:** fondo sólido, tarjetas con borde fino y sombra suave, acento terracota sólido. Sin degradados de fondo ni íconos dentro de recuadros de color; los íconos van sueltos en el color del acento.
- **Modo claro y oscuro:** botón en el encabezado. La preferencia se guarda en `localStorage` y, sin ella, se usa la del sistema. Un script en línea la aplica antes de pintar, así que no hay destello al cargar.
- **Bienvenida:** saludo a la dueña y cuadrícula de preguntas sugeridas. Ya en la conversación, las sugerencias pasan a una franja de una fila sobre la entrada.
- **Movimiento:**
  - los mensajes y bloques entran con una animación corta;
  - las barras crecen desde cero, serie por serie, y las líneas se trazan sobre un área tenue;
  - las cifras de los indicadores suben desde cero.

  Con `prefers-reduced-motion` todo aparece completo y al instante.
- **Seguimiento del hilo:** la página acompaña la respuesta mientras crece y deja de seguirla si la persona sube a leer. Una pregunta nueva la vuelve a seguir.

---

## 5. Convenciones de formato

| Elemento | Convención |
|---|---|
| Moneda | `Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })`; sin centavos salvo ticket promedio |
| Porcentajes | Un decimal; variaciones con signo (`+4.2%`, `−0.8%`) |
| Puntos porcentuales | Para lift y tasas: "6.1 pts" |
| Fechas | "10 al 24 nov 2026" en texto; ISO en fuentes |
| Días y horas | Nombres en español; horas en formato 24 h local |
| Colores | Variación positiva/negativa según `goodWhen`; una paleta categórica fija por serie en todas las gráficas, definida como variables CSS con su valor para modo claro y oscuro |
| Accesibilidad | Toda gráfica tiene título y una tabla equivalente accesible ("Ver datos"); contraste AA; los colores no son la única señal |

---

## 6. Validación de bloques

Al recibir una llamada de presentación, el orquestador:

1. Valida el esquema zod (si falla, devuelve el error al modelo para que corrija).
2. Verifica que `sources` exista y que cada `source.id` pertenezca a esta conversación.
3. Corre el **verificador de cifras**: cada número de `data`, `rows`, `items`, `reach` y `economics` debe aparecer en alguna de las fuentes citadas, con tolerancia de redondeo.
4. Para la tarjeta de campaña, verifica que `reach` coincida con el último `audience_reach` de esa audiencia y canal, y que el mensaje no pase el límite del canal. La longitud la calcula el sistema con `messageLength` (unidades UTF-16), no el modelo: en M6 el modelo contaba mal y el verificador rechazaba la tarjeta.
5. Solo entonces lo envía a la interfaz y lo registra en la traza.
