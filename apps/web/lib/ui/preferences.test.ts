import { describe, expect, it, vi } from "vitest";
import { fetchPreferences, forgetPreference } from "./preferences";

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("preferencias en la interfaz", () => {
  it("lee y valida las preferencias guardadas", async () => {
    const saved = {
      key: "preferred_channel",
      label: "Canal preferido",
      value: "whatsapp",
      updatedAt: "2026-11-05T12:00:00.000Z",
    };
    const fetcher = reply(200, { preferences: [saved] });
    expect(await fetchPreferences(fetcher)).toEqual([saved]);
    expect(fetcher).toHaveBeenCalledWith("/api/preferences");
  });

  it("rechaza una respuesta con otra forma", async () => {
    await expect(fetchPreferences(reply(200, { items: [] }))).rejects.toThrow();
  });

  it("borra una preferencia; si ya no estaba, no es un error", async () => {
    const fetcher = reply(200, { removed: true });
    await forgetPreference("message_tone", fetcher);
    expect(fetcher).toHaveBeenCalledWith("/api/preferences?key=message_tone", {
      method: "DELETE",
    });
    await expect(forgetPreference("message_tone", reply(404, {}))).resolves.toBeUndefined();
    await expect(forgetPreference("message_tone", reply(500, {}))).rejects.toThrow();
  });
});
