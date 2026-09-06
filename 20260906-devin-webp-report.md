# Laporan Devin — Migrasi Image ke WebP (Static + Auto-Convert Upload)

**Tarikh:** 2026-09-06
**Skop:** `react/` (frontend kiosk), `nodejs/` (backend kiosk tempatan)
**Dijalankan oleh:** Devin CLI (audit-first workflow, setiap langkah disahkan dengan ujian sebenar sebelum dilaporkan selesai)
**Tujuan laporan:** Untuk semakan/analisa Claude sebelum commit Task 2 dijalankan.

---

## 1. Ringkasan Eksekutif

| Task | Status | Commit |
|---|---|---|
| 1. Convert 18 static image (.jpg/.png) → .webp + update code references | ✅ Selesai, **sudah di-commit** | `c1cc454` |
| 2. Auto-convert upload image (penceramah/slideshow/dll) → .webp guna `sharp` | ✅ Selesai, teruji, **BELUM di-commit** | — (working tree) |

Kedua-dua task datang dari brief user yang ditulis terus (bukan draf Claude). Devin jalankan audit-first (baca kod sebenar dahulu) sebelum implement, dan jumpa beberapa percanggahan/bug dalam brief asal — disenaraikan di Bahagian 3 & 4 untuk semakan.

---

## 2. Task 1 — Static Image → WebP (SUDAH DI-COMMIT: `c1cc454`)

### 2.1 Apa yang dibuat
- Convert 18 fail static (.jpg/.png) → .webp (cwebp -q 85), fail asal **dikekalkan**:
  - `react/public/img/`: bg-page4, mute-phone, silent, bg-kd/kk/km/ks, SOLAT, noimage
  - `react/public/img/slideshow/`: slide01–07
  - `nodejs/images/slides/`: bg-mta, picture4
- Update 9 code reference (styles.js, DeathAnnouncementOverlay.jsx, kuliahHelpers.js, PrayerSequencePage.jsx, slideshowProcessor.js, sliderConfig.js ×5, mosqueInfo.js, Slide.jsx)
- Tambah `.webp: image/webp` dalam `nodejs/services/publicServerService.js` (custom MIME map)
- Kemaskini `nodejs/data/images.txt` (mapping `bg-mta`/`picture4` → path .webp)

### 2.2 Percanggahan/isu ditemui semasa audit (diselesaikan dengan approval user eksplisit)

1. **`bg-mta.jpg` & `picture4.jpg` sebenarnya berada dalam `nodejs/images/slides/`** — folder yang brief asal sendiri larang disentuh ("JANGAN sentuh nodejs/images/ — user-uploaded images"). Fail ini dirujuk melalui `withAssetBase()` dalam `mosqueInfo.js` & `sliderConfig.js`, dan comment kod sendiri sahkan ia "dihoskan di backend, bukan dibundle dengan frontend".
   - **Keputusan user:** override — convert juga (2 fail sahaja, bukan seluruh `nodejs/images/`).
2. **`mountant0.jpeg`** (default image `slidesTemplate.slideshow`, `sliderConfig.js:338`) — dead reference, fail tak wujud langsung dalam repo.
   - **Keputusan user:** buang baris tersebut (`image: null`).
3. **`nodejs/public/img/` ialah build artifact**, bukan sumber manual — `vite.config.js` (`outDir: '../nodejs/public'`, `emptyOutDir: true`) auto-wipe & auto-copy `react/public/*` setiap `npm run build`. Convert manual di situ jadi kerja berganda tak perlu.
   - **Keputusan user:** convert `react/public/img/` sahaja, biar `npm run build` sync — **disahkan berjaya** (fail .webp muncul di `nodejs/public/img/` selepas build tanpa disentuh manual).

### 2.3 Ujian yang dijalankan
- `npm run build` (react) — berjaya, no error.
- Backend `npm start`, curl semua endpoint image (`/img/*.webp` port 3000, `/images/slides/*.webp` port 3001) → semua `200 image/webp`.
- Browser preview dibuka untuk semakan visual user.

---

## 3. Task 2 — Auto-Convert Upload ke WebP (BELUM DI-COMMIT)

