#!/bin/bash
# =============================================================
# Snap slide "live" kiosk ipray via CDP.
# Guna UNTUK CHECK SLIDE BERJALAN (setiap frame berbeza = ok).
#
# CARA PAKAI:
#   ~/snap-tools/snap-live.sh [frames] [interval] [outdir]
#   default: 4 frame, 8 saat, ~/snapshots
#
# Aliran (systemd — backend & kiosk chromium diuruskan oleh
# ipray-kiosk.service / ipray-chromium.service, BUKAN PM2/start-kiosk.sh):
#   1. Rekod state asal kiosk (running atau stopped)
#   2. Stop ipray-chromium.service (backend systemd terus jalan, tak disentuh)
#   3. Lancar chromium debug port 9222 (profil default) via startcr-live.sh
#   4. Tunggu load, capture N frame + DOM dump (selidik teks/caption)
#   5. Bunuh chromium debug
#   6. Pulihkan ikut state asal sahaja — JANGAN start jika backend sepatutnya off
# =============================================================
FRAMES=${1:-4}
INTERVAL=${2:-8}
OUTDIR=${3:-$HOME/snapshots}
LOG=$HOME/snap-tools/snap-live.log
export DISPLAY=:0

# Rekod state asal backend sebelum snap
BACKEND_WAS_ACTIVE=false
if systemctl --user is-active --quiet ipray-kiosk.service 2>/dev/null; then
  BACKEND_WAS_ACTIVE=true
fi

# Jika backend tidak running, snap tidak boleh dilakukan
if [ "$BACKEND_WAS_ACTIVE" = "false" ]; then
  echo "[$(date)] Backend tidak aktif — snap dibatalkan (thermal off period?)" | tee -a "$LOG"
  exit 1
fi

systemctl --user stop ipray-chromium.service
pkill -9 -x chromium 2>/dev/null || true
sleep 2
nohup ~/snap-tools/startcr-live.sh >$HOME/snap-tools/cr.log 2>&1 &
for i in $(seq 1 30); do
  curl -s http://127.0.0.1:9222/json/version >/dev/null 2>&1 && break
  sleep 1
done
# Beri masa app fetch data + init slider dulu
sleep 25
cd /home/ipray/kiosk && node ~/snap-tools/snap-probe.js "$FRAMES" "$INTERVAL" "$OUTDIR" "$4"
RC=$?
pkill -9 -x chromium
sleep 3
# Pastikan port 3000 free sebelum restart
for i in $(seq 1 10); do
  ss -tln | grep -q ":3000" || break
  sleep 1
done
# Pulihkan Chromium HANYA jika backend memang aktif sebelum snap
exec systemctl --user start ipray-chromium.service
