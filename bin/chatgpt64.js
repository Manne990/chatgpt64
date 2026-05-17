#!/usr/bin/env node
import os from "node:os";
import fs from "node:fs";
import process from "node:process";
import readline from "node:readline/promises";
import { readConfig } from "../src/config.js";
import { startBridge } from "../src/bridge.js";
import { defaultConfigFile, loadEnvFile, resolveEnvFile, writeEnvFile } from "../src/env.js";
import { buildTcpserArgs, commandLine, findExecutable, installHint, resolveTcpserOptions, runTcpser } from "../src/tcpser.js";
import { normalizeTerminalMode } from "../src/terminal.js";

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || "start";

try {
  if (command === "help" || args.help) {
    printHelp();
  } else if (command === "start" || command === "serve") {
    runStart(args);
  } else if (command === "setup" || command === "init") {
    await runSetup(args);
  } else if (command === "doctor") {
    runDoctor(args);
  } else if (command === "tcpser") {
    await runTcpserCommand(args);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function runStart(args) {
  const envFile = resolveEnvFile({ explicitPath: args.env });
  loadEnvFile(envFile);
  applyCliEnv(args);

  const config = readConfig();
  console.log(`config: ${envFile}`);
  printConnectHints(config);
  startBridge(config);
}

async function runSetup(args) {
  const envFile = args.env ? resolveEnvFile({ explicitPath: args.env }) : defaultConfigFile();
  const scriptedAnswers = process.stdin.isTTY ? null : fs.readFileSync(0, "utf8").split(/\r?\n/);
  const rl = scriptedAnswers ? null : readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("chatgpt64 setup");
    console.log(`config file: ${envFile}`);
    console.log("Paste an OpenAI API key. Input is visible in this terminal.");

    const apiKey = await ask(rl, scriptedAnswers, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || "");
    const port = await ask(rl, scriptedAnswers, "Port", "6464");
    const terminal = normalizeTerminalMode(await ask(rl, scriptedAnswers, "Terminal mode (ascii/c64)", "c64"));
    const width = await ask(rl, scriptedAnswers, "Width", terminal === "c64" ? "40" : "80");

    writeEnvFile(envFile, {
      OPENAI_API_KEY: apiKey,
      CHATGPT64_HOST: "0.0.0.0",
      CHATGPT64_PORT: port,
      OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5.5",
      CHATGPT64_WIDTH: width,
      CHATGPT64_TERMINAL: terminal,
      CHATGPT64_MAX_INPUT: "1200",
      CHATGPT64_ASCII_ONLY: "1",
      CHATGPT64_ECHO: "1",
      CHATGPT64_CHAR_DELAY_MS: "0",
    });

    console.log("");
    console.log("Saved.");
    console.log(`Start with: chatgpt64 start --env "${envFile}"`);
  } finally {
    rl?.close();
  }
}

function runDoctor(args) {
  const envFile = resolveEnvFile({ explicitPath: args.env });
  const loaded = loadEnvFile(envFile);
  applyCliEnv(args);
  const config = readConfig();
  const tcpserOptions = resolveTcpserOptions(args);
  const tcpserPath = findExecutable(tcpserOptions.tcpserBin);

  console.log("chatgpt64 doctor");
  console.log(`node: ${process.version}`);
  console.log(`config: ${envFile} (${loaded ? "loaded" : "missing"})`);
  console.log(`api key: ${config.apiKey ? "present" : "missing"}`);
  console.log(`listen: ${config.host}:${config.port}`);
  console.log(`terminal: ${config.terminal}, width: ${config.width}`);
  console.log(`tcpser: ${tcpserPath || "missing"}`);
  console.log(`tcpser command: ${commandLine(tcpserOptions.tcpserBin, buildTcpserArgs(tcpserOptions))}`);
  printConnectHints(config);
}

async function runTcpserCommand(args) {
  const options = resolveTcpserOptions(args);
  const tcpserPath = findExecutable(options.tcpserBin);

  if (!tcpserPath) {
    console.error(installHint());
    process.exitCode = 1;
    return;
  }

  const resolvedOptions = { ...options, tcpserBin: tcpserPath };
  console.log(`starting: ${commandLine(resolvedOptions.tcpserBin, buildTcpserArgs(resolvedOptions))}`);
  console.log(`CCGMS dial: ATDT${resolvedOptions.dial}`);
  const child = runTcpser(resolvedOptions);

  await new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(`tcpser failed: ${error.message}`);
      process.exitCode = 1;
      resolve();
    });
    child.once("exit", (code, signal) => {
      if (signal) {
        console.error(`tcpser stopped by ${signal}`);
        process.exitCode = 1;
      } else {
        process.exitCode = code ?? 0;
      }
      resolve();
    });
  });
}

function applyCliEnv(args) {
  const mappings = {
    host: "CHATGPT64_HOST",
    port: "CHATGPT64_PORT",
    model: "OPENAI_MODEL",
    terminal: "CHATGPT64_TERMINAL",
    width: "CHATGPT64_WIDTH",
  };

  for (const [argName, envName] of Object.entries(mappings)) {
    if (args[argName] !== undefined) {
      process.env[envName] = String(args[argName]);
    }
  }
}

async function ask(rl, scriptedAnswers, label, fallback) {
  const suffix = fallback ? ` [${fallback}]` : "";
  if (scriptedAnswers) {
    const answer = scriptedAnswers.shift()?.trim() || fallback;
    console.log(`${label}${suffix}: ${label === "OPENAI_API_KEY" && answer ? "[provided]" : answer}`);
    return answer;
  }

  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || fallback;
}

function printConnectHints(config) {
  const addresses = localAddresses();
  if (addresses.length === 0) {
    console.log(`connect: ATDT<host-ip>:${config.port}`);
    return;
  }

  console.log("connect examples:");
  for (const address of addresses.slice(0, 3)) {
    console.log(`  ATDT${address}:${config.port}`);
  }
}

function localAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    if (inlineValue !== undefined) {
      result[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      result[key] = argv[index + 1];
      index += 1;
    } else {
      result[key] = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`chatgpt64 bridge

Usage:
  chatgpt64 setup [--env path]
  chatgpt64 start [--env path] [--host 0.0.0.0] [--port 6464] [--terminal ascii|c64] [--width 40]
  chatgpt64 tcpser [--listen 25232] [--dial 6464] [--target 127.0.0.1:6464]
  chatgpt64 doctor [--env path]

Commands:
  setup   Create a local bridge configuration file.
  start   Start the raw TCP bridge.
  tcpser  Start tcpser for VICE/CCGMS modem emulation.
  doctor  Show configuration and connection hints.

The OpenAI API key stays on this machine in the bridge configuration.
Retro clients only connect to the bridge over TCP.`);
}
