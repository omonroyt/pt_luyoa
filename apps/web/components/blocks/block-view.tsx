/**
 * ES: Elige el componente de un bloque de presentación. El servidor ya validó y verificó
 *     el bloque; aquí se valida otra vez con el esquema de @alborada/shared porque la
 *     interfaz no confía en datos sin forma conocida (apps/web CLAUDE.md, regla 5).
 * EN: Picks the component for a presentation block. The server already validated and
 *     verified the block; it is validated again here with the @alborada/shared schema
 *     because the UI does not trust data of unknown shape (apps/web CLAUDE.md, rule 5).
 */
import { CampaignCardBlock, ChartBlock, KpisBlock, TableBlock } from "@alborada/shared";
import type { ReactNode } from "react";
import type { z } from "zod";
import { CampaignCard } from "./campaign-card";
import { ChartBlock as ChartView } from "./chart-block";
import { KpisBlock as KpisView } from "./kpis-block";
import { TableBlock as TableView } from "./table-block";

type Renderer<Schema extends z.ZodType> = {
  schema: Schema;
  render: (block: z.infer<Schema>) => ReactNode;
};

const renderer = <Schema extends z.ZodType>(entry: Renderer<Schema>) =>
  entry as Renderer<z.ZodType>;

const RENDERERS: Record<string, Renderer<z.ZodType>> = {
  show_chart: renderer({ schema: ChartBlock, render: (block) => <ChartView block={block} /> }),
  show_table: renderer({ schema: TableBlock, render: (block) => <TableView block={block} /> }),
  show_kpis: renderer({ schema: KpisBlock, render: (block) => <KpisView block={block} /> }),
  show_campaign_card: renderer({
    schema: CampaignCardBlock,
    render: (block) => <CampaignCard block={block} />,
  }),
};

export function hasBlockView(name: string): boolean {
  return name in RENDERERS;
}

export function BlockView({ name, input }: { name: string; input: unknown }) {
  const entry = RENDERERS[name];
  const parsed = entry?.schema.safeParse(input);
  if (!entry || !parsed?.success) {
    return (
      <p role="alert" className="text-sm text-negative">
        No pude mostrar este bloque porque sus datos no tienen el formato esperado.
      </p>
    );
  }
  return entry.render(parsed.data);
}
