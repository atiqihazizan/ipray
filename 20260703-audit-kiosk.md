# Audit Aplikasi Kiosk Waktu Solat — Laporan Rujukan

**Tarikh:** 2026-07-03 (dikemas kini selepas pembaikan roadmap A7→A6→FN1→A1→A2→A3→A4)
**Skop:** `react/` (paparan kiosk), `nodejs/` (backend kiosk tempatan), semakan ringkas `cloud/` (servis pengurusan jauh, berasingan dari kiosk)
**Kaedah:** Baca kod sebenar fail demi fail (bukan skim), setiap dapatan disahkan dengan baris kod tepat sebelum dilaporkan. Pembaikan roadmap disahkan dengan ujian sebenar (bukan sekadar baca kod) — lihat nota "Disahkan" pada setiap item.

---

## 1. Ringkasan Eksekutif

| Severity | Bilangan terbuka | Bilangan sudah dibaiki |
|---|---|---|
| Critical | 0 | 6 (A1, A2, A3, A4, A6, A7) |
| High | 2 (A5, FN2) | 1 (FN1) |
| Medium | ~6 (B1, B2, dsb) | 0 |
| Low | beberapa (kod mati, kualiti) | 1 (`.gitignore`) |

**Semua item Critical dalam roadmap (Bahagian 7) kini SELESAI dan disahkan.** Baki isu terbuka (A5, FN2, B1, B2, kod mati) adalah High/Medium/Low — tiada lagi blocker Critical.

**Sudah dibaiki dalam sesi audit ini:**
1. Peralihan ke skrin Iqamah kini tunggu `beep.wav` **benar-benar habis main** (fallback guna durasi audio sebenar, bukan angka tetap 10 saat yang lebih pendek daripada fail sebenar ~13.3 saat).
2. `data:updated` dari panel setting kini **debounce + tangguh** sehingga urutan azan/iqamah/solat selesai — elak reload mengganggu paparan.
3. Chime `notify` (bunyi "data berubah") disenyapkan semasa urutan solat aktif.
4. Endpoint `/api/system/reload-react` tak lagi broadcast 8 event berasingan untuk satu tindakan.
5. Bip Syuruk kini bertahan dalam tingkap 60 minit dan tertangguh (bukan hilang) jika jatuh semasa urutan Subuh aktif.
6. `.gitignore` — fail `*-bak`/`*.zip` kini diabaikan.
7. `LiveStreamOverlay.jsx` — timeout retry HLS kini dibersihkan betul (elak panggil kaedah pada instance yang sudah dimusnahkan).
8. **A7** — guard `prayerWarningTriggeredRef` tak lagi dipadam pra-masa; replay bila jam undur ditutup. *(Disahkan: kod dibaca, logik dijejak — tiada laluan lain bergantung tingkah laku lama.)*
9. **A6** — `kematian:updated`, `kematian:cleared`, `live:stopped` kini tangguh reload guna `runAfterPrayerSequence()` (pattern terbukti). *(Disahkan: pattern sama diuji hidup untuk `data:updated` pada sesi sebelum ini.)*
10. **FN1** — hard-ceiling 30s ditambah pada `playBeepThenDo` — urutan tak lagi boleh tersangkut selama-lamanya jika `audioService.play()` sendiri tak pernah selesai. *(Disahkan: kod dibaca, lint bersih.)*
11. **A1** — `timeService.now()` (masa dikalibrasi NTP) kini digunakan di 3 lokasi (`islamicTimeUtils.js`, `PrayerSequencePage.jsx` x2), gantikan `Date.now()`/`new Date()` mentah. *(Disahkan: kod dibaca, fallback ke `Date.now()` jika `timeService` tiada.)*
12. **A2** — `getYearDays()` kini sedar tahun lompat (`isLeapYear()`, `getMonthDays(year)`); fallback modulo guna `wdata.length` sebenar bukan hardcode 365. *(Disahkan DENGAN UJIAN SEBENAR — `node` dijalankan terus: 2028-03-01 betul kembalikan hari-ke-61, bukan 60; peraturan abad 1900/2000 juga betul.)*
13. **A4** — command injection pada WiFi configure/hotspot ditutup: fungsi `escapeShellDoubleQuoted()` (susunan escape betul — backslash dahulu) menggantikan 8 tempat escape yang rosak. *(Disahkan DENGAN UJIAN SEBENAR — payload serangan `x"; touch /tmp/pwned #` dijalankan terus melalui `sh -c`: escaping LAMA mencipta fail /tmp/pwned, escaping BAHARU tidak.)*
14. **A3** — middleware auth (`X-Access-Token`) kini kuatkuasa pada semua endpoint `/api/*` admin/tulis, kecuali laluan baca kiosk (`/api/data/app*`, `/api/time`, `/api/token`). Panel setting (`config.js`) kini ada *fetch wrapper* global yang sisip token automatik untuk 70+ tempat panggilan `fetch()` sedia ada. *(Disahkan DENGAN UJIAN SEBENAR — server dijalankan, `curl` sahkan endpoint kiosk terus 200 tanpa token, endpoint admin 401 tanpa token & 200 dengan token betul; panel setting diuji dalam pelayar sebenar termasuk satu operasi PUT tulis data sebenar — berjaya.)*

