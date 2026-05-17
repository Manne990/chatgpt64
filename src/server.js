import { readConfig } from "./config.js";
import { startBridge } from "./bridge.js";
import { loadEnvFile, resolveEnvFile } from "./env.js";

loadEnvFile(resolveEnvFile());
startBridge(readConfig());
