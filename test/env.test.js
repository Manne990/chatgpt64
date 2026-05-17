import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv, resolveEnvFile, userConfigDir } from "../src/env.js";

test("parseEnv reads simple dotenv values", () => {
  assert.deepEqual(
    parseEnv(`
      # comment
      OPENAI_API_KEY=sk-test
      CHATGPT64_TERMINAL="c64"
      BAD LINE
    `),
    {
      OPENAI_API_KEY: "sk-test",
      CHATGPT64_TERMINAL: "c64",
    },
  );
});

test("resolveEnvFile prefers explicit paths", () => {
  assert.equal(resolveEnvFile({
    explicitPath: "custom.env",
    cwd: "/tmp/chatgpt64",
    env: {},
  }), "/tmp/chatgpt64/custom.env");
});

test("userConfigDir uses platform conventions", () => {
  assert.match(userConfigDir("darwin", {}), /Library\/Application Support\/chatgpt64$/);
  assert.match(userConfigDir("linux", { XDG_CONFIG_HOME: "/tmp/config" }), /^\/tmp\/config\/chatgpt64$/);
  assert.match(userConfigDir("win32", { APPDATA: "C:\\Users\\Ada\\AppData\\Roaming" }), /chatgpt64$/);
});

