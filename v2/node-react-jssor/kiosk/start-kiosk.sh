#!/bin/bash

# Script untuk start iPray application dalam kiosk mode dengan Chromium
# Script ini akan:
# 1. Start Node.js backend dengan PM2
# 2. Wait untuk server ready
# 3. Launch Chromium dalam kiosk mode

# Jangan exit pada error untuk xset commands (boleh fail jika display extension tidak ada)
set +e

APP_DIR="$HOME/kiosk"
NODEJS_DIR="$APP_DIR/nodejs"
APP_URL="http://localhost:3000"
PM2_APP_NAME="ipray-kiosk"
MAX_WAIT=30  # Maximum wait time untuk server start (seconds)

# Set DISPLAY jika tidak set (untuk autostart)
if [ -z "$DISPLAY" ]; then
  export DISPLAY=:0
fi

echo "═══════════════════════════════════════"
echo "Starting iPray Kiosk Mode"
echo "═══════════════════════════════════════"
echo ""

# Function untuk check jika server sudah ready
check_server_ready() {
  local url=$1
  local max_wait=$2
  local waited=0
  
  while [ $waited -lt $max_wait ]; do
    if curl -s -f "$url" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
    echo -n "."
  done
  return 1
}

# Step 1: Start Node.js backend dengan PM2
echo "📦 Step 1: Starting Node.js backend..."
cd "$NODEJS_DIR"

# Check jika PM2 app sudah running
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
  echo "  ℹ️  Backend sudah running"
else
  echo "  Starting backend dengan PM2..."
  PROD_MODE=true pm2 start ecosystem.config.js --update-env 2>/dev/null || \
  PROD_MODE=true pm2 start main.js --name "$PM2_APP_NAME" --update-env
  
  # Save PM2 config
  pm2 save 2>/dev/null || true
fi

echo "  ✅ Backend started"
echo ""

# Step 2: Wait untuk server ready
echo "⏳ Step 2: Waiting for server to be ready..."
if check_server_ready "$APP_URL" $MAX_WAIT; then
  echo ""
  echo "  ✅ Server ready!"
else
  echo ""
  echo "  ⚠️  Server tidak ready selepas $MAX_WAIT seconds"
  echo "  Checking logs..."
  pm2 logs "$PM2_APP_NAME" --lines 20 --nostream
  echo ""
  echo "  Continuing anyway..."
fi
echo ""

# Step 3: Kill existing Chromium instances (jika ada)
echo "🛑 Step 3: Cleaning up existing Chromium instances..."
pkill -f "chromium.*kiosk" 2>/dev/null || true
sleep 2
echo "  ✅ Cleanup done"
echo ""

# Step 4: Launch Chromium dalam kiosk mode
echo "🚀 Step 4: Launching Chromium in kiosk mode..."
echo "  URL: $APP_URL"
echo ""

# Disable screen blanking (ignore errors jika extension tidak ada)
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Hide mouse cursor untuk kiosk mode
echo "🖱️  Hiding mouse cursor..."
# Kill existing unclutter processes
pkill -f unclutter 2>/dev/null || true
sleep 1

# Try unclutter-xfixes (for Wayland) - hide immediately, not on idle
if command -v unclutter-xfixes >/dev/null 2>&1; then
  # Use -idle 0 untuk hide terus, atau -idle 0.01 untuk hide sangat cepat
  unclutter-xfixes -idle 0.01 -root -noevents >/dev/null 2>&1 &
  echo "  ✅ Mouse cursor hidden (unclutter-xfixes - immediate hide)"
# Try unclutter (for X11)
elif command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.01 -root -noevents >/dev/null 2>&1 &
  echo "  ✅ Mouse cursor hidden (unclutter - immediate hide)"
else
  echo "  ⚠️  unclutter not found, installing..."
  # Try install unclutter-xfixes (for Wayland)
  if command -v apt >/dev/null 2>&1; then
    if sudo apt install -y unclutter-xfixes 2>/dev/null; then
      unclutter-xfixes -idle 0.01 -root -noevents >/dev/null 2>&1 &
      echo "  ✅ unclutter-xfixes installed and started"
    else
      echo "  ⚠️  Could not install unclutter (using CSS fallback)"
    fi
  else
    echo "  ⚠️  Cannot install unclutter (using CSS fallback)"
  fi
fi

# Additional: Set cursor to none via xsetroot (if available)
if command -v xsetroot >/dev/null 2>&1; then
  xsetroot -cursor_name none 2>/dev/null || true
fi

echo "  ℹ️  Note: CSS cursor:none also applied in application"
echo ""

# Ensure audio is unmuted and volume is set
echo "🔊 Ensuring audio is enabled..."
amixer set PCM unmute 2>/dev/null || true
amixer set PCM 100% 2>/dev/null || true
# Try Master control if PCM doesn't work
amixer set Master unmute 2>/dev/null || true
amixer set Master 100% 2>/dev/null || true
echo "  ✅ Audio configured"

# Test audio dengan beep sound untuk verify audio berfungsi
echo "  Testing audio with beep..."
if command -v speaker-test >/dev/null 2>&1; then
  # Generate short beep (1000Hz tone, 0.3 seconds)
  timeout 0.3 speaker-test -t sine -f 1000 -l 1 -c 2 -s 1 >/dev/null 2>&1 &
  BEEP_PID=$!
  sleep 0.35
  kill $BEEP_PID 2>/dev/null || true
  wait $BEEP_PID 2>/dev/null || true
  echo "  ✅ Audio test beep played"
else
  echo "  ⚠️  speaker-test not available"
fi
echo "  ✅ Audio configured and tested"

# Launch Chromium dengan kiosk mode
# Auto-detect Chromium command
CHROMIUM_CMD=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null)

if [ -z "$CHROMIUM_CMD" ]; then
  echo "  ❌ Chromium tidak dijumpai!"
  echo "     Sila install: sudo apt install -y chromium chromium-sandbox"
  exit 1
fi

echo "  Using Chromium: $CHROMIUM_CMD"
$CHROMIUM_CMD \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-features=TranslateUI \
  --disable-ipc-flooding-protection \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  --disable-background-networking \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-breakpad \
  --disable-client-side-phishing-detection \
  --disable-component-update \
  --disable-default-apps \
  --disable-dev-shm-usage \
  --disable-extensions \
  --disable-hang-monitor \
  --disable-popup-blocking \
  --disable-prompt-on-repost \
  --disable-sync \
  --disable-translate \
  --metrics-recording-only \
  --no-first-run \
  --no-default-browser-check \
  --no-pings \
  --password-store=basic \
  --use-mock-keychain \
  --enable-features=OverlayScrollbar \
  "$APP_URL" &

CHROMIUM_PID=$!
echo "  ✅ Chromium started (PID: $CHROMIUM_PID)"
echo ""

# Step 5: Monitor (optional - untuk debugging)
echo "═══════════════════════════════════════"
echo "✅ Kiosk mode started!"
echo "═══════════════════════════════════════"
echo ""
echo "Application running:"
echo "  - Backend: PM2 ($PM2_APP_NAME)"
echo "  - Frontend: Chromium (kiosk mode)"
echo "  - URL: $APP_URL"
echo ""
echo "To exit kiosk mode:"
echo "  - Press Alt+F4 atau Ctrl+Alt+T untuk terminal"
echo "  - SSH dan run: pkill -f chromium"
echo ""

# Wait untuk Chromium process (optional)
wait $CHROMIUM_PID 2>/dev/null || true
