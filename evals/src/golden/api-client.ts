/**
 * ES: Cliente mínimo de la API para las respuestas de referencia. Es independiente del
 *     servidor MCP a propósito: si el MCP tuviera un error de cálculo, la referencia no
 *     lo heredaría y las evaluaciones lo detectarían.
 * EN: Minimal API client for the reference answers. It is independent from the MCP
 *     server on purpose: if the MCP had a calculation bug, the reference would not
 *     inherit it and the evaluations would catch it.
 */

export type GoldenApi = {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  endpoints: string[];
};

export function createGoldenApi(): GoldenApi {
  const apiKey = process.env.LUYOA_API_KEY;
  const baseUrl = process.env.LUYOA_API_BASE_URL ?? "https://prueba-developer.luyoa.dev";
  if (!apiKey) throw new Error("Falta LUYOA_API_KEY en el entorno.");
  const endpoints: string[] = [];

  const send = async <T>(method: "GET" | "POST", url: URL, body?: unknown): Promise<T> => {
    endpoints.push(`${method} ${url.pathname}${url.search}`);
    const response = await fetch(url, {
      method,
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${method} ${url.pathname} respondió ${response.status}`);
    return (await response.json()) as T;
  };

  return {
    endpoints,
    get(path, params = {}) {
      const url = new URL(path, baseUrl);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      return send("GET", url);
    },
    post(path, body) {
      return send("POST", new URL(path, baseUrl), body);
    },
  };
}
