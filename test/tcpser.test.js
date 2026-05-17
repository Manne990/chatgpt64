import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildTcpserArgs, findExecutable, installHint, resolveTcpserOptions } from "../src/tcpser.js";

test("buildTcpserArgs matches the VICE/CCGMS default chain", () => {
  assert.deepEqual(buildTcpserArgs(), [
    "-v", "25232",
    "-p", "6400",
    "-S", "2400",
    "-l", "4",
    "-is5=20",
    "-n", "6464=127.0.0.1:6464",
  ]);
});

test("resolveTcpserOptions prefers CLI args over env and defaults", () => {
  assert.deepEqual(resolveTcpserOptions(
    { listen: "25233", target: "192.168.1.50:6464" },
    { CHATGPT64_TCPSER_LISTEN: "1111", CHATGPT64_DIAL_NUMBER: "42" },
  ), {
    tcpserBin: "tcpser",
    listen: "25233",
    incomingPort: "6400",
    baud: "2400",
    log: "4",
    init: "s5=20",
    dial: "42",
    target: "192.168.1.50:6464",
  });
});

test("findExecutable locates an executable on PATH", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt64-tcpser-"));
  const executable = path.join(directory, "tcpser");
  fs.writeFileSync(executable, "#!/bin/sh\n");
  fs.chmodSync(executable, 0o755);

  assert.equal(findExecutable("tcpser", directory, "linux"), executable);
});

test("installHint gives macOS Homebrew commands", () => {
  const hint = installHint("darwin");
  assert.match(hint, /brew tap/);
  assert.match(hint, /brew install tcpser/);
});
