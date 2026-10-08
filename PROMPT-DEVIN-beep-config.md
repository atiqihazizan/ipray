# PROMPT FOR DEVIN — Beep masuk waktu boleh dilaras dari tetapan

## Konteks

Projek iPray: kiosk display masjid. Frontend React di `react/`, backend Node di `nodejs/`. Baca `AGENTS.md` dahulu.

Beep masuk waktu dimainkan di browser kiosk oleh `react/src/services/beepService.js` (Web Audio API). Ia dipanggil sebagai `beepService.beep(6, transitionToIqamah)` di `react/src/hooks/useTimeDriver.js:485`. Parameter bunyi sekarang hardcode (`DEFAULTS`, `PATTERNS`, dan nombor tetap dalam `beep()`). `setParams()` hanya dipanggil dari halaman `/?beep` dan hilang bila reload.

Pengguna telah memilih satu bunyi dan mahu ia boleh dilaras dari tetapan Node.js (`nodejs/setting`).

**Bunyi pilihan (emulasi buzzer piezo):**
- Gelombang segi empat 2800 Hz dilalukan melalui penapis bandpass resonan (Q=3, tengah 2800 Hz), dengan ekor ring-down ~25ms.
- Beep 120ms, jeda dalam double 100ms (double = beep, jeda, beep).
- Puncak ternormal 0.9.
- 6 set, jeda antara set 1000ms, lead-in senyap 200ms sebelum beep pertama.

## Tugas

### 1. `nodejs/data/config.txt` dan `dataService.parseConfig()`

`parseConfig()` ada di `nodejs/services/dataService.js:1952`. Tambah kunci berikut dengan `clamp`. Hasilkan objek `BEEP_CONFIG`:

| Kunci | Default | Julat |
|---|---|---|
| `BEEP_FREQ` | 2800 | 500–4000 |
| `BEEP_MS` | 120 | 30–300 |
| `BEEP_GAP_MS` | 100 | 30–300 |
| `BEEP_SETS` | 6 | 1–12 |
| `BEEP_SET_GAP_MS` | 1000 | 300–3000 |
| `BEEP_WAVE` | piezo | `piezo` atau `sine` |
| `BEEP_Q` | 3 | 1–10 |
| `BEEP_LEADIN_MS` | 200 | 0–500 |

- `BEEP_COUNT` kekal dalam `DEPRECATED_CONFIG_KEYS` (`dataService.js:52`). Pastikan kunci `BEEP_*` baru tidak terbuang oleh penapis itu.
- Semak `cloud/services/cloudDataService.js` dan `cloud/services/cloudSocketHandler.js` supaya kunci baru tidak dibuang atau hilang semasa sinkron.

### 2. Broadcast tanpa reload

Tiru corak `COLOR_CONFIG`:

- `nodejs/services/socketServerService.js`: tambah `broadcastBeepConfigUpdate(beepConfig)`, event `beep-config:updated`.
- `nodejs/services/apiServerService.js`: pada cabang `row:update` (sekitar baris 636) dan `row:insert` (sekitar baris 720) untuk `filename === 'config'`, tambah cabang bila kunci bermula `BEEP_`. Ia membaca config, `parseConfig`, kemudian memanggil broadcast.

### 3. Frontend (`react/src/contexts/DataContext.jsx`)

- Tambah `BEEP_CONFIG` dalam state, nilai default, hasil `/data/app` dan eksport konteks.
- Tambah handler `socketService.on('beep-config:updated', ...)` yang sama seperti `color-config:updated` (sekitar baris 401).
- Satu `useEffect` memanggil `beepService.setParams(...)` bila `BEEP_CONFIG` berubah.

### 4. `react/src/services/beepService.js`

- Tambah pattern `prayer` yang membaca semua parameter dari `_params`, bukan nombor hardcode.
- Wave `piezo`:
  - `OscillatorNode` jenis `square` pada `BEEP_FREQ`
  - `BiquadFilterNode` jenis `bandpass` (`frequency = BEEP_FREQ`, `Q = BEEP_Q`)
  - `GainNode` dengan fade 5–8ms
  - `osc.stop` ditangguh ~25ms supaya ekor resonan kedengaran
  - normalkan puncak ke 0.9
