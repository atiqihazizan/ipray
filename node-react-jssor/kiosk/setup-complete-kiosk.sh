#!/bin/bash

# Complete Kiosk Setup Script untuk iPray
# Script ini akan setup semua konfigurasi untuk kiosk mode:
# 1. Disable system sleep/suspend/hibernate
# 2. Disable screen auto-off
# 3. Setup autostart untuk kiosk mode
# 4. Configure PM2 startup
# 5. Setup audio configuration

set -e

echo "═══════════════════════════════════════"
echo "Complete iPray Kiosk Setup"
echo "═══════════════════════════════════════"
echo ""

KIOSK_DIR="$HOME/kiosk/kiosk"
NODEJS_DIR="$HOME/kiosk/nodejs"
AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/ipray-kiosk.desktop"
LABWC_AUTOSTART="$HOME/.config/labwc/autostart"
PM2_APP_NAME="ipray-kiosk"
APP_URL="http://localhost:3000"

# ============================================
# Pre-flight Checks
# ============================================
echo "🔍 Pre-flight Checks..."
echo ""

# Check jika kiosk directory wujud
if [ ! -d "$KIOSK_DIR" ]; then
  echo "❌ Folder $KIOSK_DIR tidak wujud!"
  echo "   Sila pastikan files sudah di-transfer ke ~/kiosk/"
  exit 1
fi
echo "  ✅ Kiosk directory: EXISTS"

# Check jika nodejs directory wujud
if [ ! -d "$NODEJS_DIR" ]; then
  echo "❌ Folder $NODEJS_DIR tidak wujud!"
  echo "   Sila pastikan backend files sudah di-transfer ke ~/kiosk/nodejs/"
  exit 1
fi
echo "  ✅ Node.js directory: EXISTS"
echo ""

# Check Node.js installation
echo "📦 Checking Node.js..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node.js: INSTALLED ($NODE_VERSION)"
else
    echo "  ❌ Node.js: NOT INSTALLED"
    echo "     Install dengan: sudo apt install -y nodejs npm"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "  ✅ npm: INSTALLED ($NPM_VERSION)"
else
    echo "  ❌ npm: NOT INSTALLED"
    exit 1
fi
echo ""

# Check PM2 installation
echo "📦 Checking PM2..."
if command -v pm2 >/dev/null 2>&1; then
    PM2_VERSION=$(pm2 --version 2>/dev/null || echo "unknown")
    echo "  ✅ PM2: INSTALLED ($PM2_VERSION)"
    
    # Check PM2 daemon status
    if pm2 ping >/dev/null 2>&1; then
        echo "  ✅ PM2 daemon: RUNNING"
    else
        echo "  ⚠️  PM2 daemon: NOT RUNNING (will start automatically)"
        pm2 ping >/dev/null 2>&1 || pm2 resurrect >/dev/null 2>&1 || true
    fi
else
    echo "  ❌ PM2: NOT INSTALLED"
    echo "     Install dengan: sudo npm install -g pm2"
    echo "     Atau: npm install -g pm2"
    exit 1
fi
echo ""

# Check existing PM2 processes
echo "📊 Checking existing PM2 processes..."
if pm2 list | grep -q "$PM2_APP_NAME"; then
    PM2_STATUS=$(pm2 list | grep "$PM2_APP_NAME" | awk '{print $10}')
    echo "  ℹ️  PM2 app '$PM2_APP_NAME': EXISTS (Status: $PM2_STATUS)"
    if [ "$PM2_STATUS" = "online" ]; then
        echo "  ✅ Backend already running"
    else
        echo "  ⚠️  Backend not running (will be started by start-kiosk.sh)"
    fi
else
    echo "  ℹ️  PM2 app '$PM2_APP_NAME': NOT FOUND (will be created)"
fi
echo ""

# Check Chromium installation
echo "🌐 Checking Chromium..."
CHROMIUM_CMD=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null)
if [ -n "$CHROMIUM_CMD" ]; then
    CHROMIUM_VERSION=$($CHROMIUM_CMD --version 2>/dev/null | head -1 || echo "installed")
    echo "  ✅ Chromium: INSTALLED ($CHROMIUM_VERSION)"
    echo "    Location: $CHROMIUM_CMD"
