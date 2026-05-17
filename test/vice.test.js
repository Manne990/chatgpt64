import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildViceArgs, findViceExecutable, resolveViceOptions, viceInstallHint } from "../src/vice.js";

test("buildViceArgs matches the default VICE tcpser chain", () => {
  assert.deepEqual(buildViceArgs(), [
    "-default",
    "-rsdev2", "127.0.0.1:25232",
    "-rsdev2ip232",
    "-rsuserbaud", "2400",
    "-rsuserdev", "1",
    "-userportdevice", "2",
  ]);
});

test("buildViceArgs includes symbolic keymap when configured", () => {
  assert.deepEqual(buildViceArgs({ keymap: "/tmp/se.vkm", keymapMode: "2" }), [
    "-default",
    "-symkeymap", "/tmp/se.vkm",
    "-keymap", "2",
    "-rsdev2", "127.0.0.1:25232",
    "-rsdev2ip232",
    "-rsuserbaud", "2400",
    "-rsuserdev", "1",
    "-userportdevice", "2",
  ]);
});

test("resolveViceOptions prefers CLI args over env and defaults", () => {
  assert.deepEqual(resolveViceOptions(
    { listen: "25233", keymap: "/tmp/custom.vkm" },
    { CHATGPT64_VICE_LISTEN: "1111", CHATGPT64_VICE_BAUD: "1200" },
  ), {
    viceBin: "x64sc",
    host: "127.0.0.1",
    listen: "25233",
    baud: "1200",
    rsDevice: "2",
    userBaudDevice: "1",
    userPortDevice: "2",
    keymap: "/tmp/custom.vkm",
    keymapMode: "2",
    reset: true,
  });
});

test("findViceExecutable locates VICE in a macOS application bundle layout", () => {
  const applicationsDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt64-vice-"));
  const executable = path.join(applicationsDir, "vice-test", "bin", "x64sc");
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(executable, "#!/bin/sh\n");
  fs.chmodSync(executable, 0o755);

  assert.equal(findViceExecutable("x64sc", {
    applicationsDir,
    envPath: "",
    platform: "darwin",
  }), executable);
});

test("viceInstallHint mentions --vice-bin", () => {
  assert.match(viceInstallHint("darwin"), /--vice-bin/);
});
