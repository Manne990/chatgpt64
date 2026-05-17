# chatgpt64

`chatgpt64` is a local terminal bridge that lets retro computers talk to ChatGPT through the OpenAI API.

The retro machine only has to behave like a terminal. Your modern computer runs the bridge and handles TCP, TLS, HTTP, JSON, the OpenAI API key, session state, and 40/80-column formatting.

## Overview

```text
C64/C128 + CCGMS
VICE + tcpser
Amiga terminal clients
plain telnet/nc clients
    -> chatgpt64 bridge on your computer
    -> OpenAI Responses API
```

The OpenAI API key stays on the computer running `chatgpt64`. It is never stored on the C64, C128, Amiga, or terminal client.

## Features

- Raw TCP bridge for terminal-style clients
- Lightweight telnet IAC filtering
- Optional remote echo
- Per-connection prompt and line buffer
- `/help`, `/new`, `/short`, `/normal`, `/long`, `/c64`, `/ascii`, `/cls`, `/banner`, `/model`, `/quit`
- OpenAI Responses API calls through `fetch`
- `previous_response_id` per connection for continued conversations
- Short-answer mode by default
- 40-column wrapping by default
- ASCII transliteration for safer retro terminal output
- Optional C64 color mode using Commodore control bytes
- PETSCII-inspired startup banner with colored reverse-video blocks
- `tcpser` helper for VICE/CCGMS modem emulation
- `vice` helper for launching VICE with the matching RS232 settings

## Requirements

- Node.js 20 or later
- An OpenAI API key
- Optional: `tcpser` for VICE/CCGMS modem emulation

## Quick Start

From a local checkout:

```sh
npm install
npm run setup
npm start
```

The bridge listens on port `6464` by default.

```text
CHATGPT64_HOST=0.0.0.0
CHATGPT64_PORT=6464
```

From a WiFi modem, dial your computer's IP address and port:

```text
ATDT192.168.1.50:6464
```

## VICE + CCGMS

Start the OpenAI bridge in one terminal:

```sh
chatgpt64 start --terminal c64 --port 6464
```

Start the modem emulator in another terminal:

```sh
chatgpt64 tcpser
```

Start VICE in a third terminal:

```sh
chatgpt64 vice
```

The default chain is:

```text
VICE/CCGMS -> tcpser :25232 -> chatgpt64 :6464 -> OpenAI
```

In CCGMS, dial:

```text
ATDT6464
```

If `tcpser` is missing, `chatgpt64 tcpser` prints platform-specific install guidance. On macOS with Homebrew:

```sh
brew tap rickard-von-essen/formulae
brew install tcpser
```

If you use a custom keyboard map:

```sh
chatgpt64 vice --keymap ~/Documents/sdl_sym_se.vkm
```

## CLI

```sh
chatgpt64 setup
chatgpt64 start
chatgpt64 tcpser
chatgpt64 vice
chatgpt64 doctor
```

`setup` writes a local config file:

```text
macOS:   ~/Library/Application Support/chatgpt64/.env
Linux:   ~/.config/chatgpt64/.env
Windows: %APPDATA%\chatgpt64\.env
```

You can also point to a specific config file:

```sh
chatgpt64 start --env ./my-chatgpt64.env
```

Common flags:

```sh
chatgpt64 start --terminal c64 --width 40 --port 6464
chatgpt64 start --terminal ascii --width 80 --port 6464
chatgpt64 tcpser --listen 25232 --dial 6464 --target 127.0.0.1:6464
chatgpt64 vice --listen 25232 --keymap ~/Documents/sdl_sym_se.vkm
```

`chatgpt64 start` runs the OpenAI bridge. `chatgpt64 tcpser` starts modem emulation for clients that talk through AT commands.
`chatgpt64 vice` starts VICE with RS232/IP232 settings that point at `chatgpt64 tcpser`.

## Homebrew

The formula template is in:

```text
packaging/homebrew/chatgpt64.rb
```

For a local Homebrew test package:

```sh
npm run pack:homebrew
brew untap chatgpt64/local 2>/dev/null || true
brew tap chatgpt64/local "file://$(pwd)/dist/homebrew/tap"
HOMEBREW_NO_AUTO_UPDATE=1 brew install --build-from-source chatgpt64/local/chatgpt64
brew test chatgpt64/local/chatgpt64
```

If `chatgpt64` already exists from `npm link`, run `npm unlink -g chatgpt64` first or install with `--overwrite`.

For a public tap:

```sh
brew tap <owner>/chatgpt64
brew install chatgpt64
chatgpt64 setup
chatgpt64 start
chatgpt64 tcpser
chatgpt64 vice
```

More packaging notes are in `docs/packaging.md`.

## Terminal Commands

```text
/help    show help
/new     start a new ChatGPT session
/short   short answers, default mode
/normal  medium-length answers
/long    allow longer answers
/c64     C64 color mode
/ascii   plain ASCII mode
/cls     clear the screen
/banner  show the startup banner again
/model   show the active model
/quit    disconnect
```

## C64 Color Mode

ASCII mode is the safest default. C64 mode sends Commodore color and clear-screen control bytes while keeping text plain enough for CCGMS/tcpser.

The startup banner uses Commodore colors and reverse-video spaces as block graphics. This keeps it robust across CCGMS setups without requiring an exact graphics font match.

Switch to C64 color mode during a session:

```text
/c64
```

Return to plain ASCII:

```text
/ascii
```

Clear the screen:

```text
/cls
```

Show the banner again:

```text
/banner
```

To start every connection in C64 color mode, set:

```text
CHATGPT64_TERMINAL=c64
```

Color use:

```text
cyan         prompt/banner
yellow       THINKING... and warnings
light blue   system/help text
light red    errors
light green  ChatGPT replies
white        input/reset
```

## Configuration

```text
OPENAI_API_KEY          required for real replies
OPENAI_MODEL            default: gpt-5.5
CHATGPT64_HOST          default: 0.0.0.0
CHATGPT64_PORT          default: 6464
CHATGPT64_WIDTH         default: 40
CHATGPT64_TERMINAL      default: ascii, can be c64
CHATGPT64_MAX_INPUT     default: 1200
CHATGPT64_ASCII_ONLY    default: 1
CHATGPT64_ECHO          default: 1
CHATGPT64_CHAR_DELAY_MS default: 0
CHATGPT64_VICE_BIN       default: x64sc
CHATGPT64_VICE_LISTEN    default: 25232
CHATGPT64_VICE_KEYMAP    optional keymap path
```

`CHATGPT64_ASCII_ONLY=1` transliterates accented source text to plain ASCII. It is less pretty, but safer for early retro terminal testing.

## Roadmap

- Better PETSCII character mapping
- Optional paging with `-- MORE --`
- XMODEM export for long replies
- Direct serial bridge support for `/dev/tty.*`
- A small BBS-style menu around the chat