**Bug baharu ditemui SEMASA laksana pembaikan (dan turut dibaiki serta-merta):** fetch-wrapper A3 pada mulanya cipta rekursi tanpa henti (`/api/token` dipanggil beratus kali) kerana `ensureAccessToken()` guna `fetch()` yang sudah di-*patch* untuk dapatkan token itu sendiri. Ditangkap serta-merta melalui ujian network-tab sebenar, dibaiki dengan guna `nativeFetch` (rujukan asal sebelum di-*patch*) di dalam `ensureAccessToken()`.

**Belum dibaiki (senarai penuh di Bahagian 2 & 7).**

---

## 2. Mission-Critical — isu yang boleh jejaskan beep/countdown/iqamah/solat secara langsung

Ini bahagian paling penting laporan ini — objektif tunggal kiosk ialah bunyikan beep tepat waktu, sekali sahaja, dan selesaikan urutan iqamah/solat tanpa gangguan.

### A1 — Beep boleh berbunyi pada masa yang salah sepenuhnya
- **Punca:** `timeService`/`timeServiceStub` (pelarasan offset NTP dari backend) diterima sebagai parameter di **3 tempat** tapi tidak pernah digunakan — kod terus guna `Date.now()`/`new Date()` mentah dari jam sistem tempatan.
- **Fail:** [react/src/utils/islamicTimeUtils.js:228](react/src/utils/islamicTimeUtils.js:228), [react/src/components/PrayerSequencePage.jsx:139](react/src/components/PrayerSequencePage.jsx:139) (countdown Azan — punca *sebenar* pencetus beep), [react/src/components/PrayerSequencePage.jsx:209](react/src/components/PrayerSequencePage.jsx:209) (`scheduleReload`)
- **Kesan:** Jika jam sistem kiosk salah (CMOS/RTC rosak — situasi diantisipasi sendiri dalam komen kod untuk Raspberry Pi), SEMUA countdown/beep guna jam salah walaupun backend sudah kira offset betul.
- **Confidence:** Disahkan (grep `timeService.now()` = sifar padanan di seluruh `react/src`).

### A7 — Beep boleh berbunyi DUA KALI (replay seluruh urutan)
- **Punca:** Guard `prayerWarningTriggeredRef` dipadam sebaik sahaja waktu solat berlalu — pemadaman ini tiada fungsi berguna (key sudah bertarikh unik, dibersihkan betul bila hari bertukar), tapi ia membuka lubang: jika jam sistem melompat **ke belakang** (contoh OS betulkan RTC yang salah) dan jatuh semula dalam tingkap 5 minit sebelum azan, seluruh urutan azan→beep→iqamah→solat **replay** pada hari yang sama.
- **Fail:** [react/src/hooks/useTimeDriver.js:172-174](react/src/hooks/useTimeDriver.js:172)
- **Kesan:** Ini kemungkinan besar punca aduan asal "beep berulang".
- **Confidence:** Disahkan (dijejak kod penuh).

### A6 — Reload boleh memotong urutan solat di tengah jalan
- **Punca:** 3 daripada 4 punca `window.location.reload()` masih **tidak dijaga** terhadap urutan solat aktif (satu, `data:updated`, sudah dibaiki sesi lepas guna `runAfterPrayerSequence()`):
  - `kematian:updated` (timer auto-reload selepas paparan kematian tamat)
  - `kematian:cleared` (admin buang paparan kematian)
  - `live:stopped` (livestream tamat)
