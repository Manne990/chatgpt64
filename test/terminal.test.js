import assert from "node:assert/strict";
import test from "node:test";
import {
  C64,
  formatBackspace,
  formatBlock,
  formatClearScreen,
  formatPrompt,
  formatWelcomeBanner,
  normalizeTerminalMode,
  toC64TextBytes,
} from "../src/terminal.js";

test("normalizeTerminalMode accepts common C64 aliases", () => {
  assert.equal(normalizeTerminalMode("petscii"), "c64");
  assert.equal(normalizeTerminalMode("commodore"), "c64");
  assert.equal(normalizeTerminalMode("ansi"), "ascii");
});

test("formatBlock keeps ASCII mode plain", () => {
  assert.equal(
    formatBlock("Hello färg", { asciiOnly: true, terminal: "ascii", width: 40 }),
    "Hello farg\r\n",
  );
});

test("formatBlock emits C64 color control bytes in C64 mode", () => {
  const output = formatBlock("Hello C64", { terminal: "c64", width: 40 }, "assistant");

  assert.equal(Buffer.isBuffer(output), true);
  assert.equal(output[0], C64.LIGHT_GREEN);
  assert.deepEqual([...output.subarray(1, -1)], [...toC64TextBytes("Hello C64\r\n")]);
  assert.equal(output.at(-1), C64.WHITE);
});

test("toC64TextBytes maps ASCII case to PETSCII display case", () => {
  assert.deepEqual([...toC64TextBytes("Nice C64")], [
    0xce,
    0x49,
    0x43,
    0x45,
    0x20,
    0xc3,
    0x36,
    0x34,
  ]);
});

test("formatWelcomeBanner emits plain ASCII fallback", () => {
  const output = formatWelcomeBanner({ terminal: "ascii", width: 40 });

  assert.match(output, /CHATGPT\/64/);
  assert.match(output, /OPENAI TERMINAL BRIDGE/);
  assert.equal(output.includes(String.fromCharCode(C64.CLEAR)), false);
});

test("formatWelcomeBanner emits PETSCII-style graphics in C64 mode", () => {
  const output = formatWelcomeBanner({ terminal: "c64", width: 40 });

  assert.equal(Buffer.isBuffer(output), true);
  assert.equal(output[0], C64.CLEAR);
  assert.equal(output.includes(C64.REVERSE_ON), true);
  assert.equal(output.includes(C64.REVERSE_OFF), true);
  assert.equal(output.includes(toC64TextBytes("CHATGPT/64")), true);
});

test("formatPrompt colors the C64 prompt and resets input to white", () => {
  assert.deepEqual([...formatPrompt({ terminal: "c64" })], [C64.CYAN, 62, 32, C64.WHITE]);
});

test("formatBackspace emits PETSCII delete in C64 mode", () => {
  assert.equal(formatBackspace({ terminal: "ascii" }), "\b \b");
  assert.deepEqual([...formatBackspace({ terminal: "c64" })], [C64.DELETE]);
});

test("formatClearScreen emits C64 clear-screen control byte", () => {
  assert.deepEqual([...formatClearScreen({ terminal: "c64" })], [C64.CLEAR, C64.WHITE]);
});
