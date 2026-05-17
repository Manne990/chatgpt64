import { crlf, toTerminalText, wrapText } from "./format.js";

const BACKSPACE = "\b \b";
const PROMPT = "> ";

export class TerminalSession {
  constructor({ socket, chat, config }) {
    this.socket = socket;
    this.chat = chat;
    this.config = config;
    this.line = "";
    this.mode = "normal";
    this.previousResponseId = "";
    this.busy = false;
    this.telnetSkip = 0;
    this.previousWasCr = false;
  }

  start() {
    this.writeBlock([
      "CHATGPT/64 READY.",
      "TYPE /HELP FOR COMMANDS.",
      "",
    ].join("\n"));

    if (!this.config.apiKey) {
      this.writeBlock("OBS: OPENAI_API_KEY SAKNAS PA SERVERN.");
    }

    this.prompt();
  }

  receive(buffer) {
    for (const byte of buffer) {
      if (this.consumeTelnetByte(byte)) {
        continue;
      }

      if (byte === 13 || byte === 10) {
        if (byte === 10 && this.previousWasCr) {
          this.previousWasCr = false;
          continue;
        }

        this.previousWasCr = byte === 13;
        this.submitLine();
        continue;
      }

      this.previousWasCr = false;

      if (byte === 8 || byte === 127) {
        this.backspace();
        continue;
      }

      if (byte >= 32 && byte <= 126) {
        this.appendChar(String.fromCharCode(byte));
      }
    }
  }

  consumeTelnetByte(byte) {
    if (this.telnetSkip > 0) {
      this.telnetSkip -= 1;
      return true;
    }

    if (byte === 255) {
      this.telnetSkip = 2;
      return true;
    }

    return false;
  }

  appendChar(char) {
    if (this.line.length >= this.config.maxInput) {
      return;
    }

    this.line += char;
    if (this.config.echo) {
      this.socket.write(char);
    }
  }

  backspace() {
    if (!this.line) {
      return;
    }

    this.line = this.line.slice(0, -1);
    if (this.config.echo) {
      this.socket.write(BACKSPACE);
    }
  }

  submitLine() {
    const input = this.line.trim();
    this.line = "";
    this.socket.write("\r\n");

    if (!input) {
      this.prompt();
      return;
    }

    if (this.busy) {
      this.writeBlock("BUSY. VANTA PA SVARET.");
      this.prompt();
      return;
    }

    if (input.startsWith("/")) {
      this.runCommand(input);
      return;
    }

    void this.ask(input);
  }

  runCommand(input) {
    const [command] = input.toLowerCase().split(/\s+/, 1);

    switch (command) {
      case "/help":
        this.writeBlock([
          "COMMANDS:",
          "/HELP   SHOW THIS HELP",
          "/NEW    NEW CHAT SESSION",
          "/SHORT  SHORT ANSWERS",
          "/NORMAL NORMAL ANSWERS",
          "/LONG   LONGER ANSWERS",
          "/MODEL  SHOW MODEL",
          "/QUIT   DISCONNECT",
        ].join("\n"));
        this.prompt();
        break;
      case "/new":
        this.previousResponseId = "";
        this.writeBlock("NEW SESSION.");
        this.prompt();
        break;
      case "/short":
      case "/normal":
      case "/long":
        this.mode = command.slice(1);
        this.writeBlock(`MODE: ${this.mode.toUpperCase()}`);
        this.prompt();
        break;
      case "/model":
        this.writeBlock(`MODEL: ${this.config.model}`);
        this.prompt();
        break;
      case "/quit":
      case "/bye":
        this.writeBlock("BYE.");
        this.socket.end();
        break;
      default:
        this.writeBlock("UNKNOWN COMMAND. TRY /HELP.");
        this.prompt();
        break;
    }
  }

  async ask(input) {
    this.busy = true;
    this.writeBlock("THINKING...");

    try {
      const response = await this.chat.reply({
        input,
        previousResponseId: this.previousResponseId,
        mode: this.mode,
      });

      this.previousResponseId = response.id || this.previousResponseId;
      this.writeBlock(response.text);
    } catch (error) {
      this.writeBlock(`ERROR: ${error.message}`);
    } finally {
      this.busy = false;
      this.prompt();
    }
  }

  prompt() {
    this.socket.write(PROMPT);
  }

  writeBlock(value) {
    const text = toTerminalText(value, { asciiOnly: this.config.asciiOnly });
    const wrapped = wrapText(text, this.config.width);
    this.writeSlow(`${wrapped}\r\n`);
  }

  writeSlow(value) {
    const text = crlf(value);
    if (this.config.charDelayMs <= 0) {
      this.socket.write(text);
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      if (index >= text.length || this.socket.destroyed) {
        clearInterval(timer);
        return;
      }

      this.socket.write(text[index]);
      index += 1;
    }, this.config.charDelayMs);
  }
}