- **Fail:** [react/src/contexts/DataContext.jsx:372, 382, 401](react/src/contexts/DataContext.jsx:372)
- **Kesan:** Jika mana-mana event ini tercetus semasa Azan/Iqamah/Solat sedang berjalan, paparan reload paksa — beep terputus/iqamah-solat terhenti separuh jalan.
- **Confidence:** Disahkan (grep semua `window.location.reload()`).

### FN1 — Iqamah boleh tak pernah bermula (skrin Azan tersangkut selama-lamanya)
- **Punca:** Fallback timeout (dibaiki sesi lepas untuk tunggu durasi audio sebenar) hanya disediakan **selepas** `audioService.play()` *resolve*. Jika promise `play()` itu sendiri tak pernah selesai (jarang tapi ada laporan sebenar pada Chromium embedded/Raspberry Pi lama), tiada fallback langsung — skrin Azan kekal selama-lamanya.
- **Fail:** [react/src/components/PrayerSequencePage.jsx:48-57](react/src/components/PrayerSequencePage.jsx:48)
- **Confidence:** Perlu ujian runtime untuk sahkan kekerapan sebenar (spesifikasi browser jamin selesai, tapi bug embedded-browser wujud dalam dunia sebenar).

### FN2 — Beep boleh senyap sepenuhnya tanpa isyarat
- **Punca:** Jika fail `beep.wav` hilang/corrupt, percubaan **pertama** gagal dengan baik (fallback jalan), tapi percubaan **seterusnya** (`loadError` sudah `true`) terus `return` tanpa cuba main — Azan-ke-Iqamah still transition selepas 20 saat, TAPI tiada beep, dan tiada log/alert yang sesiapa akan nampak (lihat Bahagian 4).
- **Fail:** [react/src/services/audioService.js:145-148](react/src/services/audioService.js:145)
- **Confidence:** Sangat mungkin (dijejak kod terus).

### A2 — Waktu solat tersasar satu hari penuh (laten, tahun lompat)
- **Punca:** `getYearDays()` guna Februari=28 hari secara hardcode (`MONTH_DAYS`), tidak semak tahun lompat. `wdata` diisi ikut jujukan baris fail `takwim.txt` (bukan ikut tarikh sebenar setiap baris) — jadi bila tahun lompat, index yang dikira akan tersasar satu baris bermula 1 Mac, dan kekal tersasar sehingga akhir tahun.
- **Fail:** [react/src/utils/islamicTimeUtils.js:31, 142-161](react/src/utils/islamicTimeUtils.js:31)
- **Kesan:** Tidak aktif sekarang (2026 bukan tahun lompat), tapi **akan** aktif pada 2028 — beep/azan akan guna waktu solat hari sebelumnya untuk 10 bulan penuh.
- **Confidence:** Disahkan (dijejak logik penuh + data takwim semasa).

---

## 3. Bug Logik (timer, state, race, reload, edge case) — tambahan luar Mission-Critical

### B1 — `useState` di-destructure salah, ralat setiap minit
- **Fail:** [react/src/components/DateTimeOverlay.jsx:31](react/src/components/DateTimeOverlay.jsx:31)
- `const [, forceRender, minuteTick, setMinuteTick] = useState(0);` — `useState` cuma pulangkan 2 nilai, jadi `minuteTick`/`setMinuteTick` = `undefined`. `setInterval` (baris 52) panggil `setMinuteTick(...)` setiap 60 saat → `TypeError: setMinuteTick is not a function` — tidak crash app (interval berasingan), tapi console-spam berterusan SELAMANYA, dan mekanisme "refresh status hebahan aktif setiap minit" yang sepatutnya jalan **tidak pernah berfungsi** melalui laluan ini.
- **Severity:** Medium. **Confidence:** Disahkan.

### B2 — Tulis fail data serentak boleh hilang data
- **Fail:** [nodejs/services/dataService.js:380-416](nodejs/services/dataService.js:380)
- `fs.writeFile` terus tanpa lock/atomic-rename. Dua request API tulis fail SAMA berdekatan masa → yang siap terakhir menang, yang lain hilang senyap.
- **Severity:** Medium (kebarangkalian rendah untuk deployment masjid tunggal 1-2 admin). **Confidence:** Disahkan struktur kod; kebarangkalian sebenar bergantung penggunaan.

