# iPray Kiosk — Panduan Operasi & Snapshot

Projek iPray: kiosk display masjid. Frontend React di `react/`, backend Node di `nodejs/`.
Server kiosk: `ipray@100.108.32.65` (kiosk server — BUKAN mahsites). Deploy ke ~~/kiosk.

## Bilakah arahan "snap" / "check slide berjalan" diminta

> "snap image", "snap sekali lagi", "check slide berjalan / betul / baik"

Maknanya: **verify slideshow berjalan dengan betul** di kiosk. Jika slide idle/stuck, mesti
dilaporkan (bukan sekadar beri gambar).

### Kaedah yang BETUL — CDP ke instance LIVE (SATU command)

**Command rasmi tunggal** (dari mesin tempatan, jalan sekali untuk semuanya —
snap + verify + copy ke Desktop + restore kiosk):

```bash
bash scripts/ipray-snap.sh [frames] [interval]     # default 4, 8 (~70-90s)
```

Ia akan print ringkasan `FRAME size=.. captions=.. text=[..]`, salin gambar ke
`~/Desktop/ipray-snap-0..N.png`, dan bagi verdict OK/STUCK berdasarkan sama ada
frame berbeza. Guna `bash` (bukan `./` secara terus) supaya portabel.

Guna args: `ipray-snap.sh <frames> <interval>`. Contoh `bash scripts/ipray-snap.sh 6 10`
untuk jangka masa lebih lama / lebih banyak frame.

Nota: jangan lari skrip ini semasa kiosk tengah penting (azan/iqamah/solat) kerana
ia restart chromium seketika — login FRAME log akan confirm slide berbeza setiap run.

Sebagai alternatif manual di server: `~/snap-tools/snap-live.sh` (orchestrator),
output ke `~/snapshots/`, kiosk auto-restore.

### Cara baca keputusan

Log FRAME menunjukkan: `size=... captions=... text=[...]`.

- **SETIAP frame berbeza** (text berbeza, contoh Kuliah countdown vs Jadual Kuliah vs Home+solat)
  → slideshow OK.
- **Semua frame sama** + `text` sama → slider stuck → siasat (data tak masuk, reload loop, dsb).

### Mengapa BUKAN guna scrot/ffmpeg/headless

- `scrot` / `ffmpeg -f x11grab` → imej hitam kecil (~6KB) kerana Chromium render guna GPU
  (ANGLE/gles) yang tak masuk framebuffer X11. JANGAN guna.
- Instance Chromium **profil berasingan** (cth `--user-data-dir /tmp/...`) → STUCK (jadi
  client socket kedua, LoadingPage / 1 slide, reload loop). JANGAN. Sentiasa capture dari
  instance LIVE: restart chromium dengan profil default (`--user-data-dir` kosong) + tambah
  `--remote-debugging-port=9222`, kemudian PULIHKAN via `~/start-kiosk.sh`.
- Headless `chromium --headless --screenshot` → hang. JANGAN.

## Server ops penting

### Process manager: systemd (bukan PM2 — Sep 2026)
Migrasi dari PM2 + XDG autostart ke systemd user services. PM2 dan autostart `.desktop`
sudah disabled.

| Service | Perihal |
|---|---|
| `ipray-kiosk.service` | Node.js backend — `Restart=on-failure`, `Wants=ipray-chromium` |
| `ipray-chromium.service` | Chromium kiosk — `BindsTo=ipray-kiosk`, auto-stop/start ikut backend |

**Commands:**
```bash
# Status
systemctl --user status ipray-kiosk.service ipray-chromium.service

# Restart backend (Chromium turut restart automatik via BindsTo)
systemctl --user restart ipray-kiosk.service

# Stop/start manual
systemctl --user stop ipray-kiosk.service     # stop kedua-dua (Chromium ikut)
systemctl --user start ipray-kiosk.service    # start kedua-dua

# Log
journalctl --user -u ipray-kiosk.service -u ipray-chromium.service -f
```

**Crontab thermal (masih aktif):**
- `23:00` — `systemctl --user stop ipray-kiosk.service` (Chromium auto-stop)
- `05:00` — `systemctl --user start ipray-kiosk.service` (Chromium auto-start)
- Log: `~/kiosk/logs/cron-thermal.log`

