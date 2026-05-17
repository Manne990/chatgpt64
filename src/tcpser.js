import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_TCPSER_OPTIONS = {
  tcpserBin: "tcpser",
  listen: "25232",
  incomingPort: "6400",
  baud: "2400",
  log: "4",
  init: "s5=20",
  dial: "6464",
  target: "127.0.0.1:6464",
};

export function resolveTcpserOptions(args = {}, env = process.env) {
  return {
    tcpserBin: pick(args.tcpserBin, env.CHATGPT64_TCPSER_BIN, DEFAULT_TCPSER_OPTIONS.tcpserBin),
    listen: pick(args.listen, env.CHATGPT64_TCPSER_LISTEN, DEFAULT_TCPSER_OPTIONS.listen),
    incomingPort: pick(args.incomingPort, env.CHATGPT64_TCPSER_INCOMING_PORT, DEFAULT_TCPSER_OPTIONS.incomingPort),
    baud: pick(args.baud, env.CHATGPT64_TCPSER_BAUD, DEFAULT_TCPSER_OPTIONS.baud),
    log: pick(args.log, env.CHATGPT64_TCPSER_LOG, DEFAULT_TCPSER_OPTIONS.log),
    init: pick(args.init, env.CHATGPT64_TCPSER_INIT, DEFAULT_TCPSER_OPTIONS.init),
    dial: pick(args.dial, env.CHATGPT64_DIAL_NUMBER, DEFAULT_TCPSER_OPTIONS.dial),
    target: pick(args.target, env.CHATGPT64_TCPSER_TARGET, DEFAULT_TCPSER_OPTIONS.target),
  };
}

export function buildTcpserArgs(options = {}) {
  const merged = { ...DEFAULT_TCPSER_OPTIONS, ...options };
  const args = [
    "-v", String(merged.listen),
    "-p", String(merged.incomingPort),
    "-S", String(merged.baud),
    "-l", String(merged.log),
  ];

  if (merged.init) {
    args.push(`-i${merged.init}`);
  }

  args.push("-n", `${merged.dial}=${merged.target}`);
  return args;
}

export function commandLine(command, args) {
  return [quoteShell(command), ...args.map(quoteShell)].join(" ");
}

export function findExecutable(command, envPath = process.env.PATH || "", platform = process.platform) {
  if (!command) {
    return null;
  }

  if (command.includes("/") || command.includes("\\") || path.isAbsolute(command)) {
    return canRun(command) ? command : null;
  }

  const extensions = platform === "win32" ? windowsExtensions(command) : [""];
  for (const directory of envPath.split(path.delimiter)) {
    if (!directory) {
      continue;
    }

    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (canRun(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function installHint(platform = process.platform) {
  if (platform === "darwin") {
    return [
      "tcpser is missing. Install it with Homebrew:",
      "",
      "  brew tap rickard-von-essen/formulae",
      "  brew install tcpser",
    ].join("\n");
  }

  if (platform === "win32") {
    return [
      "tcpser is missing.",
      "",
      "Windows support varies between tcpser builds. Run tcpser through WSL, or put tcpser.exe in PATH",
      "and optionally point to it with --tcpser-bin C:\\path\\to\\tcpser.exe.",
      "",
      "Upstream: https://github.com/go4retro/tcpser",
    ].join("\n");
  }

  return [
    "tcpser is missing.",
    "",
    "Install it through your distribution if a package exists, or build it from upstream:",
    "",
    "  https://github.com/go4retro/tcpser",
    "",
    "Arch has AUR packages, and Debian/Ubuntu releases may have packages depending on the release.",
  ].join("\n");
}

export function runTcpser(options = {}, spawnOptions = {}) {
  const merged = { ...DEFAULT_TCPSER_OPTIONS, ...options };
  const args = buildTcpserArgs(merged);
  return spawn(merged.tcpserBin, args, {
    stdio: "inherit",
    ...spawnOptions,
  });
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

function quoteShell(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) {
    return text;
  }
  return `'${text.replaceAll("'", "'\\''")}'`;
}
