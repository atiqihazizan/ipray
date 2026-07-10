# Pelan: Kurangkan Interval untuk Performance (Peranti 2GB RAM)

## Situasi semasa

Pada peranti dengan hanya 2GB RAM, bilangan interval yang berjalan serentak boleh menjejaskan performance (CPU wake-ups, re-render, memori).

### Interval berulang (recurring) dalam React app (kiosk)

| Sumber | Interval | Keterangan |
|--------|----------|------------|
| **useIslamicTime** | 1000 ms | Setiap komponen yang panggil hook ini ada **satu** `setInterval(updateTime, 1000)`. |
| **usePrayerTimeNavigation** | 1000 ms | Satu instance dalam App.jsx. |
| **usePrayerTimeProcess** | 1000 ms | Satu instance dalam App.jsx. |
| **DataContext** | 60 000 ms | Semak tengah malam (tarikh tukar). |

### Bilangan sebenar interval 1 saat

- **useIslamicTime** dipanggil di banyak tempat:
  - DateTimeOverlay: `usePrayerTimes` → 1
  - DisplayDate (Gregorian) → 1
  - DisplayDate (Hijri) → 1
  - DisplayTime (×6 waktu solat + next + time + small-time) → **sekurang-kurangnya 9**
- **Jumlah:** ~12+ interval 1s (useIslamicTime) + 1 (usePrayerTimeNavigation) + 1 (usePrayerTimeProcess) = **14+ interval**, dengan 13+ daripadanya setiap 1 saat.

Ini bermakna setiap saat ada 13+ callback berjalan + re-render komponen yang bergantung kepada `islamicTime`, yang boleh membebankan peranti 2GB RAM.

### Jssor slider (useJssorSlider)

- **Dalam useJssorSlider:** Hanya **setTimeout** one-off (retry init 100ms, destroy 150ms, ScaleSlider 30ms). **Tiada setInterval** dalam hook kita.
- **Dalam library Jssor:** Config `$AutoPlayInterval: 3000` (sliderConfig) — Jssor **dalam jssor.js** guna timer internal untuk auto-play (tukar slide setiap 3 saat). Itu interval dalam library, bukan dalam kod React kita.
- **Kesan:** Tiada pertindihan “sama interval” dengan plan Islamic time; tetapi pada peranti 2GB, **kerja berkala** ada dua: (1) tick masa kita setiap 1s, (2) Jssor slide setiap 3s. Gabungan kedua-dua tetap beban CPU/paint.

---

## Matlamat

- **Kurangkan bilangan interval** kepada **satu** (atau sangat sedikit) untuk tick masa.
- **Kekalkan tingkah laku** paparan waktu, waktu solat, beep, dan navigasi azan/iqamah/solat.
- **Kurangkan** CPU wake-ups dan re-render yang tidak perlu.

---

## Cadangan: Satu sumber kebenaran untuk “Islamic time” (context)

### Idea utama

1. **IslamicTimeContext (provider)**  
   Satu provider yang:
   - Menjalankan **satu** `setInterval(..., 1000)` — **fokus untuk masa (jam)** sahaja.
   - Setiap saat update paparan masa (jam, minit, saat); tarikh dan waktu solat boleh di-cache untuk hari ini (kerana app reload tengah malam anyway).
   - Expose: `{ islamicTime, loading, error, zone }` (dan lain-lain yang diperlukan). Nilai `islamicTime` boleh dari `getCurrentIslamicTime(...)` sekali per saat, atau dioptimumkan: update hanya `time` setiap saat dan kekalkan `hijri`/`gregorian`/`prayer` dari snapshot hari tersebut.

2. **useIslamicTime jadi consumer sahaja**  
   - Tidak lagi ada `setInterval` dalam hook.
   - Hanya baca dari context: `const { islamicTime, loading, ... } = useContext(IslamicTimeContext)`.
   - Semua komponen (DisplayDate, DisplayTime, usePrayerTimes, dll.) kekal guna `useIslamicTime()` tetapi tanpa interval sendiri → **satu interval** untuk seluruh app.

