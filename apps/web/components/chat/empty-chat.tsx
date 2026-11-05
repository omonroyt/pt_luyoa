"use client";

/**
 * ES: Chat sin mensajes: la bienvenida del copiloto a la dueña, el aviso del resumen
 *     semanal si hay uno guardado y la cuadrícula de preguntas sugeridas.
 * EN: Chat without messages: the copilot's welcome to the owner, the weekly summary notice
 *     if one is stored and the grid of suggested questions.
 */
import type { UIMessage } from "ai";
import { BrandMark } from "@/components/ui/brand-mark";
import { SuggestionList } from "./suggestion-list";
import { WeeklySummaryBanner } from "./weekly-summary-banner";

type EmptyChatProps = {
  onOpenSummary: (messages: UIMessage[]) => void;
  onPick: (prompt: string) => void;
  disabled: boolean;
};

export function EmptyChat({ onOpenSummary, onPick, disabled }: EmptyChatProps) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-8 py-6 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark
          size={104}
          priority
          className="animate-float drop-shadow-[0_14px_18px_rgb(120_45_10/0.22)]"
        />
        <div className="flex animate-rise flex-col gap-2 [animation-delay:80ms]">
          <p className="text-sm font-medium text-accent">Hola, soy tu copiloto de Café Alborada</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            ¿En qué te ayudo hoy?
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-pretty text-muted sm:text-lg">
            Pregúntame por tus ventas, sucursales, clientes o campañas. Te respondo con los datos de
            tu negocio y nunca envío nada sin tu aprobación.
          </p>
        </div>
      </div>
      <WeeklySummaryBanner onOpen={onOpenSummary} />
      <SuggestionList variant="grid" onPick={onPick} disabled={disabled} />
    </section>
  );
}