else
    echo "  ❌ Chromium: NOT INSTALLED"
    echo "     Install dengan: sudo apt install -y chromium chromium-sandbox"
    echo "     Script will continue but kiosk mode will fail without Chromium"
fi
echo ""

# Check unclutter (for hiding mouse cursor)
echo "🖱️  Checking unclutter (mouse cursor hide)..."
if command -v unclutter-xfixes >/dev/null 2>&1; then
    echo "  ✅ unclutter-xfixes: INSTALLED (for Wayland)"
elif command -v unclutter >/dev/null 2>&1; then
    echo "  ✅ unclutter: INSTALLED (for X11)"
else
    echo "  ⚠️  unclutter: NOT INSTALLED"
    echo "     Will be installed automatically if needed"
fi
echo ""

# Check if port 3000 is available or in use
echo "🔌 Checking port 3000..."
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln 2>/dev/null | grep -q ':3000 '; then
        PORT_PROCESS=$(netstat -tulnp 2>/dev/null | grep ':3000 ' | awk '{print $7}' | cut -d'/' -f2 || echo "unknown")
        echo "  ℹ️  Port 3000: IN USE (by $PORT_PROCESS)"
        if echo "$PORT_PROCESS" | grep -q "node\|pm2"; then
            echo "  ✅ Port used by Node.js/PM2 (expected)"
        else
            echo "  ⚠️  Port used by other process (may cause conflict)"
        fi
    else
        echo "  ✅ Port 3000: AVAILABLE"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tuln 2>/dev/null | grep -q ':3000 '; then
        echo "  ℹ️  Port 3000: IN USE"
    else
        echo "  ✅ Port 3000: AVAILABLE"
    fi
else
    echo "  ⚠️  Cannot check port (netstat/ss not available)"
fi
echo ""

# Check required scripts
echo "📜 Checking required scripts..."
REQUIRED_SCRIPTS=("start-kiosk.sh")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$KIOSK_DIR/$script" ]; then
        if [ -x "$KIOSK_DIR/$script" ]; then
            echo "  ✅ $script: EXISTS and executable"
        else
            echo "  ⚠️  $script: EXISTS but not executable (will fix)"
            chmod +x "$KIOSK_DIR/$script"
        fi
    else
        echo "  ❌ $script: NOT FOUND"
        exit 1
    fi
done
echo ""

# Check Node.js dependencies
echo "📦 Checking Node.js dependencies..."
if [ -f "$NODEJS_DIR/package.json" ]; then
    if [ -d "$NODEJS_DIR/node_modules" ]; then
        echo "  ✅ node_modules: EXISTS"
    else
        echo "  ⚠️  node_modules: NOT FOUND"
        echo "     Run: cd $NODEJS_DIR && npm install"
        echo "     Script will continue but backend may not work"
    fi
else
    echo "  ⚠️  package.json: NOT FOUND"
    echo "     Backend may not be properly configured"
fi
echo ""

# Check if server is already running
echo "🌐 Checking if server is already running..."
if curl -s -f "$APP_URL" >/dev/null 2>&1; then
    echo "  ✅ Server: RUNNING at $APP_URL"
else
    echo "  ℹ️  Server: NOT RUNNING (will be started by start-kiosk.sh)"
fi
echo ""

# ============================================
# Step 1: Disable System Sleep
# ============================================
echo "📝 Step 1: Disabling system sleep via systemd-logind..."
sudo mkdir -p /etc/systemd/logind.conf.d

sudo tee /etc/systemd/logind.conf.d/no-sleep.conf > /dev/null << 'EOF'
[Login]
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
IdleAction=ignore
EOF

echo "  ✅ Sleep disable config created"
echo ""

# Restart systemd-logind
echo "🔄 Restarting systemd-logind..."
sudo systemctl restart systemd-logind
sleep 2
if sudo systemctl is-active --quiet systemd-logind; then
    echo "  ✅ systemd-logind restarted"
