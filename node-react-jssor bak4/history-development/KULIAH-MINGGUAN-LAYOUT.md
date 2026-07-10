# Kuliah Mingguan - Layout 2 Kolom

## Tarikh: 14 Februari 2026

## Perubahan

Membuat style baru untuk kuliah mingguan dengan layout 2 kolom yang lebih efisien untuk memaparkan kuliah mengikut waktu solat.

## Struktur Layout

### Layout 2 Kolom:

```
┌─────────────────────────────────────────────────────┐
│           JADUAL KULIAH MINGGU INI                  │
├──────────────────────┬──────────────────────────────┤
│   KULIAH MAGHRIB     │      KULIAH SUBUH            │
├──────────────────────┼──────────────────────────────┤
│ 1. Pensyarah A       │ 1. Pensyarah G               │
│    Kitab A           │    Kitab G                   │
│    Isnin | 17 Feb    │    Isnin | 17 Feb            │
├──────────────────────┼──────────────────────────────┤
│ 2. Pensyarah B       │ 2. Pensyarah H               │
│    Kitab B           │    Kitab H                   │
│    Selasa | 18 Feb   │    Selasa | 18 Feb           │
├──────────────────────┼──────────────────────────────┤
│ 3. Pensyarah C       │ 3. Pensyarah I               │
│    Kitab C           │    Kitab I                   │
│    Rabu | 19 Feb     │    Rabu | 19 Feb             │
├──────────────────────┼──────────────────────────────┤
│ 4. Pensyarah D       │      KULIAH DHUHA            │
│    Kitab D           ├──────────────────────────────┤
│    Khamis | 20 Feb   │ 1. Pensyarah J               │
├──────────────────────┤    Kitab J                   │
│ 5. Pensyarah E       │    Isnin | 17 Feb            │
│    Kitab E           ├──────────────────────────────┤
│    Jumaat | 21 Feb   │ 2. Pensyarah K               │
├──────────────────────┤    Kitab K                   │
│ 6. Pensyarah F       │    Selasa | 18 Feb           │
│    Kitab F           ├──────────────────────────────┤
│    Sabtu | 22 Feb    │ 3. Pensyarah L               │
├──────────────────────┤    Kitab L                   │
│ 7. Pensyarah G       │    Rabu | 19 Feb             │
│    Kitab G           ├──────────────────────────────┤
│    Ahad | 23 Feb     │ 4. Pensyarah M               │
│                      │    Kitab M                   │
│                      │    Khamis | 20 Feb           │
└──────────────────────┴──────────────────────────────┘
```

### Kapasiti:
- **Kolom Kiri (Kuliah Maghrib)**: 6-7 kuliah
- **Kolom Kanan - Baris Atas (Kuliah Subuh)**: ≤3 kuliah
- **Kolom Kanan - Baris Bawah (Kuliah Dhuha)**: ≤4 kuliah

## Ciri-ciri

1. **Tiada Gambar**: Layout baru hanya memaparkan teks (nama pensyarah, kitab, tarikh)
2. **Label Kategori**: Setiap section ada label kategori (KULIAH MAGHRIB, KULIAH SUBUH, KULIAH DHUHA)
3. **Responsive**: Menggunakan screen utilities untuk scaling automatik
4. **Transition**: 
   - Kolom kiri: CLIP|L (masuk dari kiri)
   - Kolom kanan: CLIP|R (masuk dari kanan)
5. **Active State**: Kuliah hari ini ditandakan dengan warna merah
6. **Batal State**: Kuliah yang dibatalkan ditandakan dengan line-through dan warna kelabu

## Fail-fail Yang Terlibat

### Fail Baru:
1. **`/react/src/config/weeklyLayoutBuilder.js`**
   - Builder untuk layout 2 kolom
   - Fungsi: `buildKuliahWeeklyTwoColumnChildren()`, `getWeeklyLayoutInfo()`

2. **`/react/src/processors/kuliahWeeklyProcessor.js`**
   - Processor khusus untuk kuliah mingguan
   - Fungsi: `processKuliahMingguan()`

### Fail Yang Diubah:
1. **`/react/src/processors/kuliahProcessor.js`**
   - Export `processKuliahMingguan` dari `kuliahWeeklyProcessor.js`
   - Fungsi `processKuliahHarian()` dan `processKuliahBulanan()` kekal dalam fail ini

### Fail Yang Tidak Diubah:
- `/react/src/hooks/useSlides.js` - Kekal menggunakan import yang sama
- `/react/src/config/sliderConfig.js` - Template kekal sama
- `/react/src/config/slideBuilders.js` - Fungsi lama kekal untuk backward compatibility

## Backup

Fail backup disimpan di:
- `/backup/2026-02-14/kuliahProcessor copy.js.bak`
- `/backup/2026-02-14/slideBuilders copy.js.bak`

## Cara Penggunaan

Layout baru akan digunakan secara automatik untuk kuliah mingguan. Tiada perubahan diperlukan pada data atau konfigurasi.

## Format Data

Format data kekal sama seperti sebelum ini:
```
W1|D1|maghrib|Pensyarah A|IMG001|Kitab A
W1|D2|subuh|Pensyarah B|IMG002|Kitab B
W1|D3|dhuha|Pensyarah C|IMG003|Kitab C
```

Di mana:
- W1 = Minggu 1
- D1 = Hari 1 (Isnin)
- maghrib/subuh/dhuha = Jenis kuliah
- Pensyarah A = Nama pensyarah
- IMG001 = Kod gambar (tidak digunakan dalam layout baru)
- Kitab A = Nama kitab

## Testing

Untuk menguji layout baru:
1. Pastikan ada data kuliah untuk minggu semasa
2. Buka aplikasi dan navigasi ke slide kuliah mingguan
3. Semak layout 2 kolom memaparkan data dengan betul
4. Semak label kategori muncul untuk setiap section
5. Semak transition animation berfungsi dengan lancar

## Nota

- Layout lama (dengan gambar) masih boleh digunakan dengan mengembalikan import asal dalam `kuliahProcessor.js`
- Jika perlu tambah kategori baru (contoh: KULIAH KHAS), update `CATEGORY_ORDER` dalam `kuliahWeeklyProcessor.js` dan tambah section baru dalam `weeklyLayoutBuilder.js`
