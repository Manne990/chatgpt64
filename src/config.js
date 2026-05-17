import process from "node:process";
import { normalizeTerminalMode } from "./terminal.js";

export function readConfig(env = process.env) {
  return {
    host: env.CHATGPT64_HOST || "0.0.0.0",
    port: readInt(env.CHATGPT64_PORT, 6464),
    model: env.OPENAI_MODEL || "gpt-5.5",
    apiKey: env.OPENAI_API_KEY || "",
    width: readInt(env.CHATGPT64_WIDTH, 40),
    terminal: normalizeTerminalMode(env.CHATGPT64_TERMINAL),
    maxInput: readInt(env.CHATGPT64_MAX_INPUT, 1200),
    asciiOnly: env.CHATGPT64_ASCII_ONLY !== "0",
    echo: env.CHATGPT64_ECHO !== "0",
    charDelayMs: readInt(env.CHATGPT64_CHAR_DELAY_MS, 0),
  };
}

function readInt(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
