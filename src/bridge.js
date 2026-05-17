import net from "node:net";
import { readConfig } from "./config.js";
import { OpenAIChat } from "./openai.js";
import { TerminalSession } from "./session.js";

export function createBridgeServer(config = readConfig()) {
  const chat = new OpenAIChat({
    apiKey: config.apiKey,
    model: config.model,
  });

  const server = net.createServer((socket) => {
    socket.setEncoding("binary");
    socket.setKeepAlive(true);

    const session = new TerminalSession({ socket, chat, config });
    session.start();

    socket.on("data", (data) => {
      session.receive(Buffer.from(data, "binary"));
    });

    socket.on("error", (error) => {
      console.error(`socket error: ${error.message}`);
    });
  });

  return server;
}

export function startBridge(config = readConfig(), { logger = console } = {}) {
  const server = createBridgeServer(config);

  server.on("error", (error) => {
    logger.error(`server error: ${error.message}`);
    process.exitCode = 1;
  });

  server.listen(config.port, config.host, () => {
    logger.log(`chatgpt64 bridge listening on ${config.host}:${config.port}`);
    logger.log(`model: ${config.model}`);
    logger.log(`terminal: ${config.terminal}, width: ${config.width}`);
    if (!config.apiKey) {
      logger.log("warning: OPENAI_API_KEY is not set; chat requests will fail");
    }
  });

  return server;
}

