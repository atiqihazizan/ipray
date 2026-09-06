#!/usr/bin/env bash
# ============================================================================
# ipray-snap.sh — SATU command untuk snap + verify slide kiosk ipray.
#
# Guna (dari mana-mana sesi / terminal):
#   bash scripts/ipray-snap.sh [frames] [interval]
#   default: frames=4, interval=8 -> final ~70-90s.
#
# Aliran:
#   1. SSH: lancarkan ~/snap-tools/snap-live.sh di server (kiosk chromium
#      restart sementara + debug port, capture N frame CDP, restore kiosk)
#   2. Poll log server sehingga semua FRAME siap
#   3. Papar ringkasan FRAME (size + captions + text) untuk VERIFY slide jalan
#   4. Salin frame ke ~/Desktop/ipray-snap-<i>.png
#   5. Verdict: frame berbeza = OK; semua sama = STUCK (perlu siasat)
# ============================================================================
set -uo pipefail

HOST="ipray@100.108.32.65"
FRAMES="${1:-4}"
INTERVAL="${2:-8}"
DESKTOP="$HOME/Desktop"

# Unique run dir remote supaya tidak bercampur dengan run lama
RUN_DIR="snapshots/run-$(date +%s)"
REMOTE_LOG="snap-tools/snap-live.log"

echo "==> [1/5] Lancar snap di kiosk ($HOST) — ${FRAMES} frame @ ${INTERVAL}s..."
ssh -o ConnectTimeout=10 "$HOST" \
  "setsid nohup ~/snap-tools/snap-live.sh $FRAMES $INTERVAL ~/$RUN_DIR f >~/$REMOTE_LOG 2>&1 &"

# -- [2/5] Tunggu semua FRAME siap -------------------------------------------------
# Anggaran masa: settle 25s + 3s awal + frames*interval
SECS=$(( 28 + FRAMES * INTERVAL ))
MAX_WAIT=$(( SECS + 45 ))
waited=0
while [ $waited -lt $MAX_WAIT ]; do
  [[ "$(ssh -o ConnectTimeout=8 "$HOST" "grep -c FRAME ~/$REMOTE_LOG 2>/dev/null")" -ge "$FRAMES" ]] 2>/dev/null && break
  sleep 5
  waited=$(( waited + 5 ))
done

echo "==> [3/5] Keputusan (FRAME log):"
FRAME_LINES="$(ssh -o ConnectTimeout=8 "$HOST" "grep FRAME ~/$REMOTE_LOG 2>/dev/null")"
if [ -z "$FRAME_LINES" ]; then
  echo "!!! Tiada FRAME dalam log. Snapshot mungkin gagal."
  echo "    Log penuh server (~/$REMOTE_LOG):"
  ssh -o ConnectTimeout=8 "$HOST" "tail -30 ~/$REMOTE_LOG"
  exit 1
fi
echo "$FRAME_LINES"

# -- Heuristik verify: berapa saiz frame berbeza
SIZES="$(echo "$FRAME_LINES" | grep -oE 'size=[0-9]+' | md5sum)"   # kalau semua size sama, hash untuk set size juga sama
UNIQ="$(echo "$FRAME_LINES" | grep -oE 'size=[0-9]+' | sort -u | wc -l | tr -d ' ')"
TXT_UNIQ="$(echo "$FRAME_LINES" | grep -oE 'text=\[.*\]' | sort -u | wc -l | tr -d ' ')"

# -- [4/5] Salin frame ke Desktop ----------------------------------------------------
echo "==> [4/5] Salin ke Desktop..."
i=0
ok=0
for f in $(ssh -o ConnectTimeout=8 "$HOST" "ls ~/$RUN_DIR/f*.png 2>/dev/null"); do
  if scp -o ConnectTimeout=10 "$HOST:$f" "$DESKTOP/ipray-snap-$i.png" >/dev/null 2>&1; then ok=$(( ok + 1 )); fi
  i=$(( i + 1 ))
done
echo "    ${ok} frame disalin ke $DESKTOP/ipray-snap-0..N.png"

# -- [5/5] Verdict --------------------------------------------------------------------
echo "==> [5/5] Verdict:"
if [ "$TXT_UNIQ" -ge 2 ]; then
  echo "    OK — $TXT_UNIQ teks berbeza, tiap frame gambar berbeza. Slideshow berjalan."
elif [ "$UNIQ" -ge 2 ]; then
  echo "    OK — saiz frame berbeza (gambar berubah). Slideshow berjalan."
else
  echo "    STUCK — semua frame sama sahaja. Siasat: data tak masuk / reload loop / slider idle."
fi

echo "    Kiosk dipulihkan automatik oleh ~/snap-tools/snap-live.sh"