/**
 * ES: Esquema de la base de datos de la aplicación (docs/specs/03_ARQUITECTURA.md §6).
 *     Guarda solo lo que la API de Café Alborada no guarda: conversaciones, trazas,
 *     preferencias, aprobaciones, resúmenes y contadores de uso. Nunca llaves ni datos de
 *     contacto.
 * EN: Application database schema (docs/specs/03_ARQUITECTURA.md §6). It stores only
 *     what the Café Alborada API does not: conversations, traces, preferences,
 *     approvals, summaries and usage counters. Never keys or contact data.
 */
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // ES: Nombre de la variable de entorno con la llave, nunca la llave (ADR-16).
  // EN: Name of the environment variable holding the key, never the key (ADR-16).
  apiKeyEnv: text("api_key_env").notNull(),
  createdAt: createdAt(),
});

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    title: text("title"),
    costUsd: real("cost_usd").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index("conversations_business_idx").on(table.businessId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: text("parts", { mode: "json" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("messages_conversation_idx").on(table.conversationId)],
);

export const traceSteps = sqliteTable(
  "trace_steps",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    input: text("input", { mode: "json" }),
    outputSummary: text("output_summary", { mode: "json" }),
    reason: text("reason"),
    latencyMs: integer("latency_ms"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    costUsd: real("cost_usd"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
  },
  (table) => [index("trace_steps_message_idx").on(table.messageId)],
);

export const preferences = sqliteTable(
  "preferences",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("preferences_business_key_idx").on(table.businessId, table.key)],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    conversationId: text("conversation_id"),
    action: text("action", { enum: ["create", "send"] }).notNull(),
    contentHash: text("content_hash").notNull(),
    campaignId: text("campaign_id"),
    status: text("status", { enum: ["approved", "used"] }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [index("approvals_business_idx").on(table.businessId)],
);

export const weeklySummaries = sqliteTable("weekly_summaries", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  weekEnd: text("week_end").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  createdAt: createdAt(),
});

/**
 * ES: Contadores de uso de la demo publicada (IMP-63, CA-S04): turnos por sesión y por IP
 *     (cifrada) por día, e intentos de código de acceso. Viven en la base porque en
 *     serverless la memoria no se comparte entre instancias.
 * EN: Published demo usage counters (IMP-63, CA-S04): turns per session and per (hashed) IP
 *     per day, and access code attempts. They live in the database because in serverless
 *     memory is not shared across instances.
 */
export const usageCounters = sqliteTable("usage_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
