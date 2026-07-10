#!/usr/bin/env bash
#
# Setup PM2 sebagai systemd service untuk iPray (gabung PM2 + systemd).
# Jalankan di Pi (ipray.local) dalam folder app, atau set APPS_DIR.
#
# Usage:
#   cd /home/ipray/apps && bash setup-pm2-systemd.sh
#   atau: APPS_DIR=/home/ipray/apps bash setup-pm2-systemd.sh
#

set -e

APPS_DIR="${APPS_DIR:-$(pwd)}"
PM2_APP_NAME="ipray-kiosk"

echo "═══════════════════════════════════════"
echo "PM2 + systemd setup (iPray)"
echo "═══════════════════════════════════════"
echo ""

if [ ! -f "$APPS_DIR/main.js" ]; then
  echo "❌ main.js tidak dijumpai dalam $APPS_DIR"
  exit 1
fi

if [ ! -f "$APPS_DIR/ecosystem.config.js" ]; then
  echo "❌ ecosystem.config.js tidak dijumpai dalam $APPS_DIR"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ PM2 tidak dipasang. Pasang dengan: sudo npm install -g pm2"
  exit 1
fi

echo "📂 App dir: $APPS_DIR"
echo ""

# Stop & disable systemd kiosk.service jika wujud
if systemctl list-unit-files 2>/dev/null | grep -q 'kiosk.service'; then
  echo "🛑 Menghentikan kiosk.service..."
  sudo systemctl stop kiosk 2>/dev/null || true
  sudo systemctl disable kiosk 2>/dev/null || true
  echo "   ✅ kiosk.service dihentikan dan disabled"
else
  echo "   ℹ️  kiosk.service tidak dijumpai (ok)"
fi
echo ""

# Start dengan PM2
echo "🚀 Start app dengan PM2..."
cd "$APPS_DIR"
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
PROD_MODE=true pm2 start ecosystem.config.js --update-env
pm2 save
echo "   ✅ PM2 started & saved"
echo ""

# PM2 startup systemd
echo "📝 Setup PM2 startup (systemd)..."
echo "   Jalankan arahan sudo yang dipaparkan di bawah:"
echo ""
pm2 startup systemd
echo ""
echo "   Selepas jalankan arahan sudo di atas, PM2 akan start pada boot."
echo ""
echo "═══════════════════════════════════════"
echo "Selesai. Semak dengan: pm2 list"
echo "═══════════════════════════════════════"
