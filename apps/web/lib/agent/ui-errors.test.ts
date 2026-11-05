import { describe, expect, it, vi } from "vitest";
import { FigureVerificationError } from "./figure-verifier";
import { NoSuchToolError } from "ai";
import {
  EARLY_STEP_MESSAGE,
  INVALID_BLOCK_MESSAGE,
  reportStreamError,
  STREAM_ERROR_MESSAGE,
  UNVERIFIED_BLOCK_MESSAGE,
} from "./ui-errors";

describe("reportStreamError", () => {
  it("registra en el servidor los errores inesperados sin exponer el detalle a la interfaz", () => {
    const log = vi.fn();
    const message = reportStreamError(new Error("Provider returned error"), log);
    expect(message).toBe(STREAM_ERROR_MESSAGE);
    expect(log).toHaveBeenCalledWith("Error del stream del agente: Error: Provider returned error");
  });

  it("no registra las correcciones esperadas del modelo", () => {
    const log = vi.fn();
    expect(reportStreamError("AI_InvalidToolInputError: bad args", log)).toBe(
      INVALID_BLOCK_MESSAGE,
    );
    expect(reportStreamError(new FigureVerificationError(["x"]), log)).toBe(
      UNVERIFIED_BLOCK_MESSAGE,
    );
    expect(
      reportStreamError(new NoSuchToolError({ toolName: "request_draft_approval" }), log),
    ).toBe(EARLY_STEP_MESSAGE);
    expect(reportStreamError("AI_NoSuchToolError: Model tried to call unavailable tool", log)).toBe(
      EARLY_STEP_MESSAGE,
    );
    expect(log).not.toHaveBeenCalled();
  });
});
