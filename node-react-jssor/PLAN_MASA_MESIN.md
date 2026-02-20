# Plan Implementasi: Masa & Tarikh Guna Jam Mesin (Date.now())

Pelan ini merangkumi semua yang kita bincang: tukar ipray kepada **date/time mesin** (backend & frontend guna `Date.now()`), TimeService kekal sebagai library, dan optional update jam mesin dari app.

**Sebelum mula:** Backup fail yang akan diubah dalam folder `backup/YYYY-MM-DD/` (ikut preferensi projek).

---

## 1. Objektif

- **Sumber masa tunggal:** Jam mesin (Raspberry Pi). Bila online, OS (systemd-timesyncd) auto-update; bila offline, user boleh set manual (terminal atau dari setting).
- **Backend & frontend:** Guna `Date.now()` / `new Date()` sahaja — tiada offset dalam app.
- **TimeService:** Kekal sebagai library; optional: NTP + set jam mesin bila berjaya, atau hanya untuk status/API.

---

## 2. Fasa Implementasi

### Fasa A: Backend (Node.js)

| Langkah | Fail | Tindakan |
|--------|------|----------|
| A1 | `nodejs/services/timeService.js` | 1) Tambah `setSystemClock(timestampMs)` — panggil `sudo date -s "YYYY-MM-DD HH:MM:SS"` via `child_process.execSync`. 2) Dalam `tryNtpSync` selepas NTP berjaya: panggil `setSystemClock(Date.now() + offset)`; jika berjaya set `ntpOffset = 0` supaya `now()` = Date.now(). 3) `getTimeInfo()` return `timestamp: Date.now()` bila `systemClockSet` atau bila `ntpOffset === 0`. |
| A2 | `nodejs/services/apiServerService.js` | GET `/api/time`: pastikan response `timestamp` = masa mesin (guna `Date.now()` atau dari `getTimeInfo()` yang sudah return Date.now()). Tiada perubahan besar jika A1 siap. |
| A3 | `nodejs/main.js` | Tiada perubahan wajib. TimeService tetap di-init; optional: pass flag `setSystemClockOnNtpSuccess: true` jika mahu enable set jam mesin selepas NTP. |

**Nota:** Jika OS Raspi sudah sync jam bila online (systemd-timesyncd), NTP dalam app boleh kekal untuk “force sync” atau bila NTP OS dimatikan. `setSystemClock` berguna bila user set masa dari halaman setting (manual).

---

### Fasa B: Frontend (React) — Guna Date.now()

| Langkah | Fail | Tindakan |
|--------|------|----------|
| B1 | `react/src/utils/islamicTimeUtils.js` | Dalam `getCurrentIslamicTime`: ganti `timeService ? timeService.now() : Date.now()` dengan **`Date.now()`**. Param `timeService` boleh dibuang dari signature atau dibiarkan (tak guna). |
| B2 | `react/src/services/prayerTimeService.js` | Dalam `getPrayerTime`, `checkPrayerTime`, `checkAllPrayerTimes`: ganti `timeService ? timeService.now() : Date.now()` dengan **`Date.now()`**. Param `timeService` optional dibuang. |
| B3 | `react/src/contexts/DataContext.jsx` | Pilihan (a) Kekal export `timeService` tetapi pastikan tiada consumer yang bergantung pada offset; atau (b) Ganti dengan stub `timeService: { now: () => Date.now() }`. Buang atau kekal `timeService.init()` / `timeService.cleanup()` mengikut keperluan (jika halaman setting masih fetch `/api/time` untuk paparan, init boleh kekal). |
| B4 | `react/src/contexts/TimeSyncContext.jsx` | Dalam value, ganti `timeService` dengan **`{ now: () => Date.now() }`** supaya `timeService.now()` = masa semasa (mesin/browser). Event `time-offset-updated` / test mode boleh kekal untuk reload jika setting masih guna. |
| B5 | `react/src/hooks/useIslamicTime.js` | Panggil `getCurrentIslamicTime` tanpa hantar `timeService` (atau hantar null). Pastikan dependency array tidak break. |
| B6 | `react/src/hooks/usePrayerTimeNavigation.js` | Jangan pass `timeService` ke prayerTimeService; service guna Date.now() dalam. |
| B7 | `react/src/hooks/usePrayerTimeProcess.js` | Sama seperti B6. |
| B8 | `react/src/services/timeService.js` | **Kekal sebagai library** (tiada panggilan dalam aliran utama untuk “current time”). Boleh biarkan kod sedia ada untuk rujukan atau test mode pada masa depan. |

---

### Fasa C: Halaman Setting — Set Date/Time Mesin & Reload Frontend

| Langkah | Fail | Tindakan |
|--------|------|----------|
| C1 | `nodejs/setting/js/time.js` | Kekal fetch `/api/time` untuk paparan status. Jika ada butang “Set masa mengikut NTP sekarang” atau “Set masa mesin”, panggil API yang trigger NTP + setSystemClock (backend sudah ada sync + set clock). |
| C2 | Backend API | Tambah **POST /api/time/set**. Body: `{ dateTime: "YYYY-MM-DD HH:MM:SS" }`. Validasi format/range. Panggil **sudo timedatectl set-time "..."** atau **sudo date -s "..."** via `child_process.execSync`. Return success/error JSON. |
| C3 | Setting UI | Form di halaman Time: pilih/tulis tarikh dan masa; butang "Set masa mesin" yang POST ke endpoint di atas. |
| C4 | Emit selepas set | Selepas set berjaya: backend emit event guna `socketServerService.broadcastEvent('time-system-updated')`. |
| C5 | Frontend reload | Frontend listen event (socketService) dan panggil **window.location.reload()** supaya seluruh app dapat masa terkini dari Date.now(). Sama seperti flow `time-offset-updated`. |

---

## 3. Urutan Pelaksanaan Disarankan

1. **Backend A1** — timeService: setSystemClock + getTimeInfo guna Date.now().
2. **Frontend B1, B2** — islamicTimeUtils & prayerTimeService guna Date.now().
3. **Frontend B4, B3** — TimeSyncContext & DataContext stub timeService.
4. **Frontend B5, B6, B7** — hooks tidak hantar timeService / guna Date.now().
5. **Backend A2** — pastikan GET `/api/time` return timestamp mesin.
6. **Fasa C** — setting UI set date/time mesin (POST /api/time/set, timedatectl/date -s), emit `time-system-updated`, frontend reload (window.location.reload).

---

## 4. Semakan Selepas Implementasi

- [ ] Backend: `Date.now()` digunakan di mana “current time” diperlukan; GET `/api/time` return masa mesin.
- [ ] Frontend: Tiada panggilan `timeService.now()` untuk dapat “current time”; semua guna `Date.now()` atau stub `now()`.
- [ ] Bila jam mesin di-update (sudo atau dari setting), ipray dapat time/date latest tanpa restart.
- [ ] Bila Raspi online, OS auto-update jam; ipray terus dapat latest via Date.now().

---

## 5. Rujukan Perbincangan

- Set date/time Raspi: `sudo date -s "YYYY-MM-DD HH:MM:SS"` atau `sudo timedatectl set-time "..."`.
- Node boleh update jam mesin via `child_process.execSync('sudo date -s "..."')`.
- TimeService kekal sebagai library; backend/frontend tukar ke Date.now().
- NTP dalam app tiada listener “online”; hanya setInterval. Bila online, OS biasanya dah sync jam.
- Performance: interval NTP 1 jam impact kecil; boleh guna setTimeout berulang atau stop bila offline jika mahu kurangkan beban.
