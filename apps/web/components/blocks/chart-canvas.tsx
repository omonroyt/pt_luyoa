"use client";

/**
 * ES: Dibujo de la gráfica con Recharts. Las barras se dibujan horizontales: las etiquetas
 *     (días, sucursales, categorías) se leen completas y la gráfica cabe en 375 px sin
 *     cambiar de forma (07 §4). Las barras crecen desde cero, una serie tras otra, y las
 *     líneas se trazan de izquierda a derecha sobre un área con degradado; con movimiento
 *     reducido la gráfica aparece completa. Cada barra conserva su color pleno en el
 *     extremo (contraste de al menos 3:1 contra el fondo) y la resaltada lleva un contorno
 *     del color del texto; el motivo también va en texto, así que el color no es la única
 *     señal.
 * EN: Chart drawing with Recharts. Bars are drawn horizontally: labels (days, locations,
 *     categories) read in full and the chart fits 375 px without changing shape (07 §4).
 *     Bars grow from zero, one series after another, and lines are traced left to right
 *     over a gradient area; with reduced motion the chart appears complete. Every bar
 *     keeps its full color at the end (at least 3:1 contrast against the background) and
 *     the highlighted one gets an outline in the text color; the reason is also given as
 *     text, so color is not the only cue.
 */
import type { ChartBlock } from "@alborada/shared";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";
import { SERIES_COLORS } from "@/lib/ui/chart-data";
import { formatValue } from "@/lib/ui/format";

type Row = ChartBlock["data"][number];
type CanvasProps = { block: ChartBlock; data: Row[] };
type MotionProps = { isAnimationActive: boolean; animationEasing: "ease-out" };

const BAR_ROW_HEIGHT = 38;
const MIN_HEIGHT = 200;
const LINE_HEIGHT = 280;
const AXIS_WIDTH = 96;
const HIGHLIGHT_STROKE = 2;
const BAR_RADIUS: [number, number, number, number] = [0, 8, 8, 0];
const SERIES_DELAY_MS = 160;

const tick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    boxShadow: "0 16px 40px -18px rgb(var(--shadow-color) / 0.45)",
    color: "var(--foreground)",
    fontSize: 13,
  },
  labelStyle: { color: "var(--muted)", marginBottom: 4 },
};

function tooltipFormatter(block: ChartBlock) {
  return (value: unknown, name: unknown) => {
    const series = block.series.find((item) => item.label === name);
    return formatValue(typeof value === "number" ? value : String(value), series?.unit);
  };
}

const axisFormatter = (block: ChartBlock) => (value: number) =>
  formatValue(value, block.series[0]?.unit);

function useChartMotion(): MotionProps {
  return { isAnimationActive: !useReducedMotion(), animationEasing: "ease-out" };
}

function SeriesGradients({ id, vertical }: { id: string; vertical: boolean }) {
  return (
    <defs>
      {SERIES_COLORS.map((color, index) => (
        <linearGradient
          key={color}
          id={`${id}-${index}`}
          x1="0"
          y1="0"
          x2={vertical ? "0" : "1"}
          y2={vertical ? "1" : "0"}
        >
          <stop offset="0%" stopColor={color} stopOpacity={vertical ? 0.28 : 0.82} />
          <stop offset="100%" stopColor={color} stopOpacity={vertical ? 0 : 1} />
        </linearGradient>
      ))}
    </defs>
  );
}

function BarCanvas({ block, data }: CanvasProps) {
  const id = useId().replaceAll(":", "");
  const motion = useChartMotion();
  const highlightIndex = data.findIndex((row) => String(row[block.x.key]) === block.highlight?.x);
  const shape = (props: BarShapeProps) => (
    <Rectangle
      {...props}
      radius={BAR_RADIUS}
      stroke={props.index === highlightIndex ? "var(--foreground)" : undefined}
      strokeWidth={props.index === highlightIndex ? HIGHLIGHT_STROKE : 0}
    />
  );
  const height = Math.max(MIN_HEIGHT, data.length * BAR_ROW_HEIGHT * block.series.length);
  return (
    <BarChart layout="vertical" data={data} responsive style={{ width: "100%", height }}>
      <SeriesGradients id={id} vertical={false} />
      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
      <XAxis type="number" tick={tick} tickFormatter={axisFormatter(block)} axisLine={false} />
      <YAxis
        type="category"
        dataKey={block.x.key}
        tick={tick}
        width={AXIS_WIDTH}
        tickLine={false}
      />
      <Tooltip
        formatter={tooltipFormatter(block)}
        cursor={{ fill: "var(--accent-soft)" }}
        {...tooltipStyle}
      />
      {block.series.length > 1 ? <Legend iconType="circle" /> : null}
      {block.series.map((series, index) => (
        <Bar
          key={series.key}
          dataKey={series.key}
          name={series.label}
          fill={`url(#${id}-${index})`}
          shape={shape}
          animationBegin={index * SERIES_DELAY_MS}
          animationDuration={900}
          {...motion}
        />
      ))}
    </BarChart>
  );
}

function LineCanvas({ block, data }: CanvasProps) {
  const id = useId().replaceAll(":", "");
  const motion = useChartMotion();
  return (
    <AreaChart data={data} responsive style={{ width: "100%", height: LINE_HEIGHT }}>
      <SeriesGradients id={id} vertical />
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
      <XAxis dataKey={block.x.key} tick={tick} tickLine={false} />
      <YAxis tick={tick} tickFormatter={axisFormatter(block)} width={AXIS_WIDTH} axisLine={false} />
      <Tooltip formatter={tooltipFormatter(block)} {...tooltipStyle} />
      {block.series.length > 1 ? <Legend iconType="circle" /> : null}
      {block.series.map((series, index) => (
        <Area
          key={series.key}
          type="monotone"
          dataKey={series.key}
          name={series.label}
          stroke={SERIES_COLORS[index]}
          strokeWidth={2.5}
          fill={`url(#${id}-${index})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
          animationBegin={index * SERIES_DELAY_MS}
          animationDuration={1200}
          {...motion}
        />
      ))}
    </AreaChart>
  );
}

export function ChartCanvas(props: CanvasProps) {
  return props.block.kind === "line" ? <LineCanvas {...props} /> : <BarCanvas {...props} />;
}
