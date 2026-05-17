#!/usr/bin/env zsh
pkill tcpser
#tcpser -v 25232 -S 2400 -l 7 -t mMsSiI -n "1=152.42.141.215:6464"
tcpser -v 25232 -p 6400 -S 2400 -l 4 -i"s5=20" -n 6464=152.42.141.215:6464