3. **usePrayerTimeNavigation & usePrayerTimeProcess**  
   - Guna `islamicTime` dari context (baca dari hook/context yang sama).
   - Logic “check setiap saat” diganti dengan **reaksi kepada nilai context**: bila `islamicTime` berubah (setiap 1s), jalankan `check()` sekali.
   - Implementasi: `useEffect(() => { if (islamicTime) check(); }, [islamicTime])` (dengan dependency yang sesuai supaya check jalan setiap “tick”).
   - **Tiada** `setInterval` dalam kedua-dua hook ini.

4. **Semak tengah malam (DataContext)**  
   - Jangan guna `setInterval(60 000)`.
   - Guna tarikh dari IslamicTimeContext: bila `islamicTime.gregorian` (atau string tarikh hari ini) berbeza daripada “hari terakhir load”, trigger reload (set message + `setTimeout(reload, RELOAD_DELAY_MS)`).
   - Boleh buat hook `useMidnightReload(dataLoadDateRef, onMidnight)` yang guna context dan `useEffect` atas tarikh; DataContext panggil hook ini sekali dan buang interval 60s.

### Hasil dijangkakan

| Sebelum | Selepas |
|---------|---------|
| ~12+ × setInterval(1s) (useIslamicTime) | **1** × setInterval(1s) (dalam provider) |
| 1 × setInterval(1s) (usePrayerTimeNavigation) | 0 (react kepada context) |
| 1 × setInterval(1s) (usePrayerTimeProcess) | 0 (react kepada context) |
| 1 × setInterval(60s) (DataContext) | 0 (react kepada perubahan tarikh dari context) |
| **~14 interval** | **1 interval** |

---

## Interval fokus pada masa sahaja — lebih ringan dan selari dengan reload tengah malam

- **App reload setiap tengah malam** sudah sedia ada; selepas reload, tarikh dan waktu solat hari baru akan di-fetch sekali lagi. Jadi untuk **sepanjang hari**, tarikh (Hijri/Masehi) dan waktu solat hari itu boleh dianggap **statik** — tidak perlu dikira semula setiap saat.
- **Interval 1s hanya untuk masa (jam):** Satu interval itu **fokus untuk update paparan masa** (jam, minit, saat) sahaja. Itu yang benar-benar berubah setiap saat; tarikh dan waktu solat cukup dikira sekali bila takwim load (atau sekali per hari), dan bila tarikh tukar (Maghrib untuk Hijri) boleh handle dengan logic berasingan atau terima sahaja bahawa selepas midnight reload kita dapat nilai baru.
- **Kelebihan:** (1) **Kurang kerja per tick** — jika implementasi hanya update "current time" (hours, minutes, seconds) untuk paparan jam dan cache tarikh/waktu solat untuk hari ini, CPU per saat lebih ringan. (2) **Selari dengan lifecycle app** — tiada keperluan untuk "refresh" tarikh/waktu solat setiap saat kerana midnight reload sudah pastikan data hari baru. (3) **Lebih mudah** — interval hanya drive jam; tarikh dan waktu solat dari snapshot hari tersebut.

**Ringkas:** Interval hanya fokus pada **masa** (paparan jam). Tarikh dan waktu solat bergantung pada data hari ini dan reload tengah malam untuk hari seterusnya — lagi better untuk performance dan konsisten dengan design app.

---

## Di mana context digunakan (placement & siapa yang subscribe)

