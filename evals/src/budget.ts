/**
 * ES: Tope de gasto de una corrida (límite de 20 USD de OpenRouter para todo el proyecto).
 *     Suma el costo que reporta OpenRouter de cada conversación y de su juez; al llegar al
 *     tope ya no se inician conversaciones nuevas (las que están en curso terminan).
 * EN: Spending cap of a run (OpenRouter's 20 USD limit for the whole project). It adds
 *     the cost OpenRouter reports for each conversation and its judge; once the cap is
 *     reached no new conversations start (the ones in progress finish).
 */
export type Budget = {
  readonly maxUsd: number;
  spentUsd: () => number;
  canStart: () => boolean;
  fits: (estimateUsd: number) => boolean;
  add: (usd: number) => void;
};

export function createBudget(maxUsd: number): Budget {
  let spent = 0;
  return {
    maxUsd,
    spentUsd: () => spent,
    canStart: () => spent < maxUsd,
    fits: (estimateUsd) => spent + estimateUsd <= maxUsd,
    add: (usd) => {
      spent += usd;
    },
  };
}

export const BUDGET_EXHAUSTED = "Presupuesto de la corrida agotado";
