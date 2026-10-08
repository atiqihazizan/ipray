#!/bin/bash
# =============================================================
# kiosk-update.sh — Kemas kini ~/kiosk dari origin/main
#
# Dipanggil oleh cron setiap 10 minit (dipasang oleh kiosk-install.sh):
#   */10 * * * * ~/kiosk/scripts/kiosk-update.sh >> ~/kiosk/logs/kiosk-update.log 2>&1
#
# Perilaku:
#   - fetch origin main; jika gagal (tiada internet) → log ringkas, keluar 0
#   - HEAD == origin/main → tiada apa (kecuali restart tertunggak)
#   - Ada perubahan → backup data/, reset --hard, pulih data kiosk
#     (fail data yang berubah di hulu menang), kemudian restart mengikut
#     jenis fail berubah — dengan perlindungan tetingkap solat & thermal.
#
# Override env (untuk ujian): KIOSK_DIR, KIOSK_SYSTEMCTL,
#   KIOSK_UPDATE_LOG, KIOSK_UPDATE_STATE, KIOSK_UPDATE_LOCK
# =============================================================

set -u

KIOSK_DIR="${KIOSK_DIR:-$HOME/kiosk}"
LOG_DIR="$KIOSK_DIR/logs"
LOG_FILE="${KIOSK_UPDATE_LOG:-$LOG_DIR/kiosk-update.log}"
STATE_FILE="${KIOSK_UPDATE_STATE:-$LOG_DIR/kiosk-update.state}"
LOCK_FILE="${KIOSK_UPDATE_LOCK:-$LOG_DIR/kiosk-update.lock}"
SCTL="${KIOSK_SYSTEMCTL:-systemctl}"
MAX_LOG=500

mkdir -p "$LOG_DIR" 2>/dev/null || true

# -----------------------------------------------------------
# Self re-exec: skrip ini sendiri mungkin digantikan oleh
# `git reset --hard` separuh jalan — jalankan salinan di /tmp.
# -----------------------------------------------------------
if [ -z "${KIOSK_UPDATE_REEXEC:-}" ]; then
  TMPSELF="$(mktemp "${TMPDIR:-/tmp}/kiosk-update.XXXXXX.sh")" || TMPSELF=""
  if [ -n "$TMPSELF" ]; then
    cp "$0" "$TMPSELF" && chmod +x "$TMPSELF" || { rm -f "$TMPSELF"; TMPSELF=""; }
  fi
  if [ -n "$TMPSELF" ]; then
    KIOSK_UPDATE_REEXEC=1 KIOSK_UPDATE_SELF_TMP="$TMPSELF" exec bash "$TMPSELF" "$@"
  fi
  # mktemp gagal — teruskan dengan fail asal (risiko kecil diterima)
  export KIOSK_UPDATE_REEXEC=1
fi
BACKUP_DIR=""
LOCK_DIR=""
cleanup() {
  rm -f "${KIOSK_UPDATE_SELF_TMP:-}"
  [ -n "$BACKUP_DIR" ] && rm -rf "$BACKUP_DIR"
  [ -n "$LOCK_DIR" ] && rmdir "$LOCK_DIR" 2>/dev/null
}
trap cleanup EXIT

# Env untuk systemctl --user dari cron (tanpa sesi logind penuh)
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Putaran ringkas: kekalkan ~200 baris terakhir bila melebihi MAX_LOG
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)" -ge "$MAX_LOG" ]; then
  tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

# -----------------------------------------------------------
# Lock — elak dua larian bertindih (flock; fallback mkdir lock)
# -----------------------------------------------------------
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "kemas kini lain sedang berjalan — keluar"
    exit 0
  fi
else
  LOCK_DIR="$LOCK_FILE.d"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    log "kemas kini lain sedang berjalan — keluar"
    exit 0
  fi
fi

cd "$KIOSK_DIR" || { log "ERROR: $KIOSK_DIR tidak wujud"; exit 1; }

# -----------------------------------------------------------
# Baca margin tetingkap solat dari config.txt (jika ada)
# -----------------------------------------------------------
prayer_margin_min() {
  local v
  v=$(grep -E '^KIOSK_UPDATE_PRAYER_MARGIN_MIN\|' "$KIOSK_DIR/data/config.txt" 2>/dev/null | head -1 | cut -d'|' -f2 | tr -d ' \r')
  case "$v" in
    ''|*[!0-9]*) echo 20 ;;
    *) echo "$v" ;;
  esac
}

