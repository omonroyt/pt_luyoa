/**
 * ES: Utilidades de entrada y salida compartidas por los hooks de Claude Code.
 *     Claude Code envía el evento como JSON por stdin; salir con código 2
 *     bloquea la acción y le muestra el motivo (stderr) a Claude.
 * EN: Input/output helpers shared by the Claude Code hooks.
 *     Claude Code sends the event as JSON through stdin; exiting with code 2
 *     blocks the action and shows the reason (stderr) to Claude.
 */

const BLOCKING_EXIT_CODE = 2;

/**
 * ES: Lee y parsea el evento del hook desde stdin.
 * EN: Reads and parses the hook event from stdin.
 * @returns {Promise<{ tool_name?: string, tool_input?: Record<string, unknown> }>}
 */
export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

/**
 * ES: Bloquea la acción con un motivo bilingüe que Claude puede leer y corregir.
 * EN: Blocks the action with a bilingual reason that Claude can read and fix.
 * @param {string} ruleId
 * @param {string} reasonEs
 * @param {string} reasonEn
 */
export function block(ruleId, reasonEs, reasonEn) {
  process.stderr.write(`[${ruleId}] ES: ${reasonEs}\n[${ruleId}] EN: ${reasonEn}\n`);
  process.exit(BLOCKING_EXIT_CODE);
}
