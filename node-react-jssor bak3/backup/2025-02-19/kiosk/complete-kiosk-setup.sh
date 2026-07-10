#!/bin/bash

# Complete Kiosk Setup Script untuk Raspberry Pi
# Script ini akan setup semua yang diperlukan untuk kiosk mode
# Jalankan script ini di Raspberry Pi: bash complete-kiosk-setup.sh

set -e

APP_DIR="$HOME/kiosk"
KIOSK_DIR="$APP_DIR/kiosk"
NODEJS_DIR="$APP_DIR/nodejs"

echo "═══════════════════════════════════════"
echo "Complete iPray Kiosk Setup"
echo "═══════════════════════════════════════"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check jika folder kiosk wujud
if [ ! -d "$APP_DIR" ]; then
  echo "❌ Folder $APP_DIR tidak wujud!"
  echo "   Sila transfer files terlebih dahulu"
  exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ditemui!"
  echo "   Sila install Node.js terlebih dahulu"
  exit 1
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
  echo "❌ PM2 tidak ditemui!"
  echo "   Installing PM2..."
  sudo npm install -g pm2
fi

echo "  ✅ Prerequisites OK"
echo ""

# Step 1: Install Chromium
echo "📦 Step 1: Installing Chromium..."
if command -v chromium-browser &> /dev/null || command -v chromium &> /dev/null; then
  echo "  ℹ️  Chromium sudah installed"
else
  echo "  Installing Chromium..."
  sudo apt update -qq
  sudo apt install -y chromium chromium-sandbox
fi
echo "  ✅ Chromium ready"
echo ""

# Step 2: Install Backend Dependencies
echo "📦 Step 2: Installing backend dependencies..."
cd "$NODEJS_DIR"
if [ ! -d "node_modules" ]; then
  npm install
  echo "  ✅ Backend dependencies installed"
else
  echo "  ℹ️  Dependencies sudah installed"
fi
echo ""

# Step 3: Build Frontend (jika react folder wujud)
if [ -d "$APP_DIR/react" ]; then
  echo "📦 Step 3: Building frontend..."
  cd "$APP_DIR/react"
  if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install
  fi
  echo "  Building production bundle..."
  npm run build
  echo "  ✅ Frontend build completed"
else
  echo "⚠️  React folder tidak ditemui, skip build"
  echo "   Pastikan frontend sudah di-build"
fi
echo ""

# Step 4: Create Production Directories
echo "📁 Step 4: Creating production directories..."
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/images/penceramah"
mkdir -p "$APP_DIR/images/slides"
mkdir -p "$NODEJS_DIR/logs"

# Copy initial data jika folder kosong
if [ ! "$(ls -A $APP_DIR/data)" ] && [ -d "$NODEJS_DIR/data" ]; then
  echo "  Copying initial data files..."
  cp "$NODEJS_DIR/data"/*.txt "$APP_DIR/data/" 2>/dev/null || true
fi

# Copy initial images jika folder kosong
if [ ! "$(ls -A $APP_DIR/images/penceramah)" ] && [ -d "$NODEJS_DIR/images/penceramah" ]; then
  echo "  Copying initial penceramah images..."
  cp -r "$NODEJS_DIR/images/penceramah"/* "$APP_DIR/images/penceramah/" 2>/dev/null || true
fi

if [ ! "$(ls -A $APP_DIR/images/slides)" ] && [ -d "$NODEJS_DIR/images/slides" ]; then
  echo "  Copying initial slides images..."
  cp -r "$NODEJS_DIR/images/slides"/* "$APP_DIR/images/slides/" 2>/dev/null || true
fi

echo "  ✅ Production directories created"
echo ""

# Step 5: Setup Kiosk Scripts
echo "🔧 Step 5: Setting up kiosk scripts..."
if [ ! -d "$KIOSK_DIR" ]; then
  echo "❌ Folder $KIOSK_DIR tidak wujud!"
  echo "   Sila transfer kiosk files terlebih dahulu"
  exit 1
fi

cd "$KIOSK_DIR"
chmod +x *.sh
echo "  ✅ Scripts executable"
echo ""

# Step 6: Setup PM2
echo "🚀 Step 6: Setting up PM2..."
cd "$NODEJS_DIR"

# Stop existing instance jika ada
pm2 delete ipray-kiosk 2>/dev/null || true

# Start dengan PM2
if [ -f "ecosystem.config.js" ]; then
  echo "  Starting dengan ecosystem.config.js..."
  PROD_MODE=true pm2 start ecosystem.config.js --update-env
else
  echo "  Starting dengan manual config..."
  PROD_MODE=true pm2 start main.js --name "ipray-kiosk" --update-env
fi

# Save PM2 config
pm2 save 2>/dev/null || true

# Setup PM2 startup
pm2 startup 2>/dev/null || true

echo "  ✅ PM2 configured"
echo ""

# Step 7: Setup Autostart
echo "🔧 Step 7: Setting up autostart..."
cd "$KIOSK_DIR"
bash setup-kiosk-autostart.sh
echo ""

# Step 8: Disable Screen Blanking
echo "🔧 Step 8: Disabling screen blanking..."
# Add to xprofile jika belum ada
if [ -f "$HOME/.xprofile" ]; then
  if ! grep -q "xset s off" "$HOME/.xprofile"; then
    echo "" >> "$HOME/.xprofile"
    echo "# Disable screen blanking untuk kiosk" >> "$HOME/.xprofile"
    echo "xset s off" >> "$HOME/.xprofile"
    echo "xset -dpms" >> "$HOME/.xprofile"
    echo "xset s noblank" >> "$HOME/.xprofile"
    echo "  ✅ Added to .xprofile"
  else
    echo "  ℹ️  Already configured"
  fi
fi

# Also add to LXDE autostart jika wujud
LXDE_AUTOSTART="/etc/xdg/lxsession/LXDE-pi/autostart"
if [ -f "$LXDE_AUTOSTART" ]; then
  if ! grep -q "xset s off" "$LXDE_AUTOSTART"; then
    echo "@xset s off" | sudo tee -a "$LXDE_AUTOSTART" > /dev/null
    echo "@xset -dpms" | sudo tee -a "$LXDE_AUTOSTART" > /dev/null
    echo "@xset s noblank" | sudo tee -a "$LXDE_AUTOSTART" > /dev/null
    echo "  ✅ Added to LXDE autostart"
  fi
fi

echo "  ✅ Screen blanking disabled"
echo ""

# Step 9: Verification
echo "🔍 Step 9: Verification..."
echo "  Checking PM2 status..."
pm2 status | grep -E "ipray-kiosk|online" || echo "    ⚠️  PM2 app tidak running"

echo "  Testing server..."
sleep 2
if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
  echo "    ✅ Server accessible"
else
  echo "    ⚠️  Server tidak accessible (mungkin masih starting)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Complete setup finished!"
echo "═══════════════════════════════════════"
echo ""
echo "Application Status:"
pm2 status | grep -E "ipray-kiosk|online" || pm2 list
echo ""
echo "Next steps:"
echo "  1. Test kiosk mode:"
echo "     ~/kiosk/kiosk/start-kiosk.sh"
echo ""
echo "  2. Reboot untuk test autostart:"
echo "     sudo reboot"
echo ""
echo "  3. Monitor resources:"
echo "     pm2 monit"
echo ""
echo "  4. View logs:"
echo "     pm2 logs ipray-kiosk"
echo ""