- **Provider letak di mana:** IslamicTimeProvider **boleh** wrap di peringkat app (contoh dalam `App`: `DataProvider` → `TimeSyncProvider` → `IslamicTimeProvider` → `AppContent`). Letak provider tinggi tidak semestinya menyebabkan seluruh app re-render.
- **Yang menyebabkan re-render:** Hanya komponen yang **subscribe** (panggil `useContext(IslamicTimeContext)` atau `useIslamicTime()` yang baca dari context) akan re-render bila context value berubah setiap 1s.
- **Penting — jangan subscribe di AppContent:** Sekarang `AppContent` memanggil `usePrayerTimeNavigation()` dan `usePrayerTimeProcess()`. Jika kedua-dua hook itu baca dari IslamicTimeContext, maka **AppContent jadi consumer** → AppContent re-render setiap 1s → **seluruh anak (SliderPage, slider, dll.) ikut re-render**. Itu jauh lebih berat daripada hanya date/time/waktu solat.
- **Yang sepatutnya subscribe (paparan date/time/waktu solat sahaja):**
  - **DateTimeOverlay** (usePrayerTimes) dan anaknya: **DisplayDate** ×2, **DisplayTime** ×9 — ini memang perlu update setiap saat untuk paparan. Re-render di sini memang beban tapi **terkandung** (overlay sahaja).
  - **Jangan** panggil `useIslamicTime()` / context dalam AppContent. Navigation (azan/iqamah/solat) dan beep perlu jalan setiap saat tetapi **tanpa** menjadikan AppContent sebagai consumer.

### Cara elak AppContent re-render setiap saat

- **Pindah logic navigation & beep** ke satu komponen kecil (contoh: `PrayerTimeController`) yang:
  - Di-render **dalam tree** (boleh sebagai anak AppContent atau sibling).
  - **Dialah** yang subscribe kepada IslamicTimeContext dan jalankan check setiap kali `islamicTime` berubah.
  - **Hanya** pass naik ke AppContent bila state benar-benar tukar: contoh `currentView` (slide | azan | iqamah | solat) melalui **callback** `setCurrentView` atau context lain (e.g. CurrentViewContext yang update jarang).
- AppContent **tidak** panggil `usePrayerTimeNavigation()` / `usePrayerTimeProcess()`; AppContent hanya baca `currentView` (daripada state atau context yang update jarang). Maka bila IslamicTimeContext update setiap 1s, **hanya** komponen berikut re-render:
  1. DateTimeOverlay dan anak (DisplayDate, DisplayTime) — untuk paparan.
  2. PrayerTimeController — komponen kecil, tiada slider/dom berat.
- SliderPage, useJssorSlider, dan keseluruhan slider **tidak** re-render setiap saat kerana AppContent tidak re-render.

**Ringkas:** Context **digunakan** (subscribed) hanya di: (1) paparan date/time/waktu solat (DateTimeOverlay dan anak-anak), (2) satu komponen kecil untuk navigation + beep yang hanya naikkan `currentView` bila berubah. Bukan di App.jsx/AppContent supaya keseluruhan element tidak rendering setiap saat.

---

## Event-based (window) — tarikh Hijri, trigger solat, elak re-render selain time

Supaya **hanya paparan masa (jam)** yang re-render setiap saat, manakala tarikh Hijri, warning 30s, dan trigger waktu solat (blink, beep, navigate) **tidak** melalui context/useState yang menyebabkan seluruh tree re-render, guna **custom events pada `window`**. Data dihantar melalui event, bukan parameter/context; hanya komponen yang listen akan bertindak (dan boleh set local state jika perlu).

### 1. Update tarikh Hijri tanpa interval (lepas Maghrib)

- Dalam **satu interval** (driver masa), setiap tick kita ada akses kepada masa semasa dan takwim. Kira sama ada “hari Hijri” sudah bertukar (masuk Maghrib = tarikh Hijri jadi hari berikutnya mengikut `calculateHijri`).
- **Jangan** simpan tarikh Hijri dalam context yang update setiap saat. Sebaliknya:
  - Bila detect **pertama kali** kita sudah lepas Maghrib (banding dengan nilai “Hijri hari ini” yang di-cache), kira tarikh Hijri baru dan **dispatch event**:
    - `window.dispatchEvent(new CustomEvent('hijri-date-changed', { detail: { hijri } }))`
  - **Hanya** komponen yang papar tarikh Hijri (DisplayDate type Hijri) **listen** event ini: `window.addEventListener('hijri-date-changed', handler)`. Dalam handler, update **local state** (useState) dengan `detail.hijri` → hanya komponen itu re-render, sekali sahaja bila tarikh tukar.
- Tarikh Hijri awal boleh dari snapshot bila takwim load; bila dapat event `hijri-date-changed`, tukar ke tarikh berikutnya. Tiada interval berasingan dan tiada context untuk Hijri.

### 2. Trigger waktu solat: 30s warning (blinking) dan masuk waktu (beep, navigate, blink)

- Dalam **satu interval** yang sama, setiap tick:
  - **30 saat sebelum waktu solat:** Jika masa semasa = waktu solat − 30 saat, dispatch:
    - `window.dispatchEvent(new CustomEvent('prayer-warning', { detail: { prayerName, in30Seconds: true } }))`
  - **Masuk waktu solat** (saat = 00, jam+minit sama dengan waktu solat): dispatch:
    - `window.dispatchEvent(new CustomEvent('prayer-time', { detail: { prayerName } }))`
- **Listeners (tanpa guna context/parameter untuk data ini):**
  - **Blinking:** Komponen yang perlu blink (contoh: paparan waktu solat atau label) listen `prayer-warning` dan `prayer-time`. Dalam handler, set **local state** sahaja (e.g. `setBlinking(true)` / `setIsPrayerTime(true)`) → hanya komponen itu re-render.
  - **Beep:** Service (audioService) listen `prayer-time` dan panggil `audioService.play(...)` — tiada React state, tiada re-render.
  - **Navigate (azan → iqamah → solat → slide):** Satu komponen kecil (atau module) listen `prayer-time`; bila dapat event, panggil **callback** yang sudah didaftar (e.g. `setCurrentView('azan')`). Callback itu boleh dari AppContent (pass sekali); hanya bila `currentView` berubah barulah AppContent re-render. Jadi **data** (prayerName, dll.) **tidak** di-pass melalui props/context — hanya event; action (setCurrentView) melalui callback.

### 3. Pass data tanpa parameter/useState/context — hanya “time” yang cause rendering

- **Context (atau satu useState) hanya untuk “current time”** (jam, minit, saat) untuk **paparan jam**. Sesiapa yang perlu papar jam subscribe context itu → hanya mereka re-render setiap saat.
- **Tarikh Hijri:** Bukan dalam context; update melalui event `hijri-date-changed`. Hanya DisplayDate (Hijri) listen dan guna **local useState** untuk nilai paparan → re-render hanya bila tarikh tukar (lepas Maghrib).
- **Tarikh Masehi:** Boleh dari snapshot hari ini (cukup sekali bila load) sehingga midnight reload; atau satu event `gregorian-date-changed` jika mahu (biasanya tidak perlu kerana reload tengah malam).
- **Waktu solat (paparan):** Boleh dari snapshot takwim hari ini (statik); tidak perlu dalam context. Paparan “waktu Subuh”, “waktu Zohor”, dll. baca dari data sekali (props atau module) — tiada update setiap saat.
- **Trigger (warning, prayer time):** Semua melalui **window events**. Tiada parameter/context yang bawa “sekarang dalam 30s sebelum solat” atau “sekarang waktu solat” ke seluruh app; hanya komponen yang listen dapat event dan bertindak (local state atau imperative call).

**Ringkas:** Satu interval → update **masa** sahaja dalam context (clock re-render). Tarikh Hijri update lepas Maghrib via **event**; warning 30s dan masuk waktu solat juga via **event**. Data tidak di-pass dengan parameter/context untuk bahagian ini — guna **window listening** (addEventListener untuk custom event). Hanya komponen yang listen dan ubah local state akan re-render; beep/navigate guna callback/imperative, bukan React tree re-render.

- Bila context value berubah setiap 1s (`setState(islamicTime)`), **setiap komponen yang guna `useContext(IslamicTimeContext)` akan re-render setiap saat**.
- Itu termasuk: DateTimeOverlay (usePrayerTimes), 2× DisplayDate, 9× DisplayTime (useDisplayTime → useIslamicTime), plus usePrayerTimeNavigation & usePrayerTimeProcess jika mereka baca dari context → **~12+ re-render per saat**.
- **Perbandingan dengan sekarang:** Sekarang pun setiap useIslamicTime instance ada setState setiap 1s → ~12 setState dan ~12 re-render per saat. Jadi **bilangan re-render tidak bertambah** dengan context; kita hanya kurangkan bilangan timer (14 → 1).
- **Jika context disalah guna (subscribe di AppContent):** AppContent + SliderPage + slider re-render setiap saat → keseluruhan element rendering, jauh lebih berat. **Mitigasi:** (1) Jangan subscribe di AppContent — pindah navigation/beep ke PrayerTimeController; (2) kekalkan memo pada DisplayDate/DisplayTime; (3) kelak boleh split context (tick minit/tarikh).

---

## Side effect lain

| Aspek | Kesan |
|--------|--------|
| **Susunan provider** | IslamicTimeProvider mesti dalam DataProvider & TimeSyncProvider (guna useTakwimData, useTimeSync). DataProvider tidak boleh guna useIslamicTime/useMidnightReload jika IslamicTimeProvider ada di dalam DataProvider — perlu useMidnightReload dipanggil dalam komponen anak yang sudah dalam IslamicTimeProvider, atau letak IslamicTimeProvider dalam DataProvider dan panggil useMidnightReload dalam IslamicTimeProvider (dan callback panggil DataContext setMidnightReloadMessage + reload). |
| **Pertindihan dengan Jssor** | Bukan pertindihan interval yang sama; tetapi setiap 1s (kita) + setiap 3s (Jssor) ada kerja. Pada 2GB, elak kerja berat dalam callback tick (contoh: jangan parse takwim dalam tick jika boleh cache). |
| **externalTakwimParsed** | useIslamicTime(externalTakwimParsed) hari ini boleh guna takwim luaran. Dengan context satu sumber, perlu tentukan: sama ada context sentiasa guna takwim dari DataContext, atau ada cara override untuk external (contoh: context terima optional takwim dan guna bila ada). |
| **Testing / stub** | Pastikan timeService dan takwim boleh di-stub seperti sekarang supaya test dan kiosk konsisten. |

---

## Langkah implementasi (ringkas)

1. **Cipta IslamicTimeContext**
   - Fail: `react/src/contexts/IslamicTimeContext.jsx` (atau .js).
   - State: `islamicTime`, `loading`, `error`, `zone`.
   - Satu `useEffect` dengan `setInterval(updateTime, 1000)`, cleanup `clearInterval`.
   - Guna `useTakwimData()` dan `useTimeSync()` dalam provider (provider mesti berada dalam DataProvider & TimeSyncProvider).

2. **Ubah useIslamicTime**
   - Kekalkan API: `useIslamicTime(externalTakwimParsed)`.
   - Dalam hook: baca dari `useContext(IslamicTimeContext)`; jika `externalTakwimParsed` diberi, boleh tetap guna untuk pilihan “internal vs external” atau kekal baca dari context sahaja (mengikut keperluan).
   - **Buang** semua `setInterval` dalam useIslamicTime.

3. **Ubah usePrayerTimeNavigation**
   - Dapatkan `islamicTime` dari context (atau dari useIslamicTime).
   - Ganti `setInterval(check, 1000)` dengan `useEffect(() => { if (islamicTime) check(); }, [islamicTime])` (dan dependency yang perlu untuk `check`).

4. **Ubah usePrayerTimeProcess**
   - Sama: guna `islamicTime` dari context, `useEffect` yang depend pada `islamicTime` untuk jalankan logic beep (tiada setInterval).