**Pulihkan kiosk (bila display down):**
```bash
systemctl --user restart ipray-chromium.service
```

**JANGAN `pkill -f chromium`** — pattern match turut membunuh shell SSH/script sendiri.
Wajib `pkill -x chromium` jika perlu kill manual.

- Reboot: `sudo systemctl reboot` (ipray ada NOPASSWD sudo). Selepas reboot `/tmp` dibersihkan —
  tools kekal di `~/snap-tools`, snapshots di `~/snapshots`.
- Tools server `~/snap-tools/`: `snap-live.sh` (orchestrator, dikemaskini untuk systemd),
  `snap-probe.js` (CDP capture + DOM dump, guna ws dari `~/kiosk/node_modules/ws`),
  `startcr-live.sh` (chromium + debug port).
- `~/start-kiosk.sh` — dikekalkan sebagai rujukan/fallback manual sahaja (tidak dipakai autostart).
- `~/start-kiosk-chromium.sh` — wrapper Chromium yang dipakai oleh `ipray-chromium.service`.

## Rangkaian kiosk (WiFi ↔ Hotspot)

**Satu mod pada satu masa**, bertukar automatik:

- **Mod WiFi:** kiosk sambung ke WiFi tersimpan + ada internet.
- **Mod Hotspot:** jika WiFi putus **atau** internet tiada ~3 minit berturut, kiosk naikkan
  `iPray-Hotspot` (AP 10.42.0.1). Cuba kembali ke WiFi tiap ~5 minit **hanya jika tiada klien**
  pada hotspot (`iw station dump`).
- Profil WiFi: `autoconnect yes`, `autoconnect-priority 100`. Hotspot `ipray-hotspot`:
  `priority -999`, `band bg`, `channel 6`. Negara WiFi `MY` kekal.

### Akses dalam mod hotspot
Sambung telefon/laptop ke `iPray-Hotspot`, buka **`http://10.42.0.1/`** (port 80 melalui
nginx → panel tetapan). Port 3001 **tidak** dibuka dalam UFW — jangan guna `:3001` dari
klien hotspot. Kata laluan hotspot dalam `HOTSPOT_DEFAULTS` di
`nodejs/services/apiServerService.js` — **jangan cetak dalam log/laporan**.

### Peraturan UFW diperlukan (dijalankan pengguna)
Supaya klien hotspot terima DHCP/DNS, peraturan ini mesti wujud pada `wlan0` sahaja
(`kiosk-install.sh` turut menambahnya secara idempoten, tetapi pengguna mengesahkannya):
```bash
sudo ufw allow in on wlan0 to any port 67 proto udp   # DHCP
sudo ufw allow in on wlan0 to any port 53             # DNS (udp+tcp)
sudo ufw status                                        # sahkan — port 3001 JANGAN dibuka
```
Selepas itu sahkan: telefon sambung `iPray-Hotspot` → dapat `10.42.0.x` → `http://10.42.0.1/` buka UI.

### Komponen
- `~/network-monitor/network-monitor.js` — skrip pemantau (disalin oleh `scripts/kiosk-install.sh`
  dari `scripts/network-monitor.js`). Subarahan: `tick`, `connect-now <profil>`, `scan`,
  `status`, `enable-hotspot --hold <min>`, `disable-hotspot`.
- `ipray-network-monitor.timer` + `.service` — systemd **user** units, tick ~30s
  (`OnUnitActiveSec=30s`, `OnBootSec=45s`).
- Keadaan: `~/network-monitor/state.json`; cache imbasan: `~/network-monitor/scan-cache.json`;
  lock: `~/network-monitor/netmon.lock`.
- Log: `~/kiosk/logs/network-monitor.log` (~500 baris, putaran dalaman).

### Tunables (via `~/kiosk/data/config.txt`)
`NETMON_FAIL_MS` (lalai 180000), `NETMON_RETRY_MS` (300000), `NETMON_HOLD_MS` (1800000),
`NETMON_CONNECT_TIMEOUT_MS` (45000), `NETMON_SCAN_INTERVAL_MS` (300000),
`NETMON_INTERNET_CHECK` (`1`; set `0` jika kiosk di rangkaian tanpa internet),
`NETMON_NONE_GRACE_MS` (90000).

