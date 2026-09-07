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

## Nota semasa terkini (Aug 2026)

- `react/src/contexts/DataContext.jsx` sudah di-refactor ke **backend-first**: fetch `/data/app`
  terus pada mount (3x retry 1.5s) → jatuh ke localStorage cache → ErrorPage jika tiada langsung.
  Socket.IO kekal untuk real-time sahaja (bukan gate fetch).
- Deploy hanya atas arahan eksplisit; kiosk server = `ipray@100.108.32.65`.