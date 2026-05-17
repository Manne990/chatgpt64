import {
  C64,
  formatBackspace,
  formatBlock,
  formatClearScreen,
  formatPrompt,
  formatReset,
  formatWelcomeBanner,
  normalizeTerminalMode,
} from "./terminal.js";

export class TerminalSession {
  constructor({ socket, chat, config }) {
    this.socket = socket;
    this.chat = chat;
    this.config = config;
    this.line = "";
    this.mode = "short";
    this.terminal = normalizeTerminalMode(config.terminal);
    this.previousResponseId = "";
    this.busy = false;
    this.telnetSkip = 0;
    this.previousWasCr = false;
  }

  start() {
    this.writeRaw(formatWelcomeBanner({
      terminal: this.terminal,
      width: this.config.width,
    }));

    if (!this.config.apiKey) {
      this.writeBlock("OBS: OPENAI_API_KEY SAKNAS PA SERVERN.", "error");
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

      if (byte === 8 || byte === 127 || byte === C64.DELETE) {
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
      this.writeRaw(char);
    }
  }

  backspace() {
    if (!this.line) {
      return;
    }

    this.line = this.line.slice(0, -1);
    if (this.config.echo) {
      this.writeRaw(formatBackspace({ terminal: this.terminal }));
    }
  }

  submitLine() {
    const input = this.line.trim();
    this.line = "";
    this.writeRaw("\r\n");

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
          "/C64    C64 COLOR MODE",
          "/ASCII  PLAIN ASCII MODE",
          "/CLS    CLEAR SCREEN",
          "/BANNER SHOW START BANNER",
          "/MODEL  SHOW MODEL",
          "/QUIT   DISCONNECT",
        ].join("\n"), "help");
        this.prompt();
        break;
      case "/new":
        this.previousResponseId = "";
        this.writeBlock("NEW SESSION.", "system");
        this.prompt();
        break;
      case "/short":
      case "/normal":
      case "/long":
        this.mode = command.slice(1);
        this.writeBlock(`MODE: ${this.mode.toUpperCase()}`, "system");
        this.prompt();
        break;
      case "/c64":
      case "/color":
      case "/petscii":
        this.terminal = "c64";
        this.writeRaw(formatWelcomeBanner({
          terminal: this.terminal,
          width: this.config.width,
        }));
        this.prompt();
        break;
      case "/ascii":
      case "/mono":
        this.writeRaw(formatReset({ terminal: this.terminal }));
        this.terminal = "ascii";
        this.writeBlock("ASCII MODE.", "system");
        this.prompt();
        break;
      case "/cls":
      case "/clear":
        this.writeRaw(formatClearScreen({ terminal: this.terminal }));
        this.prompt();
        break;
      case "/banner":
        this.writeRaw(formatWelcomeBanner({
          terminal: this.terminal,
          width: this.config.width,
        }));
        this.prompt();
        break;
      case "/model":
        this.writeBlock(`MODEL: ${this.config.model}`, "system");
        this.prompt();
        break;
      case "/quit":
      case "/bye":
        this.writeBlock("BYE.", "system");
        this.socket.end();
        break;
      default:
        this.writeBlock("UNKNOWN COMMAND. TRY /HELP.", "warning");
        this.prompt();
        break;
    }
  }

  async ask(input) {
    this.busy = true;
    this.writeBlock("THINKING...", "thinking");

    try {
      const response = await this.chat.reply({
        input,
        previousResponseId: this.previousResponseId,
        mode: this.mode,
      });

      this.previousResponseId = response.id || this.previousResponseId;
      this.writeBlock(response.text, "assistant");
    } catch (error) {
      this.writeBlock(`ERROR: ${error.message}`, "error");
    } finally {
      this.busy = false;
      this.prompt();
    }
  }

  prompt() {
    this.writeRaw(formatPrompt({ terminal: this.terminal }));
  }

  writeBlock(value, style = "assistant") {
    this.writeSlow(formatBlock(value, {
      ...this.config,
      terminal: this.terminal,
    }, style));
  }

  writeRaw(value) {
    if (value === "") {
      return;
    }

    this.socket.write(value);
  }

  writeSlow(value) {
    if (this.config.charDelayMs <= 0) {
      this.writeRaw(value);
      return;
    }

    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
    let index = 0;
    const timer = setInterval(() => {
      if (index >= bytes.length || this.socket.destroyed) {
        clearInterval(timer);
        return;
      }

      this.socket.write(bytes.subarray(index, index + 1));
      index += 1;
    }, this.config.charDelayMs);
  }
}
