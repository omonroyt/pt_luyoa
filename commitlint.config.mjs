/**
 * ES: Reglas de mensajes de commit: Conventional Commits con los tipos y alcances
 *     del proyecto, y ninguna atribución a herramientas de IA (docs/standards/git-workflow.md).
 * EN: Commit message rules: Conventional Commits with the project types and scopes,
 *     and no attribution to AI tools (docs/standards/git-workflow.md).
 */

const TYPES = [
  "feat",
  "fix",
  "refactor",
  "perf",
  "test",
  "docs",
  "style",
  "build",
  "ci",
  "chore",
  "revert",
];

const SCOPES = [
  "mcp",
  "shared",
  "agent",
  "web",
  "approvals",
  "db",
  "evals",
  "docs",
  "governance",
  "harness",
  "ci",
  "deps",
  "config",
  "repo",
];

const AI_ATTRIBUTION = /co-authored-by:|generated with|generado con|noreply@anthropic\.com|🤖/i;

/**
 * ES: Regla propia: rechaza trailers o frases que atribuyan el commit a una IA.
 * EN: Custom rule: rejects trailers or phrases that attribute the commit to an AI.
 * @param {{ raw?: string }} commit
 * @returns {[boolean, string]}
 */
function noAiAttribution(commit) {
  const isClean = !AI_ATTRIBUTION.test(commit.raw ?? "");
  return [
    isClean,
    "ES: el autor es el desarrollador responsable; quita Co-Authored-By y menciones a IA. " +
      "EN: the author is the responsible developer; remove Co-Authored-By and AI mentions.",
  ];
}

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [{ rules: { "no-ai-attribution": noAiAttribution } }],
  rules: {
    "type-enum": [2, "always", TYPES],
    "scope-enum": [2, "always", SCOPES],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
    "no-ai-attribution": [2, "always"],
  },
};
