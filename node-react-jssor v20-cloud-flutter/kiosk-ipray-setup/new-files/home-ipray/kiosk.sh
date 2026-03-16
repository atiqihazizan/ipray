#!/bin/bash

# biar X session siap dulu
sleep 5

# pastikan display untuk X (perlu bila script jalan dari autostart)
export DISPLAY=:0
export XAUTHORITY=/home/ipray/.Xauthority

# buka keyring dengan kata laluan kosong (elak "Authentication required - default keyring" selepas autologin)
eval "$(echo "" | gnome-keyring-daemon --unlock 2>/dev/null)" || true

# pilih screen: bila TV/monitor ON, set output connected sebagai primary
# bila TV OFF, xrandr tunjuk disconnected - tiada perubahan
/home/ipray/bin/set-primary-display.sh
# bila TV dihidupkan semula nanti, ulang semak setiap 30s
( while true; do sleep 30; /home/ipray/bin/set-primary-display.sh; done ) &

# profil kiosk berasingan (elak kunci profil default / conflict dengan proses lama)
CHROMIUM_PROFILE="${HOME}/.config/chromium-kiosk"
# bunuh chromium kiosk lama jika ada (supaya reboot sentiasa dapat launch bersih)
pkill -f "chromium.*chromium-kiosk" 2>/dev/null
sleep 1

# tunggu server hidup
until curl -s http://localhost:3000 >/dev/null; do
  sleep 2
done

# disable screen blank
xset s off
xset -dpms
xset s noblank

# background kosong (solid hitam)
xsetroot -solid black

# hide mouse
unclutter -idle 0 &

# benarkan audio dan set volume maksimum (ALSA)
amixer set PCM unmute 2>/dev/null || true
amixer set PCM 100% 2>/dev/null || true
amixer set Master unmute 2>/dev/null || true
amixer set Master 100% 2>/dev/null || true

# start window manager ringan
matchbox-window-manager &

# launch browser (profil kiosk sendiri, --no-sandbox untuk Pi)
# --autoplay-policy=no-user-gesture-required = wajib supaya audio/video boleh main tanpa klik (kiosk berbunyi)
chromium \
  --user-data-dir="$CHROMIUM_PROFILE" \
  --no-sandbox \
  --password-store=basic \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --incognito \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  --disable-dev-shm-usage \
  --disable-backgrounding-occluded-windows \
  --disable-background-timer-throttling \
  --js-flags="--max-old-space-size=256" \
  http://localhost:3000
