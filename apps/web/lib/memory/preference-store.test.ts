import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "../db/client";
import {
  createDbPreferenceStore,
  createMemoryPreferenceStore,
  type PreferenceStore,
} from "./preference-store";
import { parsePreferenceValue, preferenceLine } from "./preferences";

describe("valores de preferencias", () => {
  it("acepta solo valores válidos para cada clave", () => {
    expect(parsePreferenceValue("preferred_channel", "whatsapp")).toEqual({
      ok: true,
      value: "whatsapp",
    });
    expect(parsePreferenceValue("preferred_channel", "sms").ok).toBe(false);
    expect(parsePreferenceValue("max_discount_pct", "20")).toEqual({ ok: true, value: "20" });
    expect(parsePreferenceValue("max_discount_pct", "150").ok).toBe(false);
    expect(parsePreferenceValue("max_discount_pct", "veinte").ok).toBe(false);
    expect(parsePreferenceValue("focus_location", "loc_roma").ok).toBe(true);
    expect(parsePreferenceValue("focus_location", "Roma Norte").ok).toBe(false);
  });

  it("presenta el valor entre comillas para que el prompt lo lea como dato", () => {
    expect(preferenceLine({ key: "message_tone", value: "cercano" })).toBe(
      'Tono de los mensajes: "cercano"',
    );
  });
});

function storeContract(name: string, create: () => Promise<PreferenceStore>) {
  describe(name, () => {
    it("guarda, actualiza, lista y olvida una preferencia", async () => {
      const store = await create();
      await store.save("preferred_channel", "push");
      await store.save("preferred_channel", "whatsapp");
      await store.save("max_discount_pct", "20");
      const listed = await store.list();
      expect(listed.map(({ key, value }) => ({ key, value }))).toEqual([
        { key: "max_discount_pct", value: "20" },
        { key: "preferred_channel", value: "whatsapp" },
      ]);
      expect(await store.remove("preferred_channel")).toBe(true);
      expect(await store.remove("preferred_channel")).toBe(false);
      expect((await store.list()).map((item) => item.key)).toEqual(["max_discount_pct"]);
    });
  });
}

storeContract("almacén en memoria", async () => createMemoryPreferenceStore());

let db: Database;
beforeEach(async () => {
  db = await openDatabase({ url: ":memory:" });
});

storeContract("almacén en base de datos", async () => createDbPreferenceStore(db, "biz_a"));

describe("aislamiento entre negocios (CA-X05)", () => {
  it("un negocio no ve ni borra las preferencias de otro", async () => {
    const first = createDbPreferenceStore(db, "biz_a");
    const second = createDbPreferenceStore(db, "biz_b");
    await first.save("preferred_channel", "whatsapp");
    await second.save("preferred_channel", "email");
    expect(await second.remove("max_discount_pct")).toBe(false);
    expect((await first.list()).map((item) => item.value)).toEqual(["whatsapp"]);
    expect((await second.list()).map((item) => item.value)).toEqual(["email"]);
    await second.remove("preferred_channel");
    expect((await first.list()).map((item) => item.value)).toEqual(["whatsapp"]);
  });
});
