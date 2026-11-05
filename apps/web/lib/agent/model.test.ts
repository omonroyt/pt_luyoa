import { describe, expect, it } from "vitest";
import { providerRouting } from "./model";

describe("enrutamiento del proveedor", () => {
  it("usa solo el proveedor original cuando se conoce y permite respaldo si no", () => {
    expect(providerRouting("z-ai/glm-5.3-flash")).toMatchObject({
      order: ["z-ai"],
      allow_fallbacks: false,
    });
    expect(providerRouting("minimax/minimax-m3.1-flash")).toMatchObject({ allow_fallbacks: true });
  });
});
