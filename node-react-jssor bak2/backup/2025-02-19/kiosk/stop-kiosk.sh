#!/bin/bash

# Script untuk stop kiosk mode

echo "Stopping iPray Kiosk Mode..."

# Stop Chromium
pkill -f "chromium.*kiosk" 2>/dev/null || true
echo "✅ Chromium stopped"

# Stop PM2 app (optional - comment out jika mahu keep running)
# pm2 stop ipray-kiosk 2>/dev/null || true
# echo "✅ Backend stopped"

echo "Kiosk mode stopped"