- Wave `sine` kekalkan perilaku lama.
- Lead-in senyap `BEEP_LEADIN_MS` sebelum beep pertama.
- `beep(n, onComplete)` menggunakan pattern `prayer`.
- Betulkan `getIsPlaying()` supaya betul walaupun tiada callback.
- Betulkan JSDoc dan teks di `react/src/components/BeepManagementPage.jsx` yang tersalah kata "jeda 800ms".

### 5. Callback dan fallback

`onComplete` mesti dipanggil selepas beep dan ekor selesai.

Jumlah masa maksimum = `leadin + sets×(2×beep + gap) + (sets−1)×setGap`. Ia mesti sentiasa kurang daripada fallback 30s di `react/src/hooks/useTimeDriver.js:481`. Jika kombinasi melebihi had, `clamp` di backend dan frontend.

### 6. UI tetapan (`nodejs/setting`)

- Tambah bahagian "Bunyi Beep" dengan kawalan untuk semua kunci di atas. Boleh sebagai tab baru di `nodejs/setting/config-tabs/` atau di dalam `system.html`. Ikut corak `waktu-solat.html`, termasuk cara simpan melalui API `config` yang sedia ada (`row:update`).
- Ubah butang **Test Kiosk** (event `test-sound`, handler di `react/src/services/socketService.js:129`) supaya memainkan pattern `prayer` dengan konfigurasi semasa (cukup 2 set). Pengguna boleh dengar hasil laras terus.
- Butang **Test TV** (`speaker-test` 1000 Hz, `nodejs/services/apiServerService.js:938`) boleh dibiarkan. Nyatakan dalam laporan bahawa ia tidak mewakili bunyi sebenar.

## Constraint

- Ikut gaya kod sekitar. Kod yang tak dipakai di-comment, bukan dibuang.
- Update DOM melalui `getElementById`, bukan React refs.
- Jangan ubah logik urutan azan, iqamah dan solat.
- `playNotifyIfIdle` (`beep(1)`) dan pattern `b1` tidak berubah.
- Perubahan konfigurasi tidak memotong beep yang sedang berbunyi, ia berkuat kuasa pada beep seterusnya.
- **Jangan push terus ke `main`.** Workflow GitHub Actions menyinkron `react/` dan `nodejs/` ke kiosk bila ada push ke `main`, dan cron di kiosk menarik setiap 10 minit. Guna branch fitur, dan minta kelulusan pengguna sebelum merge atau deploy.
- Jangan uji di kiosk semasa waktu solat. Kalau mahu uji bunyi di kiosk, pastikan bukan dalam tetingkap amaran, azan atau iqamah.

## Expected output

- Fail-fail di atas dikemas kini, build React baru (ikut proses sedia ada), dan satu branch fitur.
- Ringkasan perubahan serta senarai kunci `BEEP_*` dengan julat dan default.

## Acceptance criteria

1. Dengan default, beep masuk waktu di TV kiosk sama dengan variasi pilihan (nada piezo 2800 Hz, double 120/100ms).
2. Mengubah nilai dari tetapan berkuat kuasa tanpa reload kiosk, dan butang Test Kiosk memainkan bunyi baru.
3. Nilai di luar julat di-clamp, dan urutan masuk waktu ke iqamah tidak terjejas, termasuk pada nilai maksimum.
4. `b1` dan notify (`beep(1)`) tidak berubah.
5. Selepas restart dan reload kiosk, nilai kekal (dibaca dari `config.txt`).

## Rujukan bunyi

Fail audio bunyi pilihan (variasi 3, emulasi piezo 120ms) ada di kiosk: `/tmp/p_2_piezo_120.wav`. Ia hilang selepas reboot (`/tmp` dibersihkan).