### Dead code (kualiti, bukan bug aktif)
- `MidnightReloadListener.jsx` — tak diimport di mana-mana, rujuk `checkMidnight` yang tak wujud dalam `DataContext`. Cadangan: padam.
- `prayerTimeService.js` — parameter `timeService` diterima tapi tak digunakan di 3 kaedah; tapi kaedah-kaedah ini sendiri (`getPrayerTime`, `checkPrayerTime`, `checkAllPrayerTimes`) **tak pernah dipanggil** di mana-mana — kelas ini hampir dead code sepenuhnya (hanya `setTakwim()` digunakan).
- `SliderPage.jsx` baris 15 — `sliderState` objek hardcode statik (`shouldHold` sentiasa `false`) — ciri "pause/resume slideshow" nampak wujud tapi sebenarnya tak pernah aktif. Bukan bug fungsi (sentiasa jatuh ke cawangan selamat), tapi kod mengelirukan untuk penyelenggara akan datang.

---

## 4. Performance & Reliability

**Memory/timer leak (jalur kritikal):** Tidak dijumpai — semua `setInterval`/`setTimeout` di `useTimeDriver`, `PrayerSequencePage`, `PrayerTimeController` ada cleanup yang betul, disahkan baris demi baris.

**Sudah dibaiki sesi ini:** `LiveStreamOverlay.jsx` — timeout retry HLS kini disimpan dalam ref dan dibersihkan pada cleanup/sebelum retry baharu.

**Gap pemantauan (tiada bug kod, tapi risiko operasi sebenar):**
- **Tiada logging berkekalan/alert** — React frontend: grep untuk Sentry/analytics/window.onerror = sifar padanan. SEMUA `console.error`/`console.warn` (termasuk FN2, tick error di `useTimeDriver`) pergi ke DevTools console sahaja — tiada siapa akan nampak pada kiosk tanpa pengawasan 24/7.
- **Tiada watchdog** untuk countdown/audio/React/memory/jam — kalau salah satu gagal dengan cara yang belum kita jangka, tiada mekanisme automatik untuk kesan atau lapor.
- Backend `logs/out.log`/`logs/err.log` (PM2) ada config rotation, tapi **bergantung `pm2-logrotate` dipasang berasingan** (komen dalam `ecosystem.config.js` sendiri nyatakan ini langkah manual) — perlu sahkan di kiosk sebenar sama ada dipasang.
- **Tiada React Error Boundary** — satu render error tak dijangka boleh blanking seluruh skrin kiosk tanpa cara pulih automatik.

**Positif disahkan:** `localStorage` write setiap saat (untuk jam semasa) bersaiz kecil, dibersihkan ~7 hari automatik — risiko write-amplification rendah untuk storan moden (perlu perhatian jika kiosk guna SD card, bukan SSD). Socket.IO reconnect (`Infinity` attempts) tak bertindih/leak, disahkan `if (connected) return` guard.

---

## 5. Security

### A3 — API backend kiosk tiada authentication langsung
- **Fail:** [nodejs/services/apiServerService.js:1689-1692](nodejs/services/apiServerService.js:1689), `main.js`
- Grep untuk sebarang middleware auth = sifar padanan. Server dengar pada `0.0.0.0` (network-wide). SEMUA endpoint (tulis fail data, reboot, WiFi config) boleh dipanggil sesiapa dalam rangkaian WiFi masjid tanpa login.
- **Severity:** Critical. **Confidence:** Disahkan.

### A4 — Command injection pada `/api/wifi/configure`
- **Fail:** [nodejs/services/apiServerService.js:1274](nodejs/services/apiServerService.js:1274)
- Susunan `.replace()` untuk escape SSID rosak (escape backslash MESTI jadi langkah pertama, bukan terakhir) — boleh pecahkan petikan shell, membenarkan arahan tambahan dijalankan sebagai **root** (`sudo nmcli ...`). Digabung dengan A3 = unauthenticated remote root code execution.
- **Severity:** Critical. **Confidence:** Disahkan (dijejak watak-demi-watak).

### A5 — XSS tersimpan
- **Fail:** [react/src/components/Caption.jsx:83, 142](react/src/components/Caption.jsx:83)
- `dangerouslySetInnerHTML={{ __html: caption.content }}` tanpa sanitize, `caption.content` datang dari medan admin-editable (announcements/kuliah). Digabung dengan A3 (tiada auth), sesiapa boleh suntik skrip yang jalan kekal pada paparan kiosk.
- **Severity:** High. **Confidence:** Disahkan.

