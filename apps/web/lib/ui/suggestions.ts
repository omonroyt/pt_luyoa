/**
 * ES: Preguntas sugeridas: el resumen de la semana (X-02), los seis escenarios de la prueba
 *     (E-01 a E-06) y el caso de ejemplo, con el texto del enunciado (07 §4). Cada una lleva
 *     el ícono con el que se presenta en la interfaz.
 * EN: Suggested questions: the weekly summary (X-02), the six test scenarios (E-01 to
 *     E-06) and the example case, with the wording of the brief (07 §4). Each one carries
 *     the icon it is shown with in the interface.
 */
import type { IconName } from "@/components/ui/icon";
import { WEEKLY_SUMMARY_PROMPT } from "../agent/weekly-prompt";

export type Suggestion = { id: string; label: string; prompt: string; icon: IconName };

export const SUGGESTIONS: Suggestion[] = [
  { id: "semana", label: "Resumen de la semana", prompt: WEEKLY_SUMMARY_PROMPT, icon: "sparkles" },
  {
    id: "E-01",
    label: "Octubre vs septiembre",
    prompt: "¿Cómo me fue en octubre comparado con septiembre?",
    icon: "trendingUp",
  },
  {
    id: "E-02",
    label: "Mi peor día",
    prompt: "¿Cuál es mi peor día de la semana y qué harías al respecto?",
    icon: "calendar",
  },
  {
    id: "E-03",
    label: "Sucursal a vigilar",
    prompt: "¿Qué sucursal me debería preocupar?",
    icon: "store",
  },
  {
    id: "E-04",
    label: "Clientes que pierdo",
    prompt: "¿Qué clientes estoy perdiendo y a cuántos puedo contactar?",
    icon: "users",
  },
  {
    id: "E-05",
    label: "Mejores campañas",
    prompt: "¿Qué campañas me han funcionado mejor? ¿Repetirías alguna?",
    icon: "trophy",
  },
  {
    id: "E-06",
    label: "Campaña de recuperación",
    prompt: "Prepara una campaña para recuperar clientes y mándala.",
    icon: "megaphone",
  },
  {
    id: "ejemplo",
    label: "Categoría más rentable",
    prompt: "¿Qué categoría de productos me deja más utilidad y cómo la empujo?",
    icon: "pie",
  },
];