else
    echo "  ⚠️  systemd-logind status unclear"
fi
echo ""

# ============================================
# Step 2: Disable Screen Auto-Off
# ============================================
echo "🛑 Step 2: Stopping screen auto-off processes..."
pkill -f 'swayidle.*timeout 600' 2>/dev/null || true
sleep 1
echo "  ✅ Screen auto-off processes stopped"
echo ""

# ============================================
# Step 3: Install unclutter (for mouse cursor hide)
# ============================================
echo "📦 Step 3: Installing unclutter (for mouse cursor hide)..."

if ! command -v unclutter-xfixes >/dev/null 2>&1 && ! command -v unclutter >/dev/null 2>&1; then
    echo "  Installing unclutter-xfixes..."
    if command -v apt >/dev/null 2>&1; then
        sudo apt update -qq >/dev/null 2>&1
        sudo apt install -y unclutter-xfixes 2>/dev/null && \
        echo "    ✅ unclutter-xfixes installed" || \
        echo "    ⚠️  Failed to install unclutter-xfixes (will try unclutter)"
        
        # Fallback to unclutter if unclutter-xfixes not available
        if ! command -v unclutter-xfixes >/dev/null 2>&1; then
            sudo apt install -y unclutter 2>/dev/null && \
            echo "    ✅ unclutter installed" || \
            echo "    ⚠️  Failed to install unclutter (mouse cursor may be visible)"
        fi
    else
        echo "    ⚠️  Cannot install unclutter (apt not available)"
    fi
else
    if command -v unclutter-xfixes >/dev/null 2>&1; then
        echo "  ✅ unclutter-xfixes: Already installed"
    else
        echo "  ✅ unclutter: Already installed"
    fi
fi
echo ""

# ============================================
# Step 4: Setup Autostart
# ============================================
echo "📝 Step 4: Setting up autostart configuration..."

# Make scripts executable
echo "  Making scripts executable..."
chmod +x "$KIOSK_DIR/start-kiosk.sh" 2>/dev/null || true
chmod +x "$KIOSK_DIR/stop-kiosk.sh" 2>/dev/null || true
chmod +x "$KIOSK_DIR/autostart-kiosk.sh" 2>/dev/null || true
echo "    ✅ Scripts executable"
echo ""

# Setup labwc autostart (Wayland)
if [ -d "$HOME/.config/labwc" ]; then
  echo "  Setting up labwc autostart..."
  
  # Backup existing autostart jika ada
  if [ -f "$LABWC_AUTOSTART" ]; then
    cp "$LABWC_AUTOSTART" "${LABWC_AUTOSTART}.backup.$(date +%Y%m%d_%H%M%S)"
  fi
  
  # Create/update autostart file
  mkdir -p "$(dirname "$LABWC_AUTOSTART")"
  cat > "$LABWC_AUTOSTART" << 'EOF'
#!/bin/bash
# Kiosk mode configuration

# Set resolution to 1920x1080
wlr-randr --output HDMI-A-1 --mode 1920x1080@60 &

# Black background (no desktop)
swaybg -c 000000 &

# Sleep is disabled via systemd-logind (see /etc/systemd/logind.conf.d/no-sleep.conf)
# Screen auto-off is DISABLED - screen will stay on always

# Run iPray kiosk application (Chromium mode)
export DISPLAY=:0
/home/ipray/kiosk/kiosk/start-kiosk.sh > /tmp/ipray-kiosk.log 2>&1 &
EOF
  
  chmod +x "$LABWC_AUTOSTART"
  echo "    ✅ labwc autostart configured: $LABWC_AUTOSTART"
fi

# Setup desktop file untuk GNOME/XFCE (backup)
mkdir -p "$AUTOSTART_DIR"
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
echo "    ✅ Desktop autostart file created: $DESKTOP_FILE"
echo ""

# ============================================
# Step 5: Setup PM2 Startup
# ============================================
echo "📝 Step 5: Setting up PM2 startup..."

