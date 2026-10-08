#!/bin/bash
# =============================================================
# test-kiosk-update.sh — Ujian mock untuk scripts/kiosk-update.sh
#
# Membina repo git sementara (bare "hulu" + klon "kiosk") dan mock
# `systemctl` untuk menangkap panggilan. Tidak menyentuh kiosk sebenar.
#
#   bash scripts/test-kiosk-update.sh
# =============================================================

set -u
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
SCRIPT="$REPO_ROOT/scripts/kiosk-update.sh"

TMP="$(mktemp -d /tmp/kiosk-update-test.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }
check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (jangka: '$2', dapat: '$3')"; fi
}

# -----------------------------------------------------------
# Mock systemctl — rekod panggilan, balas is-active ikut env
# -----------------------------------------------------------
mkdir -p "$TMP/bin"
cat > "$TMP/bin/systemctl" << 'MOCK_EOF'
#!/bin/bash
echo "systemctl $*" >> "$SYSTEMCTL_CALLS"
case "$*" in
  *"is-active ipray-kiosk.service"*)
    echo "${KIOSK_SVC_STATE:-active}"
    [ "${KIOSK_SVC_STATE:-active}" = "active" ] && exit 0 || exit 3
    ;;
  *"is-active"*) echo "inactive"; exit 3 ;;
  *restart*) exit 0 ;;
  *) exit 0 ;;
esac
MOCK_EOF
chmod +x "$TMP/bin/systemctl"

export SYSTEMCTL_CALLS="$TMP/systemctl-calls.txt"
export KIOSK_SYSTEMCTL="$TMP/bin/systemctl"

# -----------------------------------------------------------
# Bina repo "hulu" (bare) + seed + klon "kiosk"
# -----------------------------------------------------------
git init --bare -q "$TMP/upstream.git"
git init -q "$TMP/seed"
cd "$TMP/seed"
git config user.email t@t; git config user.name t
mkdir -p services public setting utils data scripts
echo "v1" > services/apiServerService.js
echo "<html>v1</html>" > public/index.html
echo "<tab>v1</tab>" > setting/tab.html
echo "u1" > utils/logger.js
echo "k1" > main.js
echo "count-v1" > data/countdowns.txt
echo "img-v1" > data/images.txt
git add -A; git commit -qm init
git branch -M main
git remote add origin "$TMP/upstream.git"
git push -q origin main

git clone -q "$TMP/upstream.git" "$TMP/kiosk"
cd "$TMP/kiosk"
git config user.email t@t; git config user.name t
mkdir -p logs

# Data kiosk (tidak dijejak) — mesti kekal selepas kemas kini
echo "BEEP_SETS|2" > data/config.txt

