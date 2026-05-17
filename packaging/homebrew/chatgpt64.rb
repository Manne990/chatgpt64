class Chatgpt64 < Formula
  desc "Local retro-computer terminal bridge to OpenAI"
  homepage "https://github.com/Manne990/chatgpt64"
  url "https://github.com/Manne990/chatgpt64/archive/refs/tags/v0.1.1.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_TARBALL_SHA256"
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

      Your OpenAI API key is stored locally in your user config directory.
      Retro clients connect to the local bridge, not directly to OpenAI.
      Install tcpser separately if you use CCGMS/VICE modem emulation.
    EOS
  end

  test do
    assert_match "chatgpt64 bridge", shell_output("#{bin}/chatgpt64 help")
  end
end