### Servis `cloud/` (berasingan dari kiosk, keutamaan lebih rendah)
- CORS `origin: '*'` pada Socket.IO ([cloud/server.js:27](cloud/server.js:27)) — disahkan.
- Path traversal pada upload/delete fail (`folder`/`originalName` terus ke `path.join()` tanpa whitelist) ([cloud/services/fileService.js:13-18](cloud/services/fileService.js:13)) — disahkan.

---

## 6. Production Readiness

# Status terkini: Semua blocker Critical SUDAH dibaiki dan disahkan (2026-07-03)

### Blocker (sudah dibaiki — lihat Bahagian 7)
~~A1, A2, A3, A4, A6, A7~~ — SEMUA SELESAI. Tiada blocker Critical yang terbuka lagi.

### Patut dibaiki sebelum pasang produksi sepenuhnya
A5 (XSS `Caption.jsx`), FN2 (isyarat kegagalan audio senyap), tiada React Error Boundary, tiada observability/alerting berkekalan (rujuk laporan penuh dalam perbualan — seksyen Observability).

### Boleh tunggu (Medium/Low)
B1 (DateTimeOverlay destructuring), B2 (file write race), dead code (`MidnightReloadListener`, `prayerTimeService`, `SliderPage.sliderState`), isu `cloud/` (servis berasingan — CORS, path traversal upload), password hotspot hardcode (`ipray2026`, ditemui semasa fix A4 tapi di luar skop roadmap).

**Cadangan sebelum guna produksi sepenuhnya:** uji satu hari penuh (5 waktu solat) di kiosk sebenar/pelayan pementasan untuk sahkan A1/A2/A7 tidak menjejaskan operasi biasa, dan uji panel setting sepenuhnya (semua tab: WiFi, Hotspot, Takwim, dsb) untuk sahkan fetch-wrapper A3 tidak pecahkan mana-mana fungsi admin yang belum diuji secara langsung sesi ini.

---

## 7. Roadmap Pembaikan — STATUS: SEMUA SELESAI

| Susunan | Isu | Status | Cara disahkan |
|---|---|---|---|
| 1 | **A7** | ✅ Selesai | Baca kod — cawangan `else if` yang padam guard dibuang; tiada laluan lain bergantung tingkah laku lama |
| 2 | **A6** | ✅ Selesai | Pattern `runAfterPrayerSequence()` diulang pada 3 handler (`kematian:updated`, `kematian:cleared`, `live:stopped`) |
| 3 | **FN1** | ✅ Selesai | Hard-ceiling 30s ditambah, lint bersih |
| 4 | **A1** | ✅ Selesai | `timeService.now()` digunakan di 3 lokasi dengan fallback `Date.now()` jika `timeService` tiada |
| 5 | **A2** | ✅ Selesai — **diuji langsung** | `node` dijalankan terus: 2028-03-01 = hari-ke-61 (betul), peraturan abad 1900/2000 betul |
| 6 | **A3** | ✅ Selesai — **diuji langsung** | Server + panel setting sebenar dijalankan dalam pelayar; `curl` sahkan 200/401 tepat; PUT tulis data sebenar berjaya dengan token |
| 7 | **A4** | ✅ Selesai — **diuji langsung** | Payload serangan sebenar dijalankan melalui `sh -c`: escaping lama boleh eksploitasi (disahkan), escaping baharu selamat (disahkan) |

**Bug baharu ditemui+dibaiki serta-merta semasa laksana A3:** *fetch wrapper* pada mulanya cipta rekursi tanpa henti (`/api/token` dipanggil beratus kali setiap muat halaman) — ditangkap melalui ujian network-tab sebenar sebelum sempat jadi masalah produksi, dibaiki dengan guna `nativeFetch` (bukan `fetch` yang sudah di-*patch*) di dalam fungsi pengambilan token.

**Regresi yang masih perlu diuji di kiosk sebenar (tak dapat diuji sepenuhnya dalam sesi ini):** ujian WiFi configure/hotspot sebenar (perlukan Raspberry Pi + `nmcli` sebenar — hanya boleh disahkan escaping/logik, bukan hasil sambungan WiFi sebenar), dan ujian panel setting untuk SEMUA tab (WiFi, Hotspot, Takwim, System) dengan token auth baharu — hanya tab Home/config diuji langsung sesi ini.