# Setup PM2 startup script
echo "  Setting up PM2 startup script..."
STARTUP_OUTPUT=$(pm2 startup 2>&1)
if echo "$STARTUP_OUTPUT" | grep -q "sudo"; then
    echo "    ℹ️  PM2 startup command generated (requires sudo to complete)"
    echo "    Run the command shown above to enable PM2 startup"
else
    echo "    ✅ PM2 startup already configured"
fi

# Save PM2 process list
if pm2 list | grep -q "$PM2_APP_NAME"; then
    echo "  Saving PM2 process list..."
    pm2 save 2>/dev/null && echo "    ✅ PM2 processes saved" || echo "    ⚠️  PM2 save failed"
else
    echo "  ℹ️  No PM2 processes to save (will be created on first start)"
fi

# Ensure PM2 will auto-resurrect
pm2 set pm2:autodump true 2>/dev/null || true
echo "  ✅ PM2 startup configured"
echo ""

# ============================================
# Step 6: Verification
# ============================================
echo "🔍 Step 6: Verifying configuration..."
echo ""

# Check systemd-logind config
if [ -f "/etc/systemd/logind.conf.d/no-sleep.conf" ]; then
    echo "  ✅ Sleep disable config: EXISTS"
else
    echo "  ❌ Sleep disable config: NOT FOUND"
fi

# Check systemd-logind status
if sudo systemctl is-active --quiet systemd-logind; then
    echo "  ✅ systemd-logind: ACTIVE"
else
    echo "  ⚠️  systemd-logind: NOT ACTIVE"
fi

# Check screen auto-off processes
if ! ps aux | grep -q '[s]wayidle.*timeout 600'; then
    echo "  ✅ Screen auto-off: DISABLED"
else
    echo "  ⚠️  Screen auto-off: Still running"
fi

# Check autostart files
if [ -f "$LABWC_AUTOSTART" ] && ! grep -q 'swayidle.*timeout 600' "$LABWC_AUTOSTART"; then
    echo "  ✅ labwc autostart: Configured (no screen timeout)"
else
    echo "  ⚠️  labwc autostart: May need update"
fi

if [ -f "$DESKTOP_FILE" ]; then
    echo "  ✅ Desktop autostart: Created"
fi

# Check PM2 status
echo ""
echo "📊 PM2 Status:"
if pm2 ping >/dev/null 2>&1; then
    PM2_COUNT=$(pm2 list | grep -v "┌\|├\|└\|│" | grep -c "│" || echo "0")
    if [ "$PM2_COUNT" -gt 0 ]; then
        echo "  ✅ PM2 daemon: RUNNING"
        echo "  ✅ PM2 processes: $PM2_COUNT found"
        pm2 list | grep "$PM2_APP_NAME" | head -1 | awk '{print "  ℹ️  " $4 " app: " $10}'
    else
        echo "  ✅ PM2 daemon: RUNNING (no processes yet)"
    fi
else
    echo "  ⚠️  PM2 daemon: NOT RUNNING"
fi

# Check server accessibility
echo ""
echo "🌐 Server Status:"
if curl -s -f "$APP_URL" >/dev/null 2>&1; then
    echo "  ✅ Server: ACCESSIBLE at $APP_URL"
else
    echo "  ℹ️  Server: NOT ACCESSIBLE (will start with start-kiosk.sh)"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "═══════════════════════════════════════"
echo "✅ Complete Kiosk Setup Finished!"
echo "═══════════════════════════════════════"
echo ""
echo "Configuration Summary:"
echo "  ✅ System sleep: DISABLED"
echo "  ✅ Screen auto-off: DISABLED"
echo "  ✅ Screen will stay ON always"
echo "  ✅ Autostart: Configured"
echo "  ✅ PM2 startup: Configured"
echo ""
echo "Kiosk mode akan auto-start pada boot/login."
echo ""
echo "To test sekarang:"
echo "  $KIOSK_DIR/start-kiosk.sh"
echo ""
echo "To verify configuration:"
echo "  - Sleep: cat /etc/systemd/logind.conf.d/no-sleep.conf"
echo "  - Autostart: cat $LABWC_AUTOSTART"
echo "  - PM2: pm2 status"
echo ""
echo "Changes will persist after reboot."
echo ""
