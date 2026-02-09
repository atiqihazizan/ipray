#!/bin/bash

# Script untuk setup autostart kiosk mode pada Raspberry Pi
# Jalankan script ini sekali untuk setup autostart

set -e

KIOSK_DIR="$HOME/kiosk/kiosk"
AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/ipray-kiosk.desktop"

echo "═══════════════════════════════════════"
echo "Setup Kiosk Autostart"
echo "═══════════════════════════════════════"
echo ""

# Check jika kiosk directory wujud
if [ ! -d "$KIOSK_DIR" ]; then
  echo "❌ Folder $KIOSK_DIR tidak wujud!"
  echo "   Sila pastikan files sudah di-transfer ke ~/kiosk/"
  exit 1
fi

# Make scripts executable
echo "📝 Making scripts executable..."
chmod +x "$KIOSK_DIR/start-kiosk.sh"
chmod +x "$KIOSK_DIR/stop-kiosk.sh"
chmod +x "$KIOSK_DIR/autostart-kiosk.sh"
echo "  ✅ Scripts executable"
echo ""

# Create autostart directory jika tidak wujud
mkdir -p "$AUTOSTART_DIR"

# Create desktop file untuk autostart
echo "📝 Creating autostart desktop file..."
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=iPray Kiosk
Comment=Start iPray application in kiosk mode
Exec=$KIOSK_DIR/start-kiosk.sh
Icon=applications-internet
Terminal=false
Categories=Network;
X-GNOME-Autostart-enabled=true
Environment=DISPLAY=:0
EOF

echo "  ✅ Autostart file created: $DESKTOP_FILE"
echo ""

# Setup untuk labwc (jika menggunakan labwc window manager)
if [ -d "$HOME/.config/labwc" ]; then
  echo "📝 Setting up labwc autostart..."
  LABWC_AUTOSTART="$HOME/.config/labwc/autostart"
  
  # Backup existing autostart jika ada
  if [ -f "$LABWC_AUTOSTART" ]; then
    cp "$LABWC_AUTOSTART" "$LABWC_AUTOSTART.backup.$(date +%Y%m%d_%H%M%S)"
  fi
  
  # Add kiosk start command
  if ! grep -q "start-kiosk.sh" "$LABWC_AUTOSTART" 2>/dev/null; then
    echo "$KIOSK_DIR/start-kiosk.sh &" >> "$LABWC_AUTOSTART"
    echo "  ✅ Added to labwc autostart"
  else
    echo "  ℹ️  Already in labwc autostart"
  fi
fi

# Setup untuk X11 (jika menggunakan X11)
if [ -f "$HOME/.xprofile" ]; then
  echo "📝 Setting up X11 autostart..."
  if ! grep -q "start-kiosk.sh" "$HOME/.xprofile"; then
    echo "" >> "$HOME/.xprofile"
    echo "# iPray Kiosk Mode" >> "$HOME/.xprofile"
    echo "$KIOSK_DIR/start-kiosk.sh &" >> "$HOME/.xprofile"
    echo "  ✅ Added to .xprofile"
  else
    echo "  ℹ️  Already in .xprofile"
  fi
fi

# Setup PM2 startup (jika belum)
echo "📝 Setting up PM2 startup..."
pm2 startup 2>/dev/null || true
pm2 save 2>/dev/null || true
echo "  ✅ PM2 startup configured"
echo ""

echo "═══════════════════════════════════════"
echo "✅ Autostart setup completed!"
echo "═══════════════════════════════════════"
echo ""
echo "Kiosk mode akan auto-start pada boot/login."
echo ""
echo "To test sekarang:"
echo "  $KIOSK_DIR/start-kiosk.sh"
echo ""
echo "To disable autostart:"
echo "  rm $DESKTOP_FILE"
echo ""
