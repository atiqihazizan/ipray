#!/bin/bash
# Test script untuk time validation dan RTC persist
# Gunakan ini untuk test di kiosk

echo "=== Test 1: Masa Invalid (1970) ==="
echo "Set masa ke 1970-01-01 00:00:00"
ssh ipray@ipray.local "sudo date -s '1970-01-01 00:00:00'"
echo "Restart ipray-kiosk.service"
ssh ipray@ipray.local "systemctl --user restart ipray-kiosk.service"
echo "Tunggu 5 saat..."
sleep 5
echo "Check status backend:"
ssh ipray@ipray.local "systemctl --user status ipray-kiosk.service --no-pager"
echo "Check masa system:"
ssh ipray@ipray.local "date"
echo "Expected: Masa 1970, tapi prayer sequence TIDAK trigger (console log warning)"
echo ""

echo "=== Test 2: Set Masa Betul dari UI ==="
echo "Buka setting UI di browser dan set masa ke masa sekarang"
echo "Atau guna curl:"
CURRENT_DATE=$(date +"%Y-%m-%d %H:%M:%S")
echo "curl -X POST http://ipray.local:3000/api/time/set -H 'Content-Type: application/json' -d '{\"dateTime\": \"$CURRENT_DATE\"}'"
echo ""

echo "=== Test 3: Verify RTC Persist ==="
echo "Set masa betul..."
ssh ipray@ipray.local "sudo date -s '$CURRENT_DATE'"
echo "Sync ke RTC..."
ssh ipray@ipray.local "sudo hwclock -w"
echo "Reboot kiosk (manual - tekan butang reboot atau sudo reboot)"
echo "Selepas reboot, check masa:"
echo "ssh ipray@ipray.local 'date'"
echo "Expected: Masa kekal sama (tidak kembali ke 1970)"
echo ""

echo "=== Test 4: Force Re-sync ==="
echo "Set masa betul melalui UI, check console log:"
echo "Expected: '[DataContext] Time system updated, forcing re-sync...'"
echo "Masa frontend patut update serta-merta tanpa reload"
