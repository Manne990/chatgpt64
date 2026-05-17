# Packaging

`chatgpt64` is a local bridge plus a CLI:

```text
chatgpt64 setup
chatgpt64 start
chatgpt64 doctor
chatgpt64 tcpser
```

The bridge reads configuration from:

1. `--env path`
2. `CHATGPT64_ENV_FILE`
3. `.env` in the current directory, when present
4. the user config directory

Default user config locations:

```text
macOS:   ~/Library/Application Support/chatgpt64/.env
Linux:   ~/.config/chatgpt64/.env
Windows: %APPDATA%\chatgpt64\.env
```

## tcpser

`tcpser` is an optional runtime helper for VICE/CCGMS:

```text
VICE/CCGMS -> tcpser :25232 -> chatgpt64 :6464 -> OpenAI
```

It is intentionally not a hard Node dependency. If `tcpser` is in PATH, the user can run:

```sh
chatgpt64 start --terminal c64 --port 6464
chatgpt64 tcpser
```

The default helper command corresponds to:

```sh
tcpser -v 25232 -p 6400 -S 2400 -l 4 -is5=20 -n 6464=127.0.0.1:6464
```

If `tcpser` is missing, the CLI prints platform-specific install guidance. On macOS:

```sh
brew tap rickard-von-essen/formulae
brew install tcpser
```

Linux can use distribution packages where available, Arch AUR, or upstream:

```text
https://github.com/go4retro/tcpser
```

Windows can use WSL or a compatible `tcpser.exe` in PATH.

## Homebrew

The Homebrew formula template is in:

```text
packaging/homebrew/chatgpt64.rb
```

For a local test package, generate a tarball and temporary tap:

```sh
npm run pack:homebrew
```

That writes:

```text
dist/homebrew/chatgpt64-0.1.0.tgz
dist/homebrew/chatgpt64.rb
dist/homebrew/tap/Formula/chatgpt64.rb
```

Install the generated local tap:

```sh
brew untap chatgpt64/local 2>/dev/null || true
brew tap chatgpt64/local "file://$(pwd)/dist/homebrew/tap"
HOMEBREW_NO_AUTO_UPDATE=1 brew install --build-from-source chatgpt64/local/chatgpt64
brew test chatgpt64/local/chatgpt64
```

If `chatgpt64` was previously installed with `npm link`, remove that symlink first or let Homebrew overwrite it:

```sh
npm unlink -g chatgpt64
HOMEBREW_NO_AUTO_UPDATE=1 brew install --build-from-source --overwrite chatgpt64/local/chatgpt64
```

Uninstall the local Homebrew test package:

```sh
brew uninstall chatgpt64
brew untap chatgpt64/local
```

For a public tap, replace `YOUR_GITHUB_USER` and
`REPLACE_WITH_RELEASE_TARBALL_SHA256` in `packaging/homebrew/chatgpt64.rb`, then publish the formula in a tap such as:

```text
homebrew-chatgpt64
```

Install shape:

```sh
brew tap YOUR_GITHUB_USER/chatgpt64
brew install chatgpt64
chatgpt64 setup
chatgpt64 start
chatgpt64 tcpser
```

Homebrew's formula docs:

- https://docs.brew.sh/Formula-Cookbook
- https://docs.brew.sh/Node-for-Formula-Authors
