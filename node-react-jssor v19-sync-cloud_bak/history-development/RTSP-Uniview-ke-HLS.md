# CCTV Uniview (RTSP / Port RTS) ke HLS untuk Siaran Langsung

Pelayar web tidak boleh main RTSP terus. Untuk guna stream CCTV Uniview dalam **Siaran Langsung** (LiveStreamOverlay), tukar RTSP ke HLS (.m3u8) dahulu.

---

## Dalam Electron / App (aliran automatik)

Bila app (termasuk Electron) berjalan:

1. **Aliran:** Data Siaran Langsung diambil dari `data/livestream.txt` (atau melalui API). Pengguna mulakan siaran dari panel tetapan → backend terima `live:start` dengan `url` dan `title`.
2. **YouTube / Facebook / HLS / video:** URL dihantar terus ke overlay; overlay memaparkan mengikut jenis URL.
3. **CCTV (RTSP):** Jika `url` bermula dengan `rtsp://`, backend **secara automatik** menjalankan FFmpeg (RTSP→HLS), kemudian menghantar **URL HLS** ke overlay. Tiada tindakan tambahan dari pengguna—hanya mulakan siaran seperti biasa.
4. Bila siaran dihentikan (`live:stop`), proses FFmpeg turut dihentikan.

### Cara set IP:port untuk RTSP (Uniview)

**Tetapan RTSP = lajur URL dalam livestream.**

Dalam **data/livestream.txt** atau melalui **panel Siaran Langsung**, masukkan **satu baris** dengan format:

```
Tajuk Siaran|rtsp://USER:PASS@IP:PORT/path|jenis
```

Contoh:

```
CCTV Masjid|rtsp://admin:password123@192.168.1.100:554/Streaming/Channels/101|cctv
```

- **IP** — alamat NVR/DVR Uniview (cth: 192.168.1.100)
- **PORT** — port RTS/RTSP (biasanya **554**; semak di Setting → Network → Port pada Uniview)
- **path** — path stream (cth: `Streaming/Channels/101`; rujuk manual Uniview)
- **USER** / **PASS** — login NVR/DVR jika diperlukan

Tiada fail konfigurasi lain untuk IP:port—semua dalam URL tersebut. Bila anda klik “Mulakan” siaran untuk baris itu, app akan jalankan RTSP→HLS dan papar dalam overlay.

### Keperluan untuk RTSP dalam Electron

- **FFmpeg** mesti dipasang dan boleh dijalankan dari **PATH** (cth: `ffmpeg` dalam terminal). Dalam Electron yang di-package (Windows), pastikan FFmpeg ada dalam PATH sistem atau pasang di mesin yang menjalankan app.

### Halaman ujian HLS (test sahaja)

Route khas dalam public server supaya halaman ujian HLS sentiasa dilayan (tidak fallback ke React):

- **`http://localhost:3000/test-hls`** atau **`http://localhost:3000/test-hls.html`**
- Masukkan URL HLS (default: `http://localhost:3000/hls/cctv/index.m3u8`) dan klik **Muat & Main**.
- Pastikan siaran CCTV (RTSP) sudah dimulakan dari panel tetapan dahulu supaya FFmpeg telah hasilkan fail HLS.

Dalam `publicServerService.js`, path `/test-hls` dan `/test-hls.html` diurus dahulu dan menghidangkan `public/test-hls.html`; permintaan tidak dihantar ke fallback SPA (index.html).

---

### Jika tiada gambar / stream tak keluar

- **Tunggu 4–5 saat** selepas klik mulakan siaran — app sengaja lambatkan paparan supaya FFmpeg sempat tulis HLS.
- **Semak URL RTSP:** IP, port 554, path (cth. `/unicast/c1/s0/live`), user/kata laluan betul. Uji dengan VLC: Media → Open Network Stream → masukkan URL RTSP.
- **FFmpeg dalam PATH:** Buka cmd/PowerShell, taip `ffmpeg -version`. Jika tidak dikenali, pasang FFmpeg dan tambah ke PATH.
- **Rangkaian:** Komputer yang jalankan app mesti boleh capai IP kamera/NVR (ping IP, atau buka http://IP dalam browser).
- Overlay akan **cuba muat semula** sehingga 6 kali (setiap 2 saat) jika sambungan gagal — jika masih gagal, ralat akan dipaparkan.

---

## Pilihan 1: FFmpeg (command line)

Pasang [FFmpeg](https://ffmpeg.org/download.html), kemudian jalankan:

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://USER:PASS@IP:554/path" \
  -c:v copy -c:a aac -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments+append_list \
  -hls_segment_filename "output%03d.ts" output.m3u8
```

**Gantikan:**
- `USER` / `PASS` – login NVR/DVR Uniview (jika ada)
- `IP` – alamat IP Uniview (contoh: 192.168.1.100)
- `554` – port RTS/RTSP (biasanya 554; semak dalam tetapan Uniview)
- `path` – path stream (contoh: `Streaming/Channels/101` atau ikut manual Uniview)

**Output:** fail `output.m3u8` dan `output000.ts`, `output001.ts`, ...  
Letakkan dalam folder yang dilayan oleh web server (contoh: `nodejs/public/hls/cctv/`) dan pastikan server boleh serve `.m3u8` dan `.ts`.

**URL untuk Siaran Langsung:**  
`http://localhost:3000/hls/cctv/output.m3u8` (atau ganti host/port mengikut setup anda).

---

## Pilihan 2: FFmpeg manual (jika tidak guna app)

Jika anda tidak guna app/Electron dan mahu jalankan FFmpeg sendiri, guna arahan di Pilihan 1. Letakkan output HLS dalam folder yang dilayan oleh web server, kemudian masukkan URL HLS dalam tetapan Siaran Langsung.

---

## Semak port RTS Uniview

1. Masuk antaramuka web NVR/DVR Uniview.
2. Cari **Setting → Network → Port** (atau sama).
3. Port **RTS** / **RTSP** biasanya **554** (default).
4. URL RTSP lazim: `rtsp://[user]:[pass]@[ip]:554/[path]` — path ikut model (lihat manual atau Configuration → Live View / Stream).

---

## Ringkasan

**Dalam app/Electron (disyorkan):** Masukkan URL RTSP penuh dalam lajur URL Siaran Langsung → mulakan siaran → app jalankan RTSP→HLS secara automatik dan papar dalam overlay.

**Tanpa app (manual):** Dapatkan URL RTSP → tukar ke HLS dengan FFmpeg (Pilihan 1) → letak fail HLS di server → masukkan URL HLS dalam tetapan Siaran Langsung.
