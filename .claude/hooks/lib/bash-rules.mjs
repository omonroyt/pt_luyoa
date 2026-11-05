/**
 * ES: Reglas que revisan los comandos de terminal antes de ejecutarlos.
 *     Cada regla devuelve true cuando el comando debe bloquearse.
 * EN: Rules that review shell commands before they run.
 *     Each rule returns true when the command must be blocked.
 */

const CONVENTIONAL_SUBJECT =
  /^(feat|fix|refactor|perf|test|docs|style|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: \S.*$/;

const AI_ATTRIBUTION = /co-authored-by:|generated with|generado con|noreply@anthropic\.com|🤖/i;

const SECRET_READERS =
  /(^|[\s;&|(])(cat|type|less|more|head|tail|bat|nl|strings|xxd|od|cp|mv|scp|base64|source|Get-Content|gc)\s/i;

const ENV_FILE_TOKEN = /(?:^|[\s"'=/\\<])(\.env(?:\.[\w.-]+)?)(?=$|[\s"';&|)])/g;

const SECRET_VARIABLE_PRINT =
  /\b(echo|printf|print|Write-Output|Write-Host)\b[^;&|]*\$\{?(env:)?(LUYOA_API_KEY\w*|OPENROUTER_API_KEY|APPROVAL_SECRET|MCP_SERVICE_TOKEN\w*|CRON_SECRET|DATABASE_AUTH_TOKEN|LANGFUSE_SECRET_KEY)/i;

/**
 * ES: Devuelve los archivos .env mencionados en el comando, excepto la plantilla.
 * EN: Returns the .env files mentioned in the command, except the template.
 * @param {string} command
 */
function findSecretEnvFiles(command) {
  return [...command.matchAll(ENV_FILE_TOKEN)]
    .map((match) => match[1])
    .filter((fileName) => fileName !== ".env.example");
}

/**
 * ES: Extrae el asunto de un `git commit -m`, incluido el formato heredoc.
 *     Devuelve null si no se puede extraer; entonces decide el hook commit-msg.
 * EN: Extracts the subject of a `git commit -m`, including the heredoc form.
 *     Returns null when it cannot be extracted; the commit-msg hook decides then.
 * @param {string} command
 */
export function extractCommitSubject(command) {
  const heredoc = command.match(/<<-?\s*['"]?(\w+)['"]?\s*\n\s*([^\n]+)/);
  if (heredoc) return heredoc[2].trim();
  const inline = command.match(/\s-m\s+(["'])([^"'\n]+)/);
  return inline ? inline[2].trim() : null;
}

/** @type {Array<{ id: string, test: (command: string) => boolean, es: string, en: string }>} */
export const BASH_RULES = [
  {
    id: "secret-file-read",
    test: (command) => SECRET_READERS.test(command) && findSecretEnvFiles(command).length > 0,
    es: "No se leen ni copian archivos .env. Usa .env.example para conocer las variables.",
    en: "Do not read or copy .env files. Use .env.example to learn the variables.",
  },
  {
    id: "secret-variable-print",
    test: (command) =>
      /\bprintenv\b|^\s*env\s*($|\|)/m.test(command) || SECRET_VARIABLE_PRINT.test(command),
    es: "No se imprimen variables de entorno con secretos.",
    en: "Do not print environment variables that hold secrets.",
  },
  {
    id: "hook-bypass",
    test: (command) =>
      /\bgit\s+(commit|push|merge|rebase|am)\b[^;&|]*\s--no-verify\b/.test(command) ||
      /\bgit\s+commit\b[^;&|]*\s-[a-zA-Z]*n\b/.test(command),
    es: "Prohibido saltarse los hooks (--no-verify). Corrige la causa del bloqueo.",
    en: "Bypassing hooks (--no-verify) is forbidden. Fix the cause of the failure.",
  },
  {
    id: "force-push",
    test: (command) => /\bgit\s+push\b[^;&|]*\s(--force(?!-with-lease)\b|-f\b)/.test(command),
    es: "Push forzado prohibido. En ramas de feature se permite --force-with-lease, solo si el desarrollador lo pide.",
    en: "Force push is forbidden. On feature branches --force-with-lease is allowed, only if the developer asks.",
  },
  {
    id: "git-identity-change",
    test: (command) =>
      /\bgit\s+config\b[^;&|]*\buser\.(name|email)\s+[^\s;&|-]/.test(command) ||
      /\bgit\s+commit\b[^;&|]*\s--author\b/.test(command),
    es: "La identidad de git es la del desarrollador responsable y no se modifica.",
    en: "The git identity belongs to the responsible developer and must not be changed.",
  },
  {
    id: "ai-attribution",
    test: (command) =>
      /\b(git\s+(commit|tag)|gh\s+(pr|release))\b/.test(command) && AI_ATTRIBUTION.test(command),
    es: "Sin atribución a IA en commits, tags, PRs ni releases: el autor es el desarrollador responsable.",
    en: "No AI attribution in commits, tags, PRs or releases: the author is the responsible developer.",
  },
  {
    id: "conventional-commit",
    test: (command) => {
      if (!/\bgit\s+commit\b/.test(command)) return false;
      const subject = extractCommitSubject(command);
      return subject !== null && !CONVENTIONAL_SUBJECT.test(subject);
    },
    es: "El mensaje no sigue Conventional Commits: tipo(alcance): descripción. Ver docs/standards/git-workflow.md.",
    en: "The message does not follow Conventional Commits: type(scope): description. See docs/standards/git-workflow.md.",
  },
];
