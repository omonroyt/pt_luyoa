/**
 * ES: Almacén de preferencias de un negocio (X-04, ADR-16). El negocio se fija al crear el
 *     almacén: ninguna operación recibe otro businessId, así que un negocio no puede leer
 *     ni borrar las preferencias de otro (CA-X05). Hay una versión en base de datos para
 *     la app y otra en memoria para pruebas y evaluaciones.
 * EN: Preference store of one business (X-04, ADR-16). The business is fixed when the
 *     store is created: no operation takes another businessId, so one business cannot
 *     read or delete another's preferences (CA-X05). There is a database version for the
 *     app and an in-memory one for tests and evaluations.
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { preferences } from "../db/schema";
import { PreferenceKeySchema, type Preference, type PreferenceKey } from "./preferences";

export type PreferenceStore = {
  list: () => Promise<Preference[]>;
  save: (key: PreferenceKey, value: string) => Promise<void>;
  remove: (key: PreferenceKey) => Promise<boolean>;
};

const byKey = (a: Preference, b: Preference) => a.key.localeCompare(b.key);

export function createMemoryPreferenceStore(now: () => Date = () => new Date()): PreferenceStore {
  const saved = new Map<PreferenceKey, Preference>();
  return {
    list: async () => [...saved.values()].sort(byKey),
    save: async (key, value) => {
      saved.set(key, { key, value, updatedAt: now() });
    },
    remove: async (key) => saved.delete(key),
  };
}

/**
 * ES: Almacén que abre su origen al usarse, para que la ruta del chat no espere a la base de
 *     datos antes de empezar el turno.
 * EN: Store that opens its backing store on use, so the chat route does not wait for the
 *     database before starting the turn.
 */
export function deferredPreferenceStore(open: () => Promise<PreferenceStore>): PreferenceStore {
  let opened: Promise<PreferenceStore> | undefined;
  const store = () => (opened ??= open());
  return {
    list: async () => (await store()).list(),
    save: async (key, value) => (await store()).save(key, value),
    remove: async (key) => (await store()).remove(key),
  };
}

export function createDbPreferenceStore(
  db: Database,
  businessId: string,
  now: () => Date = () => new Date(),
): PreferenceStore {
  const ofBusiness = (key: PreferenceKey) =>
    and(eq(preferences.businessId, businessId), eq(preferences.key, key));
  return {
    async list() {
      const rows = await db
        .select()
        .from(preferences)
        .where(eq(preferences.businessId, businessId))
        .orderBy(asc(preferences.key));
      // ES: Una clave que ya no existe en el catálogo se ignora en lugar de romper el turno.
      // EN: A key no longer in the catalog is ignored instead of breaking the turn.
      return rows.flatMap((row) => {
        const key = PreferenceKeySchema.safeParse(row.key);
        return key.success ? [{ key: key.data, value: row.value, updatedAt: row.updatedAt }] : [];
      });
    },
    async save(key, value) {
      const updatedAt = now();
      await db
        .insert(preferences)
        .values({ id: randomUUID(), businessId, key, value, updatedAt })
        .onConflictDoUpdate({
          target: [preferences.businessId, preferences.key],
          set: { value, updatedAt },
        });
    },
    async remove(key) {
      const deleted = await db.delete(preferences).where(ofBusiness(key)).returning();
      return deleted.length > 0;
    },
  };
}