5. **Semak tengah malam**
   - Dalam DataContext: buang `setInterval(60 000)`.
   - Tambah hook `useMidnightReload(dataLoadDateRef, () => { setMidnightReloadMessage(...); setTimeout(() => window.location.reload(), RELOAD_DELAY_MS); })` yang dalam badan hanya baca tarikh dari IslamicTimeContext dan banding dengan `dataLoadDateRef.current`; bila tarikh tukar, panggil callback.
   - Pastikan DataProvider (atau root yang sesuai) render kedua-dua DataProvider dan IslamicTimeProvider supaya useMidnightReload boleh akses context.

6. **Susunan provider**
   - Pastikan: `TimeSyncProvider` → `DataProvider` → `IslamicTimeProvider` → AppContent (dan slider/DateTimeOverlay). Supaya IslamicTimeProvider boleh guna useTakwimData dan useTimeSync.

7. **Ujian**
   - Paparan tarikh/waktu dan waktu solat tak berubah.
   - Beep dan navigasi azan/iqamah/solat berfungsi seperti sebelum ini.
   - Reload tengah malam masih berlaku bila tarikh bertukar.
   - Monitor RAM/CPU pada peranti 2GB (kurang spike setiap saat).

### Tambahan: Event-based (window) — kurangkan re-render

- **Driver (satu interval):** Dalam tick, selain update context **time** sahaja, semak: (1) lepas Maghrib → dispatch `hijri-date-changed`; (2) 30s sebelum solat → dispatch `prayer-warning`; (3) masuk waktu solat → dispatch `prayer-time`. Jangan letak islamicTime penuh (date, prayer) dalam context.
- **Listeners:** (1) DisplayDate Hijri → listen `hijri-date-changed`, setState(detail.hijri). (2) Komponen blink → listen `prayer-warning` / `prayer-time`, setState(blinking). (3) audioService / module → listen `prayer-time`, beep. (4) Satu listener untuk navigate → listen `prayer-time`, panggil setCurrentView callback. Cleanup: removeEventListener dalam useEffect return.

---

## Pilihan tambahan (optional)

- **Naikkan interval paparan ke 2s:** Jika paparan waktu boleh update setiap 2 saat (bukan setiap 1s), dalam IslamicTimeProvider boleh guna `setInterval(..., 2000)`. Namun detect “saat 00” untuk beep/navigasi mungkin kurang tepat; jika mahu tepat saat 00, lebih selamat kekal 1s untuk tick, dan kurangkan beban dengan satu interval sahaja seperti di atas.
- **Throttle re-render:** Pastikan komponen yang hanya perlukan “minit” atau “tarikh” tidak re-render pada setiap saat dengan memo atau memecah context (contoh: nilai “time” vs “date” berasingan) jika nanti perlu halus lagi.

---

## Ringkasan

- **Punca beban:** Banyak komponen masing-masing ada `setInterval(1s)` melalui useIslamicTime, ditambah dua hook lagi (navigation + process) dan satu interval 60s.
- **Penyelesaian:** Satu IslamicTimeContext yang menjalankan satu interval 1s; semua consumer hanya baca dari context dan bertindak balas kepada nilai (tiada interval baru).
- **Interval fokus masa sahaja:** Satu interval itu untuk **masa (jam)**; tarikh dan waktu solat boleh cache untuk hari ini kerana app reload tengah malam — lagi ringan dan selari dengan lifecycle app.
- **Kesan:** Kurang interval → kurang CPU wake-up dan kurang risiko drop performance pada peranti 2GB RAM, sambil mengekalkan fungsi paparan waktu, solat, beep, dan reload tengah malam.
- **Jssor:** useJssorSlider tiada setInterval; Jssor library ada auto-play 3s. Tiada pertindihan interval dengan plan kita, tetapi kedua-dua tetap kerja berkala.
- **Re-render:** Dengan **event-based (window)**: context hanya untuk **time** → hanya paparan jam re-render setiap saat. Tarikh Hijri (lepas Maghrib), blinking, beep, navigate melalui custom events; hanya komponen yang listen dan set local state akan re-render (jarang). Data tidak di-pass melalui parameter/context untuk trigger — guna window listening, elak re-render selain time.
