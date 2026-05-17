import net from "node:net";
import { readConfig } from "./config.js";
import { OpenAIChat } from "./openai.js";
import { TerminalSession } from "./session.js";

const config = readConfig();
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

server.on("error", (error) => {
  console.error(`server error: ${error.message}`);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  console.log(`chatgpt64 listening on ${config.host}:${config.port}`);
  console.log(`model: ${config.model}`);
  console.log(`terminal: ${config.terminal}, width: ${config.width}`);
  if (!config.apiKey) {
    console.log("warning: OPENAI_API_KEY is not set; chat requests will fail");
  }
});
