$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
npm install
npm link

Write-Host "Installed chatgpt64 CLI."
Write-Host "Next: chatgpt64 setup"

