#!/bin/bash
# Script untuk build dengan production mode
# Usage: ./build-prod.sh [appimage|deb|all]

export PROD_MODE=true

case "$1" in
  appimage)
    echo "Building AppImage dengan production mode..."
    electron-builder --linux AppImage
    ;;
  deb)
    echo "Building DEB dengan production mode..."
    electron-builder --linux deb
    ;;
  all)
    echo "Building semua format dengan production mode..."
    electron-builder --linux --win --mac
    ;;
  *)
    echo "Building Linux dengan production mode..."
    electron-builder --linux
    ;;
esac