### API (local sahaja, port 3001)
- `GET /api/wifi/scan` — imbasan hidup `iw` (fallback: cache dengan `cached:true`)
- `GET /api/wifi/status` — mod, SSID, IP, isyarat, klien hotspot, sebab, hasil connect-now
- `GET /api/wifi/profiles` — senarai profil WiFi tersimpan (tanpa kata laluan)
- `POST /api/wifi/configure` — **simpan sahaja** (tidak menyentuh wlan0)
- `POST /api/wifi/connect-now` `{name}` — cuba WiFi sekarang (~45s, async → 202)
- `POST /api/wifi/profile/delete` `{name}` — padam profil (bukan aktif/hotspot)
- `POST /api/wifi/hotspot/enable` `{holdMinutes?}` / `disable` — up/down profil (tak padam)

### Pulih manual (jika tersangkut)
```bash
# Semak status pemantau
systemctl --user status ipray-network-monitor.timer
tail -50 ~/kiosk/logs/network-monitor.log
# Paksa ke WiFi secara manual
sudo nmcli connection up "<nama-profil-wifi>"
# Paksa hotspot semula
sudo nmcli connection up ipray-hotspot
# Henti pemantau sementara
systemctl --user stop ipray-network-monitor.timer
```

**Amaran:** SSH melalui Tailscale mati dalam mod hotspot (tiada internet). Perubahan rangkaian
mesti ada mekanisme pulih (`systemd-run --on-active=...` watchdog) dan akses fizikal/hotspot.
Kata laluan WiFi/hotspot **jangan** dicetak dalam log, laporan atau komit.

### Deployment ciri rangkaian
**Tidak automatik.** `.github/workflows/sync-to-kiosk.yml` hanya sync `public/`,
`timeService.js`, `images.txt`, `countdowns.txt` — ia TIDAK sync `apiServerService.js`,
`nodejs/setting/**` atau `scripts/**`. Deploy memerlukan langkah manual di kiosk
(jalankan semula `scripts/kiosk-install.sh` dari repo yang telah di-pull, atau salin fail
+ pasang unit secara manual). Jangan push/merge ke `main` atau deploy tanpa arahan eksplisit.

## Nota semasa terkini (Aug 2026)

- `react/src/contexts/DataContext.jsx` sudah di-refactor ke **backend-first**: fetch `/data/app`
  terus pada mount (3x retry 1.5s) → jatuh ke localStorage cache → ErrorPage jika tiada langsung.
  Socket.IO kekal untuk real-time sahaja (bukan gate fetch).
- Deploy hanya atas arahan eksplisit; kiosk server = `ipray@100.108.32.65`.

## Time Management & Validation (Oct 2026)

### Masa Invalid (CMOS/RTC Rosak - Tahun 1970)

Sistem kini ada validation untuk detect masa invalid (tahun < 2020) yang menunjukkan CMOS/RTC battery rosak:

- **Frontend validation**: `getCurrentIslamicTime` (islamicTimeUtils.js) check `year < 2020`
- **Behavior bila invalid**:
  - Time/date component tidak dipaparkan
  - Prayer sequence (warning, azan, iqamah) di-skip
  - Slideshow terus berjalan normal
  - Console log: `[TimeDriver] Invalid time detected, skipping prayer sequence`

### RTC Persist (Hardware Clock)

Bila set datetime dari UI (`POST /api/time/set`), masa kini persist ke hardware clock:

- **Backend**: `timeService.setSystemClock()` sekarang jalankan `sudo hwclock -w` selepas `sudo date -s`
- **Manfaat**: Masa kekal selepas reboot/restart (tidak kembali ke 1970)
- **Requirement**: Pastikan user ada sudo privileges (tanpa password prompt)

### Force Re-sync Tanpa Reload

Bila datetime di-update dari UI, frontend force re-sync masa tanpa reload halaman:

- **Backend**: Broadcast event `time-system-updated` via Socket.IO
- **Frontend**: Handler di `DataContext.jsx` panggil `timeServiceStub.forceSync()`
- **Behavior**: Masa update serta-merta, slideshow smooth, sequence tidak terputus

### Testing

Gunakan script `test-time-validation.sh` untuk test:
```bash
./test-time-validation.sh
```

Test steps:
1. Set masa ke 1970 → verify prayer sequence skip
2. Set masa betul dari UI → verify force re-sync
3. Reboot → verify RTC persist (masa kekal)