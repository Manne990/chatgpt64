import assert from "node:assert/strict";
import test from "node:test";
import { TerminalSession } from "../src/session.js";
import { C64, toC64TextBytes } from "../src/terminal.js";

test("TerminalSession treats CRLF as one submitted line", () => {
  const socket = new FakeSocket();
  const session = new TerminalSession({
    socket,
    chat: {},
    config: {
      apiKey: "test",
      asciiOnly: true,
      charDelayMs: 0,
      echo: true,
      maxInput: 1200,
      model: "test-model",
      width: 40,
    },
  });

  session.start();
  session.receive(Buffer.from("/help\r\n/quit\r\n", "ascii"));

  const output = socket.output.join("");
  assert.equal(count(output, "> "), 2);
  assert.equal(socket.ended, true);
});

test("TerminalSession starts in short mode", () => {
  const socket = new FakeSocket();
  const session = new TerminalSession({
    socket,
    chat: {},
    config: {
      apiKey: "test",
      asciiOnly: true,
      charDelayMs: 0,
      echo: true,
      maxInput: 1200,
      model: "test-model",
      width: 40,
    },
  });

  assert.equal(session.mode, "short");
});

test("TerminalSession can switch to C64 color mode", () => {
  const socket = new FakeSocket();
  const session = new TerminalSession({
    socket,
    chat: {},
    config: {
      apiKey: "test",
      asciiOnly: true,
      charDelayMs: 0,
      echo: true,
      maxInput: 1200,
      model: "test-model",
      terminal: "ascii",
      width: 40,
    },
  });

  session.receive(Buffer.from("/c64\r\n", "ascii"));

  assert.equal(session.terminal, "c64");
  assert.equal(socket.output.some((chunk) => Buffer.isBuffer(chunk)), true);
});

test("TerminalSession shows a C64 banner after switching to C64 mode", () => {
  const socket = new FakeSocket();
  const session = new TerminalSession({
    socket,
    chat: {},
    config: {
      apiKey: "test",
      asciiOnly: true,
      charDelayMs: 0,
      echo: true,
      maxInput: 1200,
      model: "test-model",
      terminal: "ascii",
      width: 40,
    },
  });

  session.receive(Buffer.from("/c64\r\n", "ascii"));

  const banner = socket.output.find((chunk) => Buffer.isBuffer(chunk) && chunk[0] === C64.CLEAR);
  assert.ok(banner);
  assert.equal(banner.includes(toC64TextBytes("CHATGPT/64")), true);
});

test("TerminalSession treats PETSCII delete as backspace in C64 mode", () => {
  const socket = new FakeSocket();
  const session = new TerminalSession({
    socket,
    chat: {},
    config: {
      apiKey: "test",
      asciiOnly: true,
      charDelayMs: 0,
      echo: true,
      maxInput: 1200,
      model: "test-model",
      terminal: "c64",
      width: 40,
    },
  });

  session.receive(Buffer.from([65, 66, C64.DELETE]));

  assert.equal(session.line, "A");
  assert.deepEqual([...socket.output.at(-1)], [C64.DELETE]);
});

class FakeSocket {
  constructor() {
    this.output = [];
    this.ended = false;
    this.destroyed = false;
  }

  write(value) {
    this.output.push(value);
  }

  end() {
    this.ended = true;
  }
}

function count(value, needle) {
  return value.split(needle).length - 1;
}
