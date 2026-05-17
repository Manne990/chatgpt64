import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function userConfigDir(platform = process.platform, env = process.env) {
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "chatgpt64");
  }

  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "chatgpt64");
  }

  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "chatgpt64");
}

export function defaultConfigFile() {
  return path.join(userConfigDir(), ".env");
}

export function resolveEnvFile({ explicitPath, cwd = process.cwd(), env = process.env } = {}) {
  if (explicitPath) {
    return path.resolve(cwd, explicitPath);
  }

  if (env.CHATGPT64_ENV_FILE) {
    return path.resolve(cwd, env.CHATGPT64_ENV_FILE);
  }

  const localEnv = path.join(cwd, ".env");
  if (fs.existsSync(localEnv)) {
    return localEnv;
  }

  return defaultConfigFile();
}

export function loadEnvFile(filePath, target = process.env, { override = false } = {}) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  const parsed = parseEnv(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (override || target[key] === undefined) {
      target[key] = value;
    }
  }

  return true;
}

export function parseEnv(value) {
  const env = {};

  for (const rawLine of String(value).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsAt = line.indexOf("=");
    if (equalsAt <= 0) {
      continue;
    }

    const key = line.slice(0, equalsAt).trim();
    let parsedValue = line.slice(equalsAt + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    if (
      (parsedValue.startsWith("\"") && parsedValue.endsWith("\"")) ||
      (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
    ) {
      parsedValue = parsedValue.slice(1, -1);
    }

    env[key] = parsedValue;
  }

  return env;
}

export function writeEnvFile(filePath, values) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const lines = [
    "# chatgpt64 local bridge configuration",
    "# Keep OPENAI_API_KEY private. Do not paste it into C64/Amiga clients.",
    "",
  ];

  for (const [key, value] of Object.entries(values)) {
    lines.push(`${key}=${escapeEnvValue(value)}`);
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, { mode: 0o600 });
}

function escapeEnvValue(value) {
  const text = String(value ?? "");
  if (/^[A-Za-z0-9_./:@-]*$/.test(text)) {
    return text;
  }

  return JSON.stringify(text);
}

