#!/bin/bash
# =============================================================
# kiosk-install.sh — Setup penuh iPray Kiosk dari mula
#
# Jalankan pada device baru atau selepas format/reset:
#   bash kiosk-install.sh
#
# Prasyarat:
#   - Raspberry Pi OS (Wayland) dengan user 'ipray'
#   - Akses internet untuk clone repo & install packages
#   - SSH key sudah di-setup untuk github.com (atau guna HTTPS)
# =============================================================

set -e

REPO_URL="git@github.com:atiqihazizan/ipray-kiosk.git"
KIOSK_DIR="$HOME/kiosk"
USER_ID=$(id -u)
LOG_DIR="$KIOSK_DIR/logs"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()  { echo -e "\n${GREEN}==>${NC} $1"; }

# -------------------------------------------------------
step "1/8 — Semak prasyarat"
# -------------------------------------------------------
[ "$USER" = "ipray" ] || warn "User bukan 'ipray' ($USER) — pastikan path dalam service files betul"
command -v git >/dev/null || error "git tidak dijumpai. Pasang dulu: sudo apt install git"
command -v curl >/dev/null || error "curl tidak dijumpai. Pasang dulu: sudo apt install curl"

# -------------------------------------------------------
step "2/8 — Install Node.js v20 & packages"
# -------------------------------------------------------
if ! command -v node >/dev/null || [[ $(node -v) != v20* ]]; then
  info "Install Node.js v20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt install -y nodejs
else
  info "Node.js $(node -v) sudah ada"
fi

for pkg in chromium-browser unclutter; do
  if ! dpkg -l "$pkg" &>/dev/null; then
    info "Install $pkg..."
    sudo apt install -y "$pkg" || warn "$pkg tidak boleh dipasang — skip"
  else
    info "$pkg sudah ada"
  fi
done

# -------------------------------------------------------
step "3/8 — Clone repo"
# -------------------------------------------------------
if [ -d "$KIOSK_DIR/.git" ]; then
  info "Repo sudah ada — pull latest..."
  git -C "$KIOSK_DIR" pull origin main
else
  info "Clone repo ke $KIOSK_DIR..."
  git clone "$REPO_URL" "$KIOSK_DIR"
fi

info "npm install --production..."
cd "$KIOSK_DIR"
npm install --production
mkdir -p "$LOG_DIR"

# -------------------------------------------------------
step "4/8 — Buat start-kiosk-chromium.sh"
# -------------------------------------------------------
cat > "$HOME/start-kiosk-chromium.sh" << 'CHROMIUM_EOF'
#!/bin/bash
set +e

APP_URL="http://localhost:3000"

if [ -z "$DISPLAY" ]; then export DISPLAY=:0; fi

xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

pkill -f unclutter 2>/dev/null || true
sleep 1
if command -v unclutter-xfixes >/dev/null 2>&1; then
  unclutter-xfixes -idle 0.01 -root -noevents >/dev/null 2>&1 &
elif command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.01 -root -noevents >/dev/null 2>&1 &
fi

if command -v xsetroot >/dev/null 2>&1; then
  xsetroot -cursor_name none 2>/dev/null || true
  xsetroot -solid black 2>/dev/null || true
fi

amixer set PCM unmute 2>/dev/null || true
amixer set PCM 100% 2>/dev/null || true
amixer set Master unmute 2>/dev/null || true
amixer set Master 100% 2>/dev/null || true

CHROMIUM_CMD=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null)
[ -z "$CHROMIUM_CMD" ] && { echo "Chromium tidak dijumpai!"; exit 1; }

exec "$CHROMIUM_CMD" \
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
  --no-sandbox \
  --incognito \
  --js-flags="--max-old-space-size=256" \
  "$APP_URL"
CHROMIUM_EOF
chmod +x "$HOME/start-kiosk-chromium.sh"
info "start-kiosk-chromium.sh siap"

# -------------------------------------------------------
step "5/8 — Setup systemd user services"
# -------------------------------------------------------
mkdir -p "$HOME/.config/systemd/user"

cat > "$HOME/.config/systemd/user/ipray-kiosk.service" << EOF
[Unit]
Description=iPray Kiosk Backend (Node.js)
After=network.target
Wants=ipray-chromium.service

[Service]
Type=simple
WorkingDirectory=$KIOSK_DIR
ExecStart=/usr/bin/node main.js
Environment=NODE_ENV=production
Environment=PROD_MODE=true
Restart=on-failure
RestartSec=5
TimeoutStopSec=10
KillMode=mixed
KillSignal=SIGTERM
ExecStartPost=/bin/bash -c 'for i in \$(seq 1 60); do curl -sf http://localhost:3000 >/dev/null 2>&1 && exit 0; sleep 1; done; echo "Backend not ready after 60s" >&2; exit 1'

