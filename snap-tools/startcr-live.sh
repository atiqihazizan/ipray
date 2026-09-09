#!/bin/bash
# Lancar kiosk chromium SAMA macam start-kiosk.sh (default profile, incognito)
# tetapi tambah --remote-debugging-port=9222 untuk CDP capture.
export DISPLAY=:0
exec /usr/lib/chromium/chromium \
  --js-flags=--no-decommit-pooled-pages --force-renderer-accessibility \
  --enable-remote-extensions --show-component-extension-options --enable-gpu-rasterization \
  --no-default-browser-check --disable-pings --media-router=0 --enable-remote-extensions --load-extension \
  --use-angle=gles --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --disable-restore-session-state --disable-features=TranslateUI --disable-ipc-flooding-protection \
  --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000 \
  --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows \
  --disable-breakpad --disable-client-side-phishing-detection --disable-component-update --disable-default-apps \
  --disable-dev-shm-usage --disable-extensions --disable-hang-monitor --disable-popup-blocking \
  --disable-prompt-on-repost --disable-sync --disable-translate --metrics-recording-only --no-first-run \
  --no-default-browser-check --no-pings --password-store=basic --use-mock-keychain \
  --enable-features=OverlayScrollbar --remote-debugging-port=9222 --user-data-dir --no-sandbox --incognito \
  --js-flags=--max-old-space-size=256 http://localhost:3000
