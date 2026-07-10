#!/bin/bash

# Script untuk setup disable sleep dan screen auto-off untuk iPray Kiosk Mode
# Script ini akan:
# 1. Disable system sleep/suspend/hibernate via systemd-logind
# 2. Disable screen auto-off (screen sentiasa on)
# 3. Update autostart configuration
# 4. Restart systemd-logind untuk apply changes

set -e

echo "═══════════════════════════════════════"
echo "Setup Sleep & Screen Disable"
echo "═══════════════════════════════════════"
echo ""

# Check if running as root for systemd config
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Some operations require sudo privileges"
    echo "   Script will prompt for sudo when needed"
    echo ""
fi

# Step 1: Disable system sleep via systemd-logind
echo "📝 Step 1: Disabling system sleep via systemd-logind..."
sudo mkdir -p /etc/systemd/logind.conf.d

# Create/update no-sleep config
sudo tee /etc/systemd/logind.conf.d/no-sleep.conf > /dev/null << 'EOF'
[Login]
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
IdleAction=ignore
EOF

echo "  ✅ Sleep disable config created: /etc/systemd/logind.conf.d/no-sleep.conf"
echo ""

# Step 2: Restart systemd-logind to apply changes
echo "🔄 Step 2: Restarting systemd-logind..."
sudo systemctl restart systemd-logind
sleep 2
if sudo systemctl is-active --quiet systemd-logind; then
    echo "  ✅ systemd-logind restarted successfully"
else
    echo "  ⚠️  systemd-logind may not be active (check status)"
fi
echo ""

# Step 3: Stop any existing screen auto-off processes
echo "🛑 Step 3: Stopping existing screen auto-off processes..."
pkill -f 'swayidle.*timeout 600' 2>/dev/null || true
sleep 1
if ! ps aux | grep -q '[s]wayidle.*timeout 600'; then
    echo "  ✅ Screen auto-off processes stopped"
else
    echo "  ⚠️  Some processes may still be running"
fi
echo ""

# Step 4: Update autostart file to remove screen auto-off
echo "📝 Step 4: Updating autostart configuration..."
AUTOSTART_FILE="$HOME/.config/labwc/autostart"

# Create backup
if [ -f "$AUTOSTART_FILE" ]; then
    cp "$AUTOSTART_FILE" "${AUTOSTART_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "  ✅ Backup created"
fi

# Create/update autostart file
mkdir -p "$(dirname "$AUTOSTART_FILE")"
cat > "$AUTOSTART_FILE" << 'EOF'
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

chmod +x "$AUTOSTART_FILE"
echo "  ✅ Autostart file updated: $AUTOSTART_FILE"
echo ""

# Step 5: Verification
echo "🔍 Step 5: Verifying configuration..."
echo ""

# Check systemd-logind config
if [ -f "/etc/systemd/logind.conf.d/no-sleep.conf" ]; then
    echo "  ✅ Sleep disable config: EXISTS"
    echo "     Content:"
    cat /etc/systemd/logind.conf.d/no-sleep.conf | sed 's/^/       /'
else
    echo "  ❌ Sleep disable config: NOT FOUND"
fi
echo ""

# Check systemd-logind status
if sudo systemctl is-active --quiet systemd-logind; then
    echo "  ✅ systemd-logind: ACTIVE"
else
    echo "  ⚠️  systemd-logind: NOT ACTIVE"
fi
echo ""

# Check screen auto-off processes
if ! ps aux | grep -q '[s]wayidle.*timeout 600'; then
    echo "  ✅ Screen auto-off: DISABLED (no processes running)"
else
    echo "  ⚠️  Screen auto-off: Still running (may need manual stop)"
fi
echo ""

# Check autostart file
if [ -f "$AUTOSTART_FILE" ] && ! grep -q 'swayidle.*timeout 600' "$AUTOSTART_FILE"; then
    echo "  ✅ Autostart file: Updated (no screen timeout)"
else
    echo "  ⚠️  Autostart file: May still have screen timeout"
fi
echo ""

echo "═══════════════════════════════════════"
echo "✅ Setup completed!"
echo "═══════════════════════════════════════"
echo ""
echo "Configuration Summary:"
echo "  ✅ System sleep: DISABLED"
echo "  ✅ Screen auto-off: DISABLED"
echo "  ✅ Screen will stay ON always"
echo "  ✅ System will NOT sleep/suspend/hibernate"
echo ""
echo "Changes will persist after reboot."
echo ""
echo "To verify after reboot:"
echo "  - Check: sudo systemctl status systemd-logind"
echo "  - Check: ps aux | grep swayidle"
echo "  - Check: cat /etc/systemd/logind.conf.d/no-sleep.conf"
echo ""