# Takwim hari ini dengan waktu solat JAUH dari sekarang (±3 jam)
TODAY=$(date '+%d-%m-%Y')
now_min=$((10#$(date '+%H') * 60 + 10#$(date '+%M')))
fmt_time() { printf "%d:%02d" $(( ($1) / 60 % 24 )) $(( ($1) % 60 )); }
FAR1=$(fmt_time $((now_min + 180)))
FAR2=$(fmt_time $((now_min - 180)))
printf "%s 01-01-1448\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
  "$TODAY" "$FAR1" "$FAR1" "$FAR1" "$FAR2" "$FAR2" "$FAR2" "$FAR2" > data/takwim.txt

# -----------------------------------------------------------
# Helper
# -----------------------------------------------------------
push_change() { # push_change <file> <content>
  cd "$TMP/seed"
  echo "$2" > "$1"
  git add -A; git commit -qm "change $1" >/dev/null
  git push -q origin main
  cd "$TMP/kiosk"
}

run_update() { # run_update [extra env KEY=VAL ...]
  rm -f "$SYSTEMCTL_CALLS"; touch "$SYSTEMCTL_CALLS"
  env KIOSK_DIR="$TMP/kiosk" KIOSK_SYSTEMCTL="$TMP/bin/systemctl" \
      SYSTEMCTL_CALLS="$SYSTEMCTL_CALLS" "$@" \
      bash "$SCRIPT" >/dev/null 2>&1
  return $?
}

calls() { cat "$SYSTEMCTL_CALLS" 2>/dev/null | grep -v 'is-active' || true; }
restart_kiosk_calls()   { c=$(grep -c 'restart ipray-kiosk.service'   "$SYSTEMCTL_CALLS" 2>/dev/null); echo "${c:-0}"; }
restart_chromium_calls() { c=$(grep -c 'restart ipray-chromium.service' "$SYSTEMCTL_CALLS" 2>/dev/null); echo "${c:-0}"; }

echo "== Ujian kiosk-update.sh (tmp: $TMP) =="

# -----------------------------------------------------------
# 1. Tiada perubahan hulu → tiada restart, keluar 0
# -----------------------------------------------------------
run_update
check "1. tiada perubahan: keluar 0" "0" "$?"
check "1. tiada perubahan: tiada panggilan systemctl" "" "$(calls)"

# -----------------------------------------------------------
# 2. Perubahan services/ → restart penuh sekali
# -----------------------------------------------------------
push_change services/apiServerService.js "v2"
run_update
check "2. services/: keluar 0" "0" "$?"
check "2. services/: restart kiosk sekali" "1" "$(restart_kiosk_calls)"
check "2. HEAD dikemas kini" "$(git -C "$TMP/kiosk" rev-parse origin/main)" "$(git -C "$TMP/kiosk" rev-parse HEAD)"
check "2. config.txt kiosk kekal" "BEEP_SETS|2" "$(cat "$TMP/kiosk/data/config.txt")"

# -----------------------------------------------------------
# 3. Perubahan public/ sahaja → restart Chromium sahaja
# -----------------------------------------------------------
push_change public/index.html "<html>v2</html>"
run_update
check "3. public/: restart chromium sahaja" "1" "$(restart_chromium_calls)"
check "3. public/: tiada restart kiosk" "0" "$(restart_kiosk_calls)"

# -----------------------------------------------------------
# 4. Perubahan setting/ sahaja → tiada restart
# -----------------------------------------------------------
push_change setting/tab.html "<tab>v2</tab>"
run_update
check "4. setting/: tiada restart" "" "$(calls)"

# -----------------------------------------------------------
# 5. Data: hulu ubah countdowns.txt → hulu menang;
#    fail data tempatan lain (config.txt) kekal
# -----------------------------------------------------------
echo "local-edit" > "$TMP/kiosk/data/images.txt"   # suntingan UI tempatan
push_change data/countdowns.txt "count-v2"
push_change data/images.txt "img-v2"
run_update
check "5. countdowns hulu menang" "count-v2" "$(cat "$TMP/kiosk/data/countdowns.txt")"
check "5. images.txt hulu menang (berubah di hulu)" "img-v2" "$(cat "$TMP/kiosk/data/images.txt")"
check "5. config.txt kiosk kekal" "BEEP_SETS|2" "$(cat "$TMP/kiosk/data/config.txt")"
check "5. tiada restart (data sahaja)" "" "$(calls)"

# Suntingan UI sahaja (tiada perubahan hulu) — fail tempatan kekal
echo "ui-edit" > "$TMP/kiosk/data/images.txt"
run_update
check "5b. tiada hulu: suntingan UI kekal" "ui-edit" "$(cat "$TMP/kiosk/data/images.txt")"

# -----------------------------------------------------------
# 6. Tiada internet (remote hilang) → keluar 0, tiada perubahan
# -----------------------------------------------------------
git -C "$TMP/kiosk" remote set-url origin "$TMP/tiada.git"
OLD_HEAD=$(git -C "$TMP/kiosk" rev-parse HEAD)
run_update
check "6. tiada internet: keluar 0" "0" "$?"
check "6. HEAD tidak berubah" "$OLD_HEAD" "$(git -C "$TMP/kiosk" rev-parse HEAD)"
check "6. tiada panggilan systemctl" "" "$(calls)"
git -C "$TMP/kiosk" remote set-url origin "$TMP/upstream.git"

# -----------------------------------------------------------
# 7. Servis tidak aktif (thermal) → fail dikemas kini, tiada restart
# -----------------------------------------------------------
push_change services/apiServerService.js "v3"
KIOSK_SVC_STATE=inactive run_update
check "7. servis inactive: keluar 0" "0" "$?"
check "7. kod dikemas kini" "v3" "$(cat "$TMP/kiosk/services/apiServerService.js")"
check "7. tiada restart" "" "$(calls)"

# -----------------------------------------------------------
# 8. Tetingkap solat → restart ditangguh; larian seterusnya
#    (HEAD==origin/main) melaksanakannya bila selamat
# -----------------------------------------------------------
push_change services/apiServerService.js "v4"
# Takwim dengan waktu solat = SEKARANG (semua lajur solat)
NOWT=$(date '+%H:%M' | sed 's/^0//')
printf "%s 01-01-1448\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
  "$TODAY" "$NOWT" "$NOWT" "$NOWT" "$NOWT" "$NOWT" "$NOWT" "$NOWT" > "$TMP/kiosk/data/takwim.txt"
run_update
check "8. dalam tetingkap: tiada restart" "" "$(calls)"
check "8. kod tetap dikemas kini" "v4" "$(cat "$TMP/kiosk/services/apiServerService.js")"
[ -s "$TMP/kiosk/logs/kiosk-update.state" ] && ok "8. penanda tertunggak ditulis" || bad "8. penanda tertunggak tidak ditulis"

# Larian seterusnya, masih dalam tetingkap → masih tertangguh
run_update
check "8b. masih tetingkap: tiada restart" "" "$(calls)"

# Larian seterusnya, di luar tetingkap → restart dilaksanakan walaupun HEAD==origin/main
printf "%s 01-01-1448\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
  "$TODAY" "$FAR1" "$FAR1" "$FAR1" "$FAR2" "$FAR2" "$FAR2" "$FAR2" > "$TMP/kiosk/data/takwim.txt"
run_update
check "8c. luar tetingkap: restart tertunggak dilaksanakan" "1" "$(restart_kiosk_calls)"
[ ! -f "$TMP/kiosk/logs/kiosk-update.state" ] && ok "8c. penanda dibersihkan" || bad "8c. penanda tidak dibersihkan"

# -----------------------------------------------------------
# 9. Fail tidak dijejak yang bertembung ditimpa
# -----------------------------------------------------------
echo "local-untracked" > "$TMP/kiosk/public/newfile.txt"
push_change public/newfile.txt "upstream-version"
run_update
check "9. untracked bertembung: versi hulu menang" "upstream-version" "$(cat "$TMP/kiosk/public/newfile.txt")"

# -----------------------------------------------------------
echo ""
echo "== Keputusan: $PASS lulus, $FAIL gagal =="
[ "$FAIL" -eq 0 ]
