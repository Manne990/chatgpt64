#!/usr/bin/env zsh
/Applications/vice-arm64-sdl2-3.10/bin/x64sc \
  -default \
  -symkeymap "/Users/manne990/Documents/sdl_sym_se.vkm" \
  -keymap 2 \
  -rsdev2 "127.0.0.1:25232" \
  -rsdev2ip232 \
  -rsuserbaud 2400 \
  -rsuserdev 1 \
  -userportdevice 2