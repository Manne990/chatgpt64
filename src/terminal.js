import { crlf, toTerminalText, wrapText } from "./format.js";

export const C64 = Object.freeze({
  BLACK: 0x90,
  WHITE: 0x05,
  RED: 0x1c,
  CYAN: 0x9f,
  PURPLE: 0x9c,
  GREEN: 0x1e,
  BLUE: 0x1f,
  YELLOW: 0x9e,
  ORANGE: 0x81,
  BROWN: 0x95,
  LIGHT_RED: 0x96,
  DARK_GRAY: 0x97,
  GRAY: 0x98,
  LIGHT_GREEN: 0x99,
  LIGHT_BLUE: 0x9a,
  LIGHT_GRAY: 0x9b,
  REVERSE_ON: 0x12,
  REVERSE_OFF: 0x92,
  HOME: 0x13,
  CLEAR: 0x93,
});

const STYLE_COLORS = Object.freeze({
  assistant: C64.LIGHT_GREEN,
  banner: C64.CYAN,
  error: C64.LIGHT_RED,
  help: C64.LIGHT_BLUE,
  system: C64.LIGHT_BLUE,
  thinking: C64.YELLOW,
  warning: C64.YELLOW,
});

export function normalizeTerminalMode(value = "ascii") {
  const normalized = String(value || "ascii").trim().toLowerCase();

  if (["c64", "cbm", "commodore", "pet", "petscii"].includes(normalized)) {
    return "c64";
  }

  return "ascii";
}

export function isC64Terminal(value) {
  return normalizeTerminalMode(value) === "c64";
}

export function formatBlock(value, { asciiOnly = true, terminal = "ascii", width = 40 } = {}, style = "assistant") {
  const terminalMode = normalizeTerminalMode(terminal);
  const text = toTerminalText(value, { asciiOnly: asciiOnly || terminalMode === "c64" });
  const wrapped = `${wrapText(text, width)}\r\n`;

  if (terminalMode !== "c64") {
    return crlf(wrapped);
  }

  return c64Bytes([
    STYLE_COLORS[style] || STYLE_COLORS.assistant,
    wrapped,
    C64.WHITE,
  ]);
}

export function formatPrompt({ terminal = "ascii" } = {}) {
  if (!isC64Terminal(terminal)) {
    return "> ";
  }

  return c64Bytes([C64.CYAN, "> ", C64.WHITE]);
}

export function formatClearScreen({ terminal = "ascii" } = {}) {
  if (!isC64Terminal(terminal)) {
    return "\r\n".repeat(25);
  }

  return c64Bytes([C64.CLEAR, C64.WHITE]);
}

export function formatReset({ terminal = "ascii" } = {}) {
  if (!isC64Terminal(terminal)) {
    return "";
  }

  return c64Bytes([C64.REVERSE_OFF, C64.WHITE]);
}

function c64Bytes(parts) {
  const bytes = [];

  for (const part of parts) {
    if (typeof part === "number") {
      bytes.push(part);
      continue;
    }

    for (const char of String(part)) {
      const code = char.codePointAt(0);
      if (code === 10 || code === 13 || (code >= 32 && code <= 126)) {
        bytes.push(code);
      }
    }
  }

  return Buffer.from(bytes);
}

