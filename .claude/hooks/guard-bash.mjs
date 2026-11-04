/**
 * ES: Hook PreToolUse para la herramienta Bash: bloquea comandos que violan
 *     las reglas de autoría, secretos y flujo de git (ver CLAUDE.md §3 y §7).
 * EN: PreToolUse hook for the Bash tool: blocks commands that break the
 *     authorship, secrets and git workflow rules (see CLAUDE.md §3 and §7).
 */
import { BASH_RULES } from "./lib/bash-rules.mjs";
import { block, readHookInput } from "./lib/hook-io.mjs";

const event = await readHookInput();
const command = String(event.tool_input?.command ?? "");

for (const rule of BASH_RULES) {
  if (rule.test(command)) block(rule.id, rule.es, rule.en);
}
