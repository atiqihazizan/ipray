#!/bin/bash

# Autostart script untuk kiosk mode
# Script ini akan dijalankan pada boot/login
# Place di ~/.config/autostart/ atau ~/.xprofile

# Set DISPLAY jika tidak set
export DISPLAY=:0

# Wait untuk display ready
sleep 5

# Start kiosk mode (run in background untuk autostart)
"$HOME/kiosk/kiosk/start-kiosk.sh" > /tmp/ipray-kiosk.log 2>&1 &
