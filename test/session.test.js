import assert from "node:assert/strict";
import test from "node:test";
import { TerminalSession } from "../src/session.js";

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

class FakeSocket {
  constructor() {
    this.output = [];
    this.ended = false;
    this.destroyed = false;
  }

  write(value) {
    this.output.push(String(value));
  }

  end() {
    this.ended = true;
  }
}

function count(value, needle) {
  return value.split(needle).length - 1;
}

