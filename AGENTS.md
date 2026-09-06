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

- Autostart kiosk: `~/.config/autostart/ipray-kiosk.desktop` → `~/start-kiosk.sh`
  (pm2 backend + chromium kiosk).
- Pulihkan kiosk (bila display down):
  `pkill -9 -x chromium; sleep 1; bash ~/start-kiosk.sh`
- **JANGAN `pkill -f chromium`** — pattern match untuk "chromium" turut membunuh shell SSH/script
  sendiri. Wajib `pkill -x chromium` (padan nama proses sahaja).
- Reboot: `sudo systemctl reboot` (ipray ada NOPASSWD sudo). Selepas reboot `/tmp` dibersihkan —
  tools kekal di `~/snap-tools`, snapshots di `~/snapshots`.
- Tools server `~/snap-tools/`: `snap-live.sh` (orchestrator), `snap-probe.js` (CDP capture +
  DOM dump, guna ws dari `~/kiosk/node_modules/ws`), `startcr-live.sh` (chromium + debug port).

## Nota semasa terkini (Aug 2026)

- `react/src/contexts/DataContext.jsx` sudah di-refactor ke **backend-first**: fetch `/data/app`
  terus pada mount (3x retry 1.5s) → jatuh ke localStorage cache → ErrorPage jika tiada langsung.
  Socket.IO kekal untuk real-time sahaja (bukan gate fetch).
- Deploy hanya atas arahan eksplisit; kiosk server = `ipray@100.108.32.65`.