### 3.1 Apa yang dibuat
- `npm install sharp` (`nodejs/package.json`: `"sharp": "^0.35.4"`)
- `nodejs/services/dataService.js` — fungsi `saveUploadedImage()` diubah: convert upload ke `.webp` (quality 85) guna `sharp`, **kecuali** SVG dan GIF (dikekalkan format asal).

### 3.2 Bug ditemui dalam brief asal (dibetulkan semasa audit)

Brief asal user cuma sediakan guard untuk `.svg`:
```js
if (originalExt === '.svg') { ... kekal svg ... } else { ... sharp webp ... }
```
Tapi **constraint brief itu sendiri** kata *"GIF JANGAN diconvert — kekalkan sebagai .gif (animated)"*, dan `apiServerService.js` punya `multer.fileFilter` (baris 907) **explicitly benarkan** `image/gif` untuk upload. Kalau guard svg-sahaja diikut verbatim, animated GIF akan cuba di-`sharp().webp()` dan **pecahkan animasi** (jadi frame statik).

**Fix Devin:** satu flag `skipConvert = originalExt === '.svg' || originalExt === '.gif'` — cover kedua-dua format tanpa animated-webp conversion (terlalu berisiko/tak stabil untuk kes ni).

### 3.3 Diff penuh (`nodejs/services/dataService.js`)

```diff
 const fs = require('fs');
 const path = require('path');
+const sharp = require('sharp');
 const { sendAck, deleteFile, uploadFile } = require('./cloudClient');
 const { isHebahanActive } = require('../utils/hebahanDate');

@@ saveUploadedImage() @@
-    const sanitizedName = String(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
+    // Sanitize nama dan tentukan extension asal
+    const baseName = String(originalName)
+      .replace(/[^a-zA-Z0-9.-]/g, '_')
+      .replace(/\.[^.]+$/, '');              // buang extension asal
+    const originalExt = (String(originalName).match(/\.[^.]+$/)?.[0] || '').toLowerCase();
+
     const destDir = path.join(imagesPath, category);
     if (!fs.existsSync(destDir)) {
       fs.mkdirSync(destDir, { recursive: true });
     }

-    const actualPath = path.join(destDir, sanitizedName);
-    fs.writeFileSync(actualPath, buffer);
+    // SVG dan GIF (animated) TIDAK dikonversi — kekalkan format asal.
+    // Format lain (jpg/jpeg/png/webp/bmp dll) dikonversi ke .webp.
+    const skipConvert = originalExt === '.svg' || originalExt === '.gif';
+    const finalExt = skipConvert ? (originalExt || '.bin') : '.webp';
+    const finalName = `${baseName}${finalExt}`;
+    const finalPath = path.join(destDir, finalName);
+
+    if (skipConvert) {
+      fs.writeFileSync(finalPath, buffer);
+    } else {
+      await sharp(buffer).webp({ quality: 85 }).toFile(finalPath);
+    }

     // Verify file size > 0
-    const stats = fs.statSync(actualPath);
+    const stats = fs.statSync(finalPath);
     if (!stats || stats.size === 0) {
-      try { fs.unlinkSync(actualPath); } catch (e) {}
+      try { fs.unlinkSync(finalPath); } catch (e) {}
       throw new Error('Fail kosong. Upload mungkin gagal.');
     }

-    const imagePath = `/images/${category}/${sanitizedName}`;
+    const imagePath = `/images/${category}/${finalName}`;
     const folder = `/images/${category}`;

     (async () => {
       try {
-        await uploadFile(actualPath, folder);
-        await sendAck(sanitizedName, 'uploaded');
+        await uploadFile(finalPath, folder);
+        await sendAck(finalName, 'uploaded');
       } catch (cloudError) { ... }
     })();

     return {
       success: true,
       path: imagePath,
-      filename: sanitizedName,
+      filename: finalName,
       category,
-      actualPath
+      actualPath: finalPath
     };
```

