import assert from "node:assert/strict";
import test from "node:test";
import { buildInstructions, extractOutputText } from "../src/openai.js";
import { toTerminalText, wrapText } from "../src/format.js";

test("wrapText wraps words to the configured width", () => {
  assert.equal(
    wrapText("hello commodore world", 12),
    "hello\r\ncommodore\r\nworld",
  );
});

test("wrapText splits words longer than the configured width", () => {
  assert.equal(wrapText("supercalifragilistic", 8), "supercal\r\nifragili\r\nstic");
});

test("toTerminalText transliterates accented characters", () => {
  assert.equal(toTerminalText("R\u00e4ksm\u00f6rg\u00e5s - test", { asciiOnly: true }), "Raksmorgas - test");
});

test("extractOutputText handles Responses API output items", () => {
  assert.equal(
    extractOutputText({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: "Hello C64",
            },
          ],
        },
      ],
    }),
    "Hello C64",
  );
});

test("buildInstructions defaults to C64-friendly short answers", () => {
  const instructions = buildInstructions();
  assert.match(instructions, /no scrollback/);
  assert.match(instructions, /max 8 short lines/);
});