[Install]
WantedBy=default.target
EOF

cat > "$HOME/.config/systemd/user/ipray-chromium.service" << EOF
[Unit]
Description=iPray Kiosk Chromium (kiosk display)
After=ipray-kiosk.service graphical-session.target
BindsTo=ipray-kiosk.service
PartOf=ipray-kiosk.service

[Service]
Type=simple
Environment=WAYLAND_DISPLAY=wayland-0
Environment=XDG_RUNTIME_DIR=/run/user/$USER_ID
Environment=DISPLAY=:0
ExecStartPre=/bin/bash -c 'for i in \$(seq 1 60); do curl -sf http://localhost:3000 >/dev/null 2>&1 && exit 0; sleep 1; done; echo "Backend not ready after 60s" >&2; exit 1'
ExecStart=$HOME/start-kiosk-chromium.sh
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable ipray-kiosk.service ipray-chromium.service
sudo loginctl enable-linger "$USER"
info "systemd services siap"

# -------------------------------------------------------
step "6/8 — Journal persistent storage"
# -------------------------------------------------------
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/50-persistent-storage.conf > /dev/null << 'EOF'
[Journal]
Storage=persistent
EOF
sudo systemctl restart systemd-journald
info "Journal persistent storage diaktifkan"

# -------------------------------------------------------
step "7/8 — Health-check script"
# -------------------------------------------------------
cat > "$HOME/health-check.sh" << HEALTH_EOF
#!/bin/bash
# Health-check ipray kiosk — auto-restart jika mati dalam waktu aktif

LOG=$LOG_DIR/health-check.log
MAX_LOG=500

log() { echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" >> "\$LOG"; }

if [ -f "\$LOG" ] && [ \$(wc -l < "\$LOG") -ge \$MAX_LOG ]; then
  tail -200 "\$LOG" > "\$LOG.tmp" && mv "\$LOG.tmp" "\$LOG"
fi

KIOSK_ACTIVE=\$(systemctl --user is-active ipray-kiosk.service 2>/dev/null)
CHROMIUM_ACTIVE=\$(systemctl --user is-active ipray-chromium.service 2>/dev/null)

if [ "\$KIOSK_ACTIVE" = "active" ] && [ "\$CHROMIUM_ACTIVE" = "active" ]; then
  log "OK — kiosk:active chromium:active"
  exit 0
fi

log "WARN — kiosk:\$KIOSK_ACTIVE chromium:\$CHROMIUM_ACTIVE — cuba restart..."
systemctl --user restart ipray-kiosk.service >> "\$LOG" 2>&1
sleep 15

KIOSK_AFTER=\$(systemctl --user is-active ipray-kiosk.service 2>/dev/null)
CHROMIUM_AFTER=\$(systemctl --user is-active ipray-chromium.service 2>/dev/null)

if [ "\$KIOSK_AFTER" = "active" ]; then
  log "FIXED — restart berjaya (kiosk:\$KIOSK_AFTER chromium:\$CHROMIUM_AFTER)"
else
  log "ERROR — restart gagal (kiosk:\$KIOSK_AFTER chromium:\$CHROMIUM_AFTER)"
  journalctl --user -u ipray-kiosk.service -n 10 --no-pager 2>/dev/null >> "\$LOG"
fi
HEALTH_EOF

# Ganti LOG_DIR placeholder dengan path sebenar
sed -i "s|LOG_DIR|$LOG_DIR|g" "$HOME/health-check.sh"
chmod +x "$HOME/health-check.sh"
info "health-check.sh siap"

# -------------------------------------------------------
step "8/8 — Setup crontab"
# -------------------------------------------------------
XDG="XDG_RUNTIME_DIR=/run/user/$USER_ID"
DBUS="DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$USER_ID/bus"
SYSTEMCTL="/usr/bin/systemctl"
THERMAL_LOG="$LOG_DIR/cron-thermal.log"

# Buang entri lama (jika reinstall) dan tambah semula
(crontab -l 2>/dev/null | grep -v 'ipray-kiosk\|health-check'; cat << CRON_EOF
0 23 * * * $XDG $SYSTEMCTL --user stop ipray-kiosk.service >> $THERMAL_LOG 2>&1
0 5 * * * $XDG $SYSTEMCTL --user start ipray-kiosk.service >> $THERMAL_LOG 2>&1
*/15 5-22 * * * $XDG $DBUS $HOME/health-check.sh
CRON_EOF
) | crontab -
info "Crontab siap"

# -------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} Setup selesai! Mulakan kiosk sekarang:${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  systemctl --user start ipray-kiosk.service"
echo ""
echo "  Semak status:"
echo "  systemctl --user status ipray-kiosk.service ipray-chromium.service"
echo ""
echo "  Log:"
echo "  journalctl --user -u ipray-kiosk.service -f"
echo ""