**Fail lain (disahkan TIADA perlu ubah, verified dengan `git diff --stat` = kosong):**
- `nodejs/services/apiServerService.js` — endpoint `/api/images/upload` cuma guna `saved.path`/`saved.filename`/`saved.category`, tak assume extension.
- `nodejs/services/cloudSocketHandler.js` — event `cloud:image:upload` sama, tak assume extension.
- Delete flow (`dataService.js` ~baris 1009-1160) — match by string dari `images.txt`, tak hardcode extension.

### 3.4 Ujian yang dijalankan (real upload via curl + verifikasi format fail sebenar)

Backend dijalankan (`npm start`), token diambil dari `GET /api/token`, upload sebenar ke `POST /api/images/upload?category=test_upload`:

| Upload | Response `path` | Fail sebenar di disk (`file` command) | HTTP serve Content-Type |
|---|---|---|---|
| `.jpg` (1920×1080 real photo) | `/images/test_upload/test-photo.webp` | `RIFF... Web/P image, VP8 encoding, 1920x1080` | `image/webp` |
| `.png` | `/images/test_upload/test-photo.webp` | (sama basename → overwrite, expected) | `image/webp` |
| `.svg` (6.5MB) | `/images/test_upload/test-icon.svg` | `SVG Scalable Vector Graphics image` (tidak dikonversi) | `image/svg+xml` |
| `.gif` (animated) | `/images/test_upload/test-anim.gif` | `GIF image data, version 89a` (tidak dikonversi) | `image/gif` |

Folder test (`nodejs/images/test_upload/`) dan fail test sementara (`/tmp/upload-test/`) sudah **dibersihkan** selepas ujian — tiada sisa dalam repo.

`node -e "require('./services/dataService.js')"` — load tanpa syntax error.

---

## 4. Isu untuk pertimbangan Claude sebelum commit Task 2

1. **Sharp = native binary dependency (~28MB `@img/*` prebuilt binaries).** `node_modules/` sudah di-gitignore (`nodejs/.gitignore:129-130`), jadi deploy ke kiosk server (`ipray@100.108.32.65`, kemungkinan ARM/Linux — rujuk `AGENTS.md`) **mesti** jalankan `npm install` terus di server tu supaya dapat prebuilt binary platform yang betul. **Jangan** rsync `node_modules/` dari mesin dev (macOS arm64) ke kiosk — akan gagal load kalau arch/OS lain.
2. **`package-lock.json` berubah besar** (589 insertion / 26 deletion) — biasa untuk `npm install` package baru dengan banyak transitive deps (`@img/sharp-*` per-platform optional deps). Perlu disemak sekali oleh Claude untuk pastikan tiada package mencurigakan masuk (`npm audit` laporkan 7 vulnerabilities sedia ada — 3 moderate, 4 high — **wujud sebelum perubahan ini**, bukan disebabkan `sharp`; disyorkan audit berasingan, luar skop task ini).
3. **Overwrite by basename collision** (contoh ujian: `.jpg` dan `.png` dengan nama sama → kedua-dua jadi `.webp` dan overwrite) — ini **tingkah laku sama seperti kod asal** (sanitize by originalName, bukan isu baru diperkenalkan oleh perubahan ini), tapi timbul lebih kerap sekarang sebab semua non-svg/gif upload "convergence" ke `.webp`. Contoh: upload `foto.jpg` dan kemudian `foto.png` berasingan → kedua-dua jadi `foto.webp`, yang kedua overwrite yang pertama. Sebelum ni pun ada risiko sama (`foto.jpg` upload dua kali overwrite), jadi tak bertambah teruk — cuma nota untuk rekod.
4. Task 2 **belum commit/push** ikut arahan asal ("JANGAN commit atau push — hantar untuk semakan dulu"). Menunggu keputusan Claude/user untuk proceed commit.

---

## 5. Status Git semasa

```
Branch: main
Modified (uncommitted):
  M nodejs/package-lock.json
  M nodejs/package.json
  M nodejs/services/dataService.js
```

Task 1 sudah masuk commit `c1cc454` (± 30 minit sebelum sesi Task 2 bermula) — nampaknya dilakukan oleh Claude/user selepas Devin serah hasil, co-authored `Claude Sonnet 4.6`.
