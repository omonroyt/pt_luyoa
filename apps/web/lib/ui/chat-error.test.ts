import { describe, expect, it } from "vitest";
import { chatErrorView } from "./chat-error";

const apiError = (code: string, message: string) =>
  new Error(JSON.stringify({ error: { code, message } }));

describe("chatErrorView", () => {
  it("muestra el texto de los topes de la demo sin ofrecer reintentar", () => {
    expect(chatErrorView(apiError("budget_exhausted", "Tope de hoy."))).toEqual({
      message: "Tope de hoy.",
      retryable: false,
      needsAccess: false,
    });
    expect(chatErrorView(apiError("rate_limited", "Límite."))).toMatchObject({ retryable: false });
  });

  it("con la sesión vencida lleva a la entrada", () => {
    expect(chatErrorView(apiError("unauthorized", "Sesión vencida."))).toMatchObject({
      needsAccess: true,
      retryable: false,
    });
  });

  it("cualquier otro error ofrece reintentar con el mensaje general", () => {
    for (const error of [new Error("Failed to fetch"), apiError("internal", "x"), undefined]) {
      expect(chatErrorView(error)).toMatchObject({ retryable: true, needsAccess: false });
    }
  });
});