# -----------------------------------------------------------
# in_prayer_window: benar jika masa kini dalam ±margin minit
# daripada mana-mana waktu solat hari ini (subuh/zohor/asar/
# maghrib/isyak — lajur 3,5,6,7,8 dalam data/takwim.txt).
# Urutan amaran→azan→iqamah→solat terletak dalam margin ini.
# Jika takwim tiada/invalid → dianggap di luar tetingkap.
# -----------------------------------------------------------
in_prayer_window() {
  local takwim="$KIOSK_DIR/data/takwim.txt"
  [ -f "$takwim" ] || return 1
  local today line now_min margin
  today=$(date '+%d-%m-%Y')
  line=$(grep -E "^${today}[[:space:]]" "$takwim" | head -1)
  [ -n "$line" ] || return 1
  now_min=$((10#$(date '+%H') * 60 + 10#$(date '+%M')))
  margin=$(prayer_margin_min)
  local t hm hh mm tmin diff
  for t in $(echo "$line" | awk -F'\t' '{print $3, $5, $6, $7, $8}'); do
    hm=$(echo "$t" | grep -oE '[0-9]{1,2}:[0-9]{2}')
    [ -n "$hm" ] || continue
    hh=${hm%%:*}; mm=${hm##*:}
    tmin=$((10#$hh * 60 + 10#$mm))
    diff=$((now_min - tmin)); [ "$diff" -lt 0 ] && diff=$((-diff))
    if [ "$diff" -le "$margin" ]; then
      echo "$hm"
      return 0
    fi
  done
  return 1
}

kiosk_active() {
  [ "$("$SCTL" --user is-active ipray-kiosk.service 2>/dev/null)" = "active" ]
}

# -----------------------------------------------------------
# do_restart <action> — action: restart-kiosk | restart-chromium
# Pulang 0 jika restart dibuat ATAU sengaja dilangkau (servis
# tidak aktif — kod baharu akan dipakai bila servis mula semula).
# Pulang 1 jika ditangguh kerana tetingkap solat.
# -----------------------------------------------------------
do_restart() {
  local action="$1"
  if ! kiosk_active; then
    log "ipray-kiosk.service tidak aktif (tetingkap thermal?) — tiada restart; kod baharu dipakai bila servis mula"
    return 0
  fi
  local near
  if near=$(in_prayer_window); then
    log "TANGGUH restart ($action) — dalam tetingkap solat (hampir $near, margin $(prayer_margin_min)m)"
    return 1
  fi
  case "$action" in
    restart-kiosk)
      log "restart ipray-kiosk.service (Chromium turut restart via BindsTo)"
      "$SCTL" --user restart ipray-kiosk.service >> "$LOG_FILE" 2>&1
      ;;
    restart-chromium)
      log "restart ipray-chromium.service sahaja (perubahan public/)"
      "$SCTL" --user restart ipray-chromium.service >> "$LOG_FILE" 2>&1
      ;;
  esac
  return 0
}

set_pending() { echo "$1" > "$STATE_FILE"; }
clear_pending() { rm -f "$STATE_FILE"; }

# -----------------------------------------------------------
# 1. Fetch
# -----------------------------------------------------------
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o BatchMode=yes -o ConnectTimeout=15}"
if ! git fetch origin main >> "$LOG_FILE" 2>&1; then
  log "fetch origin main gagal (tiada internet?) — skip"
  exit 0
fi

NEW="$(git rev-parse origin/main 2>/dev/null)"
OLD="$(git rev-parse HEAD 2>/dev/null)"
[ -n "$NEW" ] || { log "ERROR: origin/main tidak dapat dibaca"; exit 1; }

# -----------------------------------------------------------
# 2. Tiada perubahan — laksanakan restart tertunggak jika ada
# -----------------------------------------------------------
if [ "$OLD" = "$NEW" ]; then
  if [ -s "$STATE_FILE" ]; then
    PENDING="$(cat "$STATE_FILE" 2>/dev/null)"
    log "restart tertunggak dikesan ($PENDING) — cuba laksanakan"
    if do_restart "$PENDING"; then
      clear_pending
    fi
  fi
  exit 0
fi

# -----------------------------------------------------------
# 3. Ada perubahan — backup data/, reset --hard, pulih data
# -----------------------------------------------------------
SHORT_CHANGED="$(git diff --name-only "$OLD" "$NEW" | head -20 | tr '\n' ' ')"
log "kemas kini $OLD -> $NEW | fail: $SHORT_CHANGED"

# Sandaran di bawah $KIOSK_DIR (bukan /tmp — sama filesystem, pantas
# dengan hardlink `cp -al`; fallback `cp -a`). Dibersihkan oleh trap EXIT.
# Dirangkumi: data/ (tetapan kiosk) dan images/ (boleh diubah tempatan).
BACKUP_DIR="$KIOSK_DIR/.kiosk-update-backup"
rm -rf "$BACKUP_DIR"; mkdir -p "$BACKUP_DIR"
for d in data images; do
  [ -d "$KIOSK_DIR/$d" ] || continue
  cp -al "$KIOSK_DIR/$d" "$BACKUP_DIR/$d" 2>/dev/null || \
    cp -a "$KIOSK_DIR/$d" "$BACKUP_DIR/$d" 2>/dev/null || \
    log "WARN: sandaran $d/ gagal"
done

if ! git reset --hard "$NEW" >> "$LOG_FILE" 2>&1; then
  log "ERROR: git reset --hard $NEW gagal — pulih data/images dari sandaran, tiada restart"
  for d in data images; do
    [ -d "$BACKUP_DIR/$d" ] && cp -a "$BACKUP_DIR/$d/." "$KIOSK_DIR/$d/" 2>/dev/null || true
  done
  exit 1
fi

# Pulih fail kiosk: semua fail sandaran KECUALI yang berubah di
# hulu dalam kemas kini ini (versi hulu menang untuk fail itu).
for d in data images; do
  [ -d "$BACKUP_DIR/$d" ] || continue
  UPSTREAM_LIST="$(git diff --name-only "$OLD" "$NEW" -- "$d/" || true)"
  (cd "$BACKUP_DIR/$d" && find . -type f -print) | while read -r rel; do
    rel="${rel#./}"
    if ! echo "$UPSTREAM_LIST" | grep -qxF "$d/$rel"; then
      mkdir -p "$KIOSK_DIR/$d/$(dirname "$rel")" 2>/dev/null || true
      cp -a "$BACKUP_DIR/$d/$rel" "$KIOSK_DIR/$d/$rel" 2>/dev/null || true
    else
      log "$d/$rel: versi hulu menang (tempatan tidak dipulih)"
    fi
  done
done
rm -rf "$BACKUP_DIR"; BACKUP_DIR=""

[ -f "$KIOSK_DIR/data/config.txt" ] || log "WARN: data/config.txt tidak dijumpai selepas kemas kini"

# -----------------------------------------------------------
# 4. Putuskan tindakan daripada senarai fail berubah
# -----------------------------------------------------------
CHANGED="$(git diff --name-only "$OLD" "$NEW")"
ACTION="none"

if echo "$CHANGED" | grep -qE '^(services/|utils/|main\.js$|package(-lock)?\.json$)'; then
  ACTION="restart-kiosk"
elif echo "$CHANGED" | grep -qE '^public/'; then
  ACTION="restart-chromium"
fi

# Gabung restart tertunggak daripada larian sebelumnya:
# restart-kiosk mengatasi restart-chromium (ia turut restart Chromium).
PENDING="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [ "$PENDING" = "restart-kiosk" ]; then
  ACTION="restart-kiosk"
elif [ "$ACTION" = "none" ] && [ -n "$PENDING" ]; then
  ACTION="$PENDING"
fi

if echo "$CHANGED" | grep -qE '^package(-lock)?\.json$'; then
  log "WARN: package*.json berubah — perlu 'npm ci' manual di kiosk"
fi

log "tindakan: $ACTION"

if [ "$ACTION" = "none" ]; then
  exit 0
fi

# -----------------------------------------------------------
# 5. Restart dengan perlindungan (thermal + tetingkap solat)
# -----------------------------------------------------------
if do_restart "$ACTION"; then
  clear_pending
else
  set_pending "$ACTION"
fi
exit 0
