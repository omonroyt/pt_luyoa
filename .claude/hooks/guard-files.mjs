/**
 * ES: Hook PreToolUse para lectura y edición de archivos: impide tocar
 *     archivos de secretos y los internos de git.
 * EN: PreToolUse hook for file reads and edits: prevents touching secret
 *     files and git internals.
 */
import path from "node:path";
import { block, readHookInput } from "./lib/hook-io.mjs";

const SECRET_FILE = /^\.env(\..+)?$/;
const ALLOWED_TEMPLATE = ".env.example";

const event = await readHookInput();
const filePath = String(event.tool_input?.file_path ?? event.tool_input?.notebook_path ?? "");
const fileName = path.basename(filePath);
const pathSegments = filePath.split(/[\\/]/);

if (SECRET_FILE.test(fileName) && fileName !== ALLOWED_TEMPLATE) {
  block(
    "secret-file-access",
    `No se lee ni se edita ${fileName}. Usa .env.example para conocer las variables.`,
    `Do not read or edit ${fileName}. Use .env.example to learn the variables.`,
  );
}

if (pathSegments.includes(".git")) {
  block(
    "git-internals",
    "No se editan archivos internos de .git; usa comandos de git.",
    "Do not edit .git internals; use git commands.",
  );
}
