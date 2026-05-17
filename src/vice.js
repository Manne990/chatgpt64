import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_VICE_OPTIONS = {
  viceBin: "x64sc",
  host: "127.0.0.1",
  listen: "25232",
  baud: "2400",
  rsDevice: "2",
  userBaudDevice: "1",
  userPortDevice: "2",
  keymap: "",
  keymapMode: "2",
  reset: true,
};

export function resolveViceOptions(args = {}, env = process.env) {
  return {
    viceBin: pick(args.viceBin, env.CHATGPT64_VICE_BIN, DEFAULT_VICE_OPTIONS.viceBin),
    host: pick(args.host, env.CHATGPT64_VICE_HOST, DEFAULT_VICE_OPTIONS.host),
    listen: pick(args.listen, env.CHATGPT64_VICE_LISTEN, DEFAULT_VICE_OPTIONS.listen),
    baud: pick(args.baud, env.CHATGPT64_VICE_BAUD, DEFAULT_VICE_OPTIONS.baud),
    rsDevice: pick(args.rsDevice, env.CHATGPT64_VICE_RS_DEVICE, DEFAULT_VICE_OPTIONS.rsDevice),
    userBaudDevice: pick(args.userBaudDevice, env.CHATGPT64_VICE_USER_BAUD_DEVICE, DEFAULT_VICE_OPTIONS.userBaudDevice),
    userPortDevice: pick(args.userPortDevice, env.CHATGPT64_VICE_USER_PORT_DEVICE, DEFAULT_VICE_OPTIONS.userPortDevice),
    keymap: pick(args.keymap, env.CHATGPT64_VICE_KEYMAP, DEFAULT_VICE_OPTIONS.keymap),
    keymapMode: pick(args.keymapMode, env.CHATGPT64_VICE_KEYMAP_MODE, DEFAULT_VICE_OPTIONS.keymapMode),
    reset: args.noDefault ? false : env.CHATGPT64_VICE_DEFAULT !== "0",
  };
}

export function buildViceArgs(options = {}) {
  const merged = { ...DEFAULT_VICE_OPTIONS, ...options };
  const args = [];

  if (merged.reset) {
    args.push("-default");
  }

  if (merged.keymap) {
    args.push("-symkeymap", expandHome(merged.keymap), "-keymap", String(merged.keymapMode));
  }

  args.push(
    `-rsdev${merged.rsDevice}`,
    `${merged.host}:${merged.listen}`,
    `-rsdev${merged.rsDevice}ip232`,
    "-rsuserbaud",
    String(merged.baud),
    "-rsuserdev",
    String(merged.userBaudDevice),
    "-userportdevice",
    String(merged.userPortDevice),
  );

  return args;
}

export function findViceExecutable(command, {
  applicationsDir = "/Applications",
  envPath = process.env.PATH || "",
  platform = process.platform,
} = {}) {
  const executable = findExecutable(command, envPath, platform);
  if (executable || platform !== "darwin") {
    return executable;
  }

  for (const candidate of macViceCandidates(command, applicationsDir)) {
    if (canRun(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function viceInstallHint(platform = process.platform) {
  if (platform === "darwin") {
    return [
      "VICE x64sc was not found.",
      "",
      "Install VICE, add x64sc to PATH, or pass the executable explicitly:",
      "",
      "  chatgpt64 vice --vice-bin /Applications/vice-arm64-sdl2-3.10/bin/x64sc",
    ].join("\n");
  }

  if (platform === "win32") {
    return [
      "VICE x64sc was not found.",
      "",
      "Install VICE, put x64sc.exe in PATH, or pass --vice-bin C:\\path\\to\\x64sc.exe.",
    ].join("\n");
  }

  return [
    "VICE x64sc was not found.",
    "",
    "Install VICE through your distribution, put x64sc in PATH, or pass --vice-bin /path/to/x64sc.",
  ].join("\n");
}

export function commandLine(command, args) {
  return [quoteShell(command), ...args.map(quoteShell)].join(" ");
}

export function runVice(options = {}, spawnOptions = {}) {
  const merged = { ...DEFAULT_VICE_OPTIONS, ...options };
  const args = buildViceArgs(merged);
  return spawn(merged.viceBin, args, {
    stdio: "inherit",
    ...spawnOptions,
  });
}

function findExecutable(command, envPath, platform) {
  if (!command) {
    return null;
  }

  const expanded = expandHome(command);
  if (expanded.includes("/") || expanded.includes("\\") || path.isAbsolute(expanded)) {
    return canRun(expanded) ? expanded : null;
  }

  const extensions = platform === "win32" ? windowsExtensions(expanded) : [""];
  for (const directory of envPath.split(path.delimiter)) {
    if (!directory) {
      continue;
    }

    for (const extension of extensions) {
      const candidate = path.join(directory, `${expanded}${extension}`);
      if (canRun(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function macViceCandidates(command, applicationsDir) {
  const executable = path.basename(command || DEFAULT_VICE_OPTIONS.viceBin);
  const candidates = [
    path.join(applicationsDir, "VICE.app", "Contents", "Resources", "bin", executable),
  ];

  for (const entry of safeReadDir(applicationsDir)) {
    if (!entry.isDirectory() || !entry.name.toLowerCase().includes("vice")) {
      continue;
    }

    const root = path.join(applicationsDir, entry.name);
    candidates.push(
      path.join(root, "bin", executable),
      path.join(root, "VICE.app", "Contents", "Resources", "bin", executable),
    );
  }

  return candidates;
}

function safeReadDir(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "";
}

function canRun(candidate) {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function windowsExtensions(command) {
  const extension = path.extname(command);
  if (extension) {
    return [""];
  }
  return [".exe", ".cmd", ".bat", ""];
}

function expandHome(value) {
  const text = String(value || "");
  if (text === "~") {
    return process.env.HOME || text;
  }

  if (text.startsWith("~/")) {
    return path.join(process.env.HOME || "~", text.slice(2));
  }

  return text;
}

function quoteShell(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) {
    return text;
  }
  return `'${text.replaceAll("'", "'\\''")}'`;
}
