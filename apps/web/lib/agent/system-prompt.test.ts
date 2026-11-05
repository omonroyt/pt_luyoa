import { beforeAll, describe, expect, it } from "vitest";
import { loadBusinessContext, type BusinessContext } from "./business-context";
import { connectMcpClient } from "./mcp-tools";
import { buildSystemPrompt, type AgentCapabilities } from "./system-prompt";
import { fixtureMcpConnection } from "./test-support";

const NONE: AgentCapabilities = { presentation: false, approvals: false, memory: false };
const ALL: AgentCapabilities = { presentation: true, approvals: true, memory: true };

let context: BusinessContext;

beforeAll(async () => {
  const client = await connectMcpClient(fixtureMcpConnection());
  context = await loadBusinessContext(await client.tools());
  await client.close();
});

describe("buildSystemPrompt", () => {
  it("usa la fecha de corte y el calendario del código, nunca la fecha del sistema (T-01)", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    expect(prompt).toContain('"Hoy" para el negocio es 2026-10-31');
    expect(prompt).toContain("last_full_month: octubre 2026 (2026-10-01 a 2026-10-31, 31 días)");
    expect(prompt).toContain("a partir de 2026-11-01");
    expect(prompt).not.toContain("2026-11-04");
  });

  it("presenta las sucursales con su id y cita la fuente del contexto", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    expect(prompt).toContain("Roma Norte (loc_roma)");
    expect(prompt).toContain(`Fuente del contexto del negocio: ${context.sourceId}`);
  });

  it("incluye las reglas de veracidad, incluida la prohibición de calcular y exagerar", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    expect(prompt).toContain("REGLAS DE VERACIDAD");
    expect(prompt).toContain("ni sumas, ni restas, ni porcentajes");
    expect(prompt).toContain("utilidad antes de descuentos");
    expect(prompt).toContain('evita absolutos ("nadie", "todos", "siempre")');
    expect(prompt).toContain('sin agregar "+" ("18,000+")');
  });

  it("al comparar dos meses pide la utilidad bruta de ambos (CA-E01-1)", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    expect(prompt).toContain("ticket promedio y utilidad bruta");
  });

  it("declara la política de periodos por defecto con las claves del calendario", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    expect(prompt).toContain("Patrones por día de la semana u hora: last_12_weeks.");
    expect(prompt).toContain("last_full_month contra previous_full_month");
    expect(prompt).toContain("Utilidad por categoría o producto: last_3_months.");
  });

  it("no nombra herramientas que el turno no tiene", () => {
    const prompt = buildSystemPrompt({ context, capabilities: NONE });
    for (const tool of ["show_chart", "request_draft_approval", "remember_preference"]) {
      expect(prompt).not.toContain(tool);
    }
  });

  it("agrega las secciones de formato, aprobación y preferencias cuando están activas", () => {
    const prompt = buildSystemPrompt({
      context,
      capabilities: ALL,
      preferences: ["Tope de descuento: 20%"],
    });
    expect(prompt).toContain("show_chart");
    expect(prompt).toContain("request_draft_approval");
    expect(prompt).toContain("en el mismo turno muestra la tarjeta");
    expect(prompt).toContain("campañas pasadas usa show_table");
    expect(prompt).toContain("No cuentes caracteres");
    expect(prompt).toContain("- Tope de descuento: 20%");
  });
});
