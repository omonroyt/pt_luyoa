"use client";

/**
 * ES: Fuentes de la conversación disponibles para cualquier bloque (chip de fuente).
 * EN: Conversation sources available to any block (source chip).
 */
import type { Source } from "@alborada/shared";
import { createContext, useContext } from "react";

const SourcesContext = createContext<Map<string, Source>>(new Map());

export const SourcesProvider = SourcesContext.Provider;

export function useSource(id: string): Source | undefined {
  return useContext(SourcesContext).get(id);
}
