"use client";

/**
 * ES: Dibujo de la gráfica con Recharts. Las barras se dibujan horizontales: las etiquetas
 *     (días, sucursales, categorías) se leen completas y la gráfica cabe en 375 px sin
 *     cambiar de forma (07 §4). Todas las barras conservan su color pleno (contraste de al
 *     menos 3:1 contra el fondo) y la resaltada lleva un contorno del color del texto; el
 *     motivo también va en texto, así que el color no es la única señal.
 * EN: Chart drawing with Recharts. Bars are drawn horizontally: labels (days, locations,
 *     categories) read in full and the chart fits 375 px without changing shape (07 §4).
 *     Every bar keeps its full color (at least 3:1 contrast against the background) and
 *     the highlighted one gets an outline in the text color; the reason is also given as
 *     text, so color is not the only cue.
 */
import type { ChartBlock } from "@alborada/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { SERIES_COLORS } from "@/lib/ui/chart-data";
import { formatValue } from "@/lib/ui/format";

type Row = ChartBlock["data"][number];
type CanvasProps = { block: ChartBlock; data: Row[] };

const BAR_ROW_HEIGHT = 36;
const MIN_HEIGHT = 200;
const LINE_HEIGHT = 260;
const AXIS_WIDTH = 96;
const HIGHLIGHT_STROKE = 2;

const tick = { fill: "var(--muted)", fontSize: 12 };

function tooltipFormatter(block: ChartBlock) {
  return (value: unknown, name: unknown) => {
    const series = block.series.find((item) => item.label === name);
    return formatValue(typeof value === "number" ? value : String(value), series?.unit);
  };
}

const axisFormatter = (block: ChartBlock) => (value: number) =>
  formatValue(value, block.series[0]?.unit);

function BarCanvas({ block, data }: CanvasProps) {
  const highlightIndex = data.findIndex((row) => String(row[block.x.key]) === block.highlight?.x);
  const shape = (props: BarShapeProps) => (
    <Rectangle
      {...props}
      stroke={props.index === highlightIndex ? "var(--foreground)" : undefined}
      strokeWidth={props.index === highlightIndex ? HIGHLIGHT_STROKE : 0}
    />
  );
  const height = Math.max(MIN_HEIGHT, data.length * BAR_ROW_HEIGHT * block.series.length);
  return (
    <BarChart layout="vertical" data={data} responsive style={{ width: "100%", height }}>
      <CartesianGrid horizontal={false} stroke="var(--border)" />
      <XAxis type="number" tick={tick} tickFormatter={axisFormatter(block)} />
      <YAxis type="category" dataKey={block.x.key} tick={tick} width={AXIS_WIDTH} />
      <Tooltip formatter={tooltipFormatter(block)} />
      {block.series.length > 1 ? <Legend /> : null}
      {block.series.map((series, index) => (
        <Bar
          key={series.key}
          dataKey={series.key}
          name={series.label}
          fill={SERIES_COLORS[index]}
          shape={shape}
        />
      ))}
    </BarChart>
  );
}

function LineCanvas({ block, data }: CanvasProps) {
  return (
    <LineChart data={data} responsive style={{ width: "100%", height: LINE_HEIGHT }}>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey={block.x.key} tick={tick} />
      <YAxis tick={tick} tickFormatter={axisFormatter(block)} width={AXIS_WIDTH} />
      <Tooltip formatter={tooltipFormatter(block)} />
      {block.series.length > 1 ? <Legend /> : null}
      {block.series.map((series, index) => (
        <Line
          key={series.key}
          dataKey={series.key}
          name={series.label}
          stroke={SERIES_COLORS[index]}
          strokeWidth={2}
          dot={false}
        />
      ))}
    </LineChart>
  );
}

export function ChartCanvas(props: CanvasProps) {
  return props.block.kind === "line" ? <LineCanvas {...props} /> : <BarCanvas {...props} />;
}
