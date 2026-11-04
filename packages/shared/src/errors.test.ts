import { describe, expect, it } from "vitest";
import { errorCodeFromStatus } from "./errors";

describe("errorCodeFromStatus", () => {
  it("traduce los códigos documentados de la API", () => {
    expect(errorCodeFromStatus(401)).toBe("unauthorized");
    expect(errorCodeFromStatus(404)).toBe("not_found");
    expect(errorCodeFromStatus(409)).toBe("conflict");
    expect(errorCodeFromStatus(422)).toBe("validation_error");
    expect(errorCodeFromStatus(429)).toBe("rate_limited");
    expect(errorCodeFromStatus(503)).toBe("busy");
  });

  it("usa upstream_error para cualquier otro status", () => {
    expect(errorCodeFromStatus(500)).toBe("upstream_error");
  });
});
