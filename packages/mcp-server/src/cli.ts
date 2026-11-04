#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config";
import { createServer } from "./server";

// ES: Transporte stdio para conectar el MCP a Claude Desktop o al Inspector de MCP.
//     Por stdio solo viajan mensajes del protocolo; los registros van a stderr.
// EN: Stdio transport to connect the MCP to Claude Desktop or the MCP Inspector.
//     Only protocol messages travel over stdio; logs go to stderr.
const server = createServer(loadConfig());
await server.connect(new StdioServerTransport());
console.error("Servidor MCP de Café Alborada escuchando por stdio");
