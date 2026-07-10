#!/bin/bash
# Salin imej dari nodejs/images/slides ke ipray, kemudian set satu sebagai Plymouth splash.
# Jalankan dari root projek: ./kiosk-ipray-setup/copy-slides-to-ipray.sh [nama-fail.png]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/../../nodejs/images/slides" && pwd)"
REMOTE="ipray"

echo "Salin folder slides ke ipray..."
ssh "$REMOTE" "mkdir -p ~/slides-upload"
scp "$SOURCE_DIR"/*.jpg "$SOURCE_DIR"/*.png "$REMOTE":~/slides-upload/ 2>/dev/null || true

# Arg 1: nama fail (e.g. bg-mta.jpg atau noimage.png). Plymouth lebih baik guna PNG.
SPLASH_IMG="${1:-noimage.png}"

echo "Set $SPLASH_IMG sebagai Plymouth splash di ipray..."
if [[ "$SPLASH_IMG" == *.jpg ]]; then
  ssh "$REMOTE" "command -v convert >/dev/null && convert ~/slides-upload/$SPLASH_IMG /tmp/splash.png && sudo cp /tmp/splash.png /usr/share/plymouth/themes/ipray-welcome/splash.png || sudo cp ~/slides-upload/$SPLASH_IMG /usr/share/plymouth/themes/ipray-welcome/splash.png"
else
  ssh "$REMOTE" "sudo cp ~/slides-upload/$SPLASH_IMG /usr/share/plymouth/themes/ipray-welcome/splash.png"
fi
ssh "$REMOTE" "sudo update-initramfs -u"

echo "Selesai. Reboot ipray untuk lihat splash baru."
echo "Semua imej juga ada di ipray:~/slides-upload/"
