#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
npm install
npm link

echo "Installed chatgpt64 CLI."
echo "Next: chatgpt64 setup"

