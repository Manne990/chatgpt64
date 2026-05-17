#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/homebrew"
TAP="$DIST/tap"

cd "$ROOT"

mkdir -p "$DIST"
rm -f "$DIST"/chatgpt64-*.tgz "$DIST/chatgpt64.rb"

TARBALL_NAME="$(npm pack --pack-destination "$DIST" --silent)"
TARBALL="$DIST/$TARBALL_NAME"
SHA256="$(shasum -a 256 "$TARBALL" | awk '{print $1}')"
VERSION="$(node -p "require('./package.json').version")"
FORMULA="$DIST/chatgpt64.rb"

cat > "$FORMULA" <<RUBY
class Chatgpt64 < Formula
  desc "Local retro-computer terminal bridge to OpenAI"
  homepage "https://github.com/YOUR_GITHUB_USER/chatgpt64"
  url "file://$TARBALL"
  version "$VERSION"
  sha256 "$SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/chatgpt64"
  end

  def caveats
    <<~EOS
      Run:
        chatgpt64 setup
        chatgpt64 start
        chatgpt64 tcpser
        chatgpt64 vice

      Your OpenAI API key is stored locally in your user config directory.
      Retro clients connect to the local bridge, not directly to OpenAI.
      Install tcpser and VICE separately if you use CCGMS/VICE modem emulation.
    EOS
  end

  test do
    assert_match "chatgpt64 bridge", shell_output("#{bin}/chatgpt64 help")
  end
end
RUBY

mkdir -p "$TAP/Formula"
cp "$FORMULA" "$TAP/Formula/chatgpt64.rb"

if [ ! -d "$TAP/.git" ]; then
  git -C "$TAP" init -q
fi

git -C "$TAP" config user.name "chatgpt64 local pack"
git -C "$TAP" config user.email "chatgpt64@example.invalid"
git -C "$TAP" add Formula/chatgpt64.rb

if ! git -C "$TAP" diff --cached --quiet; then
  git -C "$TAP" commit -qm "Build chatgpt64 formula"
fi

echo "Created:"
echo "  $TARBALL"
echo "  $FORMULA"
echo "  $TAP"
echo ""
echo "Tap and dry-run:"
echo "  brew untap chatgpt64/local 2>/dev/null || true"
echo "  brew tap chatgpt64/local \"file://$TAP\""
echo "  HOMEBREW_NO_AUTO_UPDATE=1 brew install --dry-run --build-from-source chatgpt64/local/chatgpt64"
echo ""
echo "Test install:"
echo "  HOMEBREW_NO_AUTO_UPDATE=1 brew install --build-from-source chatgpt64/local/chatgpt64"
echo ""
echo "If /opt/homebrew/bin/chatgpt64 already exists from npm link:"
echo "  npm unlink -g chatgpt64"
echo "  HOMEBREW_NO_AUTO_UPDATE=1 brew install --build-from-source --overwrite chatgpt64/local/chatgpt64"
