#!/bin/bash
# Minimum 1920x1080; bila tiada TV/monitor pun set framebuffer dan HDMI-1 ke 1080p.
export DISPLAY=:0
export XAUTHORITY="${HOME:-/home/ipray}/.Xauthority"

MODELINE="1920x1080_60.00"
MODELINE_SPEC="173.00 1920 2048 2248 2576 1080 1083 1088 1120 -hsync +vsync"

# Tambah mod 1920x1080 jika belum wujud (untuk bila HDMI disconnected)
xrandr -q 2>/dev/null | grep -q "$MODELINE" || \
  xrandr --newmode "$MODELINE" $MODELINE_SPEC 2>/dev/null

# Tambah mod ke HDMI-1 dan set sebagai primary (walaupun disconnected)
xrandr --addmode HDMI-1 "$MODELINE" 2>/dev/null
xrandr --output HDMI-1 --mode "$MODELINE" --primary 2>/dev/null

# Jika masih gagal, cuba nama ringkas dan set framebuffer minimum 1920x1080
xrandr --output HDMI-1 --mode 1920x1080 --primary 2>/dev/null
xrandr --output HDMI-1 --primary --auto 2>/dev/null
xrandr --fb 1920x1080 2>/dev/null

# Jika ada output connected, set juga ke 1080p
CONNECTED=$(xrandr -q 2>/dev/null | awk "\$2 == \"connected\" { print \$1; exit }")
if [ -n "$CONNECTED" ]; then
  xrandr --addmode "$CONNECTED" "$MODELINE" 2>/dev/null
  xrandr --output "$CONNECTED" --mode "$MODELINE" --primary 2>/dev/null || \
  xrandr --output "$CONNECTED" --mode 1920x1080 --primary 2>/dev/null || \
  xrandr --output "$CONNECTED" --primary --auto 2>/dev/null
fi
