#!/bin/bash

# Script untuk deploy dan setup kiosk mode di Raspberry Pi
# Usage: bash deploy-kiosk.sh [RASPBERRY_PI_IP]

set -e

RASPBERRY_PI_HOST="${1:-ipray@ipray.local}"
KIOSK_DIR="kiosk"
REMOTE_KIOSK_DIR="~/kiosk/kiosk"

echo "═══════════════════════════════════════"
echo "Deploy iPray Kiosk Mode ke Raspberry Pi"
echo "═══════════════════════════════════════"
echo ""

# Check jika kiosk directory wujud
if [ ! -d "$KIOSK_DIR" ]; then
  echo "❌ Folder $KIOSK_DIR tidak wujud!"
  exit 1
fi

echo "📤 Transferring kiosk files..."
echo "  Host: $RASPBERRY_PI_HOST"
echo "  Remote: $REMOTE_KIOSK_DIR"
echo ""

# Transfer kiosk files
rsync -avz --progress \
  --exclude '*.md' \
  "$KIOSK_DIR/" "$RASPBERRY_PI_HOST:$REMOTE_KIOSK_DIR/"

echo "  ✅ Files transferred"
echo ""

# Setup di Raspberry Pi
echo "🔧 Setting up kiosk mode di Raspberry Pi..."
ssh "$RASPBERRY_PI_HOST" << 'ENDSSH'
  set -e
  
  KIOSK_DIR="$HOME/kiosk/kiosk"
  
  echo "  Making scripts executable..."
  chmod +x "$KIOSK_DIR"/*.sh
  
  echo "  Installing Chromium (jika belum)..."
  sudo apt update -qq
  sudo apt install -y chromium chromium-sandbox 2>/dev/null || echo "    Chromium mungkin sudah installed"
  
  echo "  Setting up autostart..."
  cd "$KIOSK_DIR"
  bash setup-kiosk-autostart.sh
  
  echo "  ✅ Setup completed"
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Deployment completed!"
echo "═══════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Test kiosk mode:"
echo "     ssh $RASPBERRY_PI_HOST '~/kiosk/kiosk/start-kiosk.sh'"
echo ""
echo "  2. Reboot untuk test autostart:"
echo "     ssh $RASPBERRY_PI_HOST 'sudo reboot'"
echo ""
