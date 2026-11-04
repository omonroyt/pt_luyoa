/**
 * ES: Extrae los comentarios de un archivo JavaScript o TypeScript sin
 *     confundirlos con texto dentro de strings, templates o expresiones regulares.
 *     No depende del compilador para funcionar igual con cualquier versión de TypeScript.
 * EN: Extracts the comments of a JavaScript or TypeScript file without
 *     confusing them with text inside strings, templates or regular expressions.
 *     It does not depend on the compiler so it works with any TypeScript version.
 */

export type ScannedComment = {
  kind: "line" | "block";
  text: string;
  startLine: number;
  endLine: number;
  ownLine: boolean;
};

// ES: Caracteres tras los cuales una "/" inicia una expresión regular y no una división.
// EN: Characters after which a "/" starts a regular expression instead of a division.
const REGEX_PRECEDERS = new Set([
  "",
  "(",
  ",",
  "=",
  ":",
  "[",
  "!",
  "&",
  "|",
  "?",
  "{",
  "}",
  ";",
  "+",
  "-",
  "*",
  "%",
  "<",
  ">",
  "~",
  "^",
]);
const REGEX_KEYWORDS = /\b(return|typeof|case|do|else|in|of|void|yield|await)$/;

type ScanState = {
  source: string;
  index: number;
  line: number;
  lastSignificant: string;
  comments: ScannedComment[];
};

function advance(state: ScanState, steps = 1): void {
  for (let step = 0; step < steps; step += 1) {
    if (state.source[state.index] === "\n") state.line += 1;
    state.index += 1;
  }
}

function isLineStart(state: ScanState, position: number): boolean {
  const lineBegin = state.source.lastIndexOf("\n", position - 1) + 1;
  return state.source.slice(lineBegin, position).trim() === "";
}

function readLineComment(state: ScanState): void {
  const start = state.index;
  const startLine = state.line;
  const ownLine = isLineStart(state, start);
  const end = state.source.indexOf("\n", start);
  const stop = end === -1 ? state.source.length : end;
  state.comments.push({
    kind: "line",
    text: state.source.slice(start + 2, stop),
    startLine,
    endLine: startLine,
    ownLine,
  });
  advance(state, stop - start);
}

function readBlockComment(state: ScanState): void {
  const start = state.index;
  const startLine = state.line;
  const ownLine = isLineStart(state, start);
  const end = state.source.indexOf("*/", start + 2);
  const stop = end === -1 ? state.source.length : end + 2;
  const text = state.source.slice(start + 2, end === -1 ? stop : end);
  advance(state, stop - start);
  state.comments.push({ kind: "block", text, startLine, endLine: state.line, ownLine });
}

function skipQuoted(state: ScanState, quote: string): void {
  advance(state);
  while (state.index < state.source.length && state.source[state.index] !== quote) {
    if (state.source[state.index] === "\\") advance(state);
    if (quote !== "`" && state.source[state.index] === "\n") return;
    advance(state);
  }
  advance(state);
}

function skipRegex(state: ScanState): void {
  advance(state);
  let inClass = false;
  while (state.index < state.source.length && state.source[state.index] !== "\n") {
    const char = state.source[state.index];
    if (char === "\\") advance(state);
    else if (char === "[") inClass = true;
    else if (char === "]") inClass = false;
    else if (char === "/" && !inClass) break;
    advance(state);
  }
  advance(state);
}

function startsRegex(state: ScanState): boolean {
  const before = state.source.slice(Math.max(0, state.index - 12), state.index).trimEnd();
  return REGEX_PRECEDERS.has(state.lastSignificant) || REGEX_KEYWORDS.test(before);
}

const QUOTES = new Set(['"', "'", "`"]);

/**
 * ES: Atiende una "/" en código: comentario de línea, de bloque, regex o división.
 * EN: Handles a "/" in code: line comment, block comment, regex or division.
 */
function scanSlash(state: ScanState): void {
  const next = state.source[state.index + 1];
  if (next === "/") return readLineComment(state);
  if (next === "*") return readBlockComment(state);
  if (startsRegex(state)) skipRegex(state);
  else advance(state);
  state.lastSignificant = "/";
}

function scanToken(state: ScanState): void {
  const char = state.source[state.index] ?? "";
  if (char === "/") return scanSlash(state);
  if (QUOTES.has(char)) skipQuoted(state, char);
  else advance(state);
  if (char.trim() !== "") state.lastSignificant = char;
}

/**
 * ES: Devuelve todos los comentarios del código fuente, en orden.
 * EN: Returns every comment of the source code, in order.
 */
export function scanComments(source: string): ScannedComment[] {
  const state: ScanState = { source, index: 0, line: 1, lastSignificant: "", comments: [] };
  if (source.startsWith("#!")) advance(state, source.indexOf("\n") + 1 || source.length);
  while (state.index < source.length) scanToken(state);
  return state.comments;
}
