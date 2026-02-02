# IPRAY React Migration

Ini adalah versi React untuk aplikasi IPRAY yang asalnya menggunakan vanilla JavaScript.

## 📋 Table of Contents

1. [Struktur Project](#struktur-project)
2. [Kelebihan React Migration](#kelebihan-react-migration)
3. [Fungsi Toggle Imsak](#fungsi-toggle-imsak)
4. [Cara Guna](#cara-guna)
5. [Perbezaan dengan Original](#perbezaan-dengan-original)
6. [Migration Strategy](#migration-strategy)
7. [Custom Hooks](#custom-hooks)
8. [Components](#components)
9. [File Structure Comparison](#file-structure-comparison)
10. [Benefits](#benefits)
11. [Bugfix: Tarikh Hijri Selepas Maghrib](#bugfix-tarikh-hijri-selepas-maghrib)
12. [Cycle Detection System](#cycle-detection-system)
13. [Component Renaming](#component-renaming)
14. [Troubleshooting Image Loading](#troubleshooting-image-loading)
15. [API Endpoints](#api-endpoints)
16. [Image Management UI](#image-management-ui)
17. [Troubleshooting](#troubleshooting)
18. [Development Notes](#development-notes)
19. [Changelog](#changelog)
20. [Smart Data System](#smart-data-system)
21. [Data Paths Configuration](#data-paths-configuration)
22. [Settings Website](#settings-website)
23. [License](#license)

---

## Struktur Project

```
react-migration/
├── src/
│   ├── components/          # React components
│   │   ├── PrayerTimes.jsx
│   │   ├── Activity.jsx
│   │   ├── WeeklyLecture.jsx
│   │   ├── ReligiousEvent.jsx
│   │   └── MediaCarousel.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── usePrayerTimes.js
│   │   ├── useDataLoader.js
│   │   └── usePageTransition.js
│   ├── App.jsx             # Main App component
│   ├── App.css             # Styles
│   └── main.jsx            # Entry point
├── electron-main.js        # Electron main process
├── preload.js              # Electron preload script
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── index.html              # HTML template
```

---

## Kelebihan React Migration

### 1. **State Management yang Lebih Baik**
- Menggunakan React state dan hooks
- Custom hooks untuk business logic
- Context API untuk global state

### 2. **Component Architecture**
- Setiap page jadi component terpisah
- Reusable components
- Better separation of concerns

### 3. **Modern Development**
- Hot reload dengan Vite
- Better debugging tools
- TypeScript support (optional)

### 4. **Maintainability**
- Code lebih organized
- Easier testing
- Better error handling

### 5. **Image Loading Improvements** (Latest Update)
- **URL Image Support**: Menyokong loading gambar dari URL external (seperti Unsplash)
- **CORS Handling**: Automatic retry mechanism untuk CORS issues
- **Loading States**: Visual feedback semasa loading gambar
- **Error Handling**: Fallback display untuk gambar yang gagal load
- **Preloading**: Images di-preload untuk performance yang lebih baik
- **CSP Compliance**: Fixed Content Security Policy issues dengan local files
- **DOM Stability**: Fixed React DOM manipulation errors dengan proper container structure
- **Default Data Fix**: Updated default slide data untuk menggunakan URL images sahaja
- **CSP Policy Update**: Updated CSP policy untuk allow external images (`img-src 'self' data: https:`)
- **DOM Safety**: Added comprehensive DOM element checks untuk elakkan getAttribute errors
- **Electron CSP**: Fixed Electron security warning dengan proper CSP policy
- **React-Based Slider**: Replaced problematic imageSlider dengan pure React state management

---

## Fungsi Toggle Imsak

Aplikasi ini mempunyai fungsi custom untuk toggle waktu imsak:

### Cara Guna
- **Global Function**: `window.toggleImsak()` - boleh dipanggil dari mana-mana tempat
- **React Hook**: `toggleImsak()` - dari `usePrayerTimes` hook

### Logik Toggle
- **Jika Imsak SHOW**: Selepas Isyak, waktu seterusnya adalah Imsak
- **Jika Imsak HIDE**: Selepas Isyak, waktu seterusnya adalah Subuh

### Contoh Penggunaan
```javascript
// Toggle imsak show/hide
window.toggleImsak();

// Atau dalam React component
const { toggleImsak, showImsak } = usePrayerTimes(prayerData, config);
toggleImsak(); // Toggle state
console.log(showImsak); // true/false
```

### Config Setting
Setting imsak boleh dikawal melalui file `data/config.txt`:
```
// IMSAK DISPLAY 1=show 0=hide
IMSAK_DISPLAY=0
```
Default adalah `0` (hidden/tersembunyi).

---

## Cara Guna

### Development
```bash
# Install dependencies
npm install

# Option 1: Run React dev server sahaja (browser mode dengan mock data)
npm run react:dev
# Buka: http://localhost:3000

# Option 2: Run Electron dengan React (development mode)
# Terminal 1: Start Vite dev server
npm run react:dev

# Terminal 2: Start Electron (dalam terminal baru)
npm run electron:dev

# Option 3: Run kedua-dua sekali (recommended)
npm run dev:full
```

### Production Build
```bash
# Build React app
npm run react:build

# Build Electron app
npm run build
```

### Folder Structure
```
react-migration/
├── public/              # Static assets
│   ├── css/            # CSS files
│   ├── fonts/          # Font files
│   └── images/         # Image files
├── src/                # React source code
└── dist/               # Built files
```

---

## Perbezaan dengan Original

### Original (Vanilla JS)
- Global variables untuk state
- Manual DOM manipulation
- setInterval untuk updates
- Direct file reading

### React Version
- React state dan hooks
- Declarative rendering
- useEffect untuk side effects
- Custom hooks untuk data management

---

## Migration Strategy

1. **Hybrid Approach**: Keep Electron, migrate frontend ke React
2. **Gradual Migration**: Migrate satu component pada satu masa
3. **Maintain API**: Keep same Electron API untuk data loading
4. **Preserve Logic**: Convert business logic ke React patterns

---

## Custom Hooks

### `usePrayerTimes`
- Manage prayer times calculation
- Real-time updates
- Hijri date conversion

### `useDataLoader`
- Load data dari Electron API
- Handle file changes
- Data processing dan caching

### `usePageTransition`
- Manage page transitions
- Timer management
- Animation states

---

## Components

### `PrayerTimes`
- Display prayer times
- Date dan time display
- Blinking animations

### `Activity`
- Menampilkan pengumuman acara dengan maklumat lengkap
- Auto-cycling content setiap 5 saat
- Smooth transitions dengan animasi fade
- Menunjukkan countdown "HARI LAGI" atau "SEKARANG"
- **Cycle Detection**: Track bila cycle sudah tamat atau berjalan

### `WeeklyLecture`
- Menampilkan maklumat kuliah mingguan
- Maklumat penceramah, tarikh, masa, dan topik
- Ikon pengajar di sebelah kanan
- Auto-cycling content setiap 5 saat
- **Cycle Detection**: Track bila cycle sudah tamat atau berjalan

### `ReligiousEvent`
- Menampilkan countdown peristiwa dengan tarikh Masihi dan Hijrah
- Menghitung hari yang tinggal untuk setiap peristiwa
- Format jadual dengan kolum: Peristiwa, Masihi, Hijrah, Hari
- **Cycle Detection**: Jika events > 9, auto-cycle setiap 10 saat (display 9 rows per page)

### `MediaCarousel`
- Menampilkan media dalam bentuk carousel (gambar, video, iframe)
- Support untuk 3 jenis media: gambar (isVid=0), video (isVid=1), iframe (isVid=2)
- Auto-cycle setiap 5 saat
- Video auto-play dan berhenti selepas tamat
- **Cycle Detection**: Track bila cycle sudah tamat atau berjalan

---

## File Structure Comparison

| Original | React Version |
|----------|---------------|
| `presentation.js` | `App.jsx` + hooks |
| `data-loader.js` | `useDataLoader.js` |
| Manual DOM | Components |
| Global state | React state |
| setInterval | useEffect |

---

## Benefits

1. **Better Code Organization**: Components dan hooks
2. **Easier Maintenance**: Clear separation of concerns
3. **Modern Development**: Hot reload, better tools
4. **Scalability**: Easy to add new features
5. **Testing**: Better testing capabilities

---

## Bugfix: Tarikh Hijri Selepas Maghrib

### Masalah 1: Fallback Approximation Guna Nilai Salah
Tarikh Hijri tidak berubah selepas waktu Maghrib walaupun logik `DaysH++` sudah berjalan.

**Punca:**
Fallback approximation menggunakan nilai `daysm` (nilai asal) sebaliknya `DaysH` (nilai yang sudah ditambah +1 selepas Maghrib).

**Penyelesaian:**
Tukar semua `daysm` kepada `DaysH` dalam fallback approximation.

### Masalah 2: Hdata Exhausted Guna DaysH Yang Salah
Apabila data takwim.txt tidak mencukupi (exhausted), tarikh Hijri salah. Contoh: dapat 17/4/1443 sepatutnya 12/4/1447.

**Punca:**
Apabila algoritma hdata exhausted, nilai `DaysH` sudah dikurangkan berkali-kali dalam while loop. Bila fallback approximation guna `DaysH` yang remaining (contoh: 7954), ia kira tahun yang salah (2021 bukannya 2025).

```javascript
// DaysH asal: 9409 (3 Oktober 2025)
// Selepas while loop: DaysH = 7954 (remaining)

// Fallback guna DaysH remaining
const gregorianYear = 2000 + Math.floor(7954 / 365.25)  // = 2021 ✗ SALAH!
const hijriYear = 2021 - 578  // = 1443 ✗ SALAH! (patut 1447)
```

**Penyelesaian:**
Simpan nilai `DaysH` asal sebelum masuk while loop, kemudian guna nilai asal tersebut dalam fallback approximation:

```javascript
const DaysH_Original = DaysH // SIMPAN nilai asal

// ... while loop (DaysH dikurangkan) ...

// Fallback guna DaysH_Original (nilai asal)
const gregorianYear = 2000 + Math.floor(DaysH_Original / 365.25)  // ✓ BETUL!
const hijriYear = gregorianYear - 578  // ✓ BETUL!
```

### Hasil
Semua case berfungsi dengan betul:

| Case | Sebelum | Selepas | Status |
|------|---------|---------|--------|
| Tanpa hdata, sebelum Maghrib | 11/4/1447 | 11/4/1447 | ✓ |
| Tanpa hdata, selepas Maghrib | 11/4/1447 ✗ | 12/4/1447 ✓ | FIXED |
| Dengan hdata exhausted, sebelum Maghrib | 16/4/1443 ✗ | 11/4/1447 ✓ | FIXED |
| Dengan hdata exhausted, selepas Maghrib | 17/4/1443 ✗ | 12/4/1447 ✓ | FIXED |

### Refactoring
Kod telah direfactor untuk menghapuskan code duplication - kedua-dua bahagian fallback approximation digabungkan menjadi satu menggunakan flag `useFallback`.

### Backup
- Bugfix 1: `backup/2025-10-03/hijriUtils copy.js6.bak`
- Refactor: `backup/2025-10-03/hijriUtils copy.js7.bak`
- Bugfix 2: `backup/2025-10-03/hijriUtils copy.js8.bak`

---

## Cycle Detection System

### Latar Belakang
Component **Announcements**, **Kuliah**, dan **Slider** mempunyai auto-cycling mechanism untuk menukar content secara automatik setiap 5 saat. Sebelum ini, tiada cara untuk mengetahui:
- Sama ada cycle sedang berjalan atau sudah berhenti
- Berapa banyak cycle sudah tamat
- Bila satu cycle complete (kembali ke item pertama)

### Implementasi
Setiap component yang mempunyai cycle kini dilengkapi dengan:

#### 1. State Management
```javascript
const [cycleCount, setCycleCount] = useState(0)      // Bilangan cycle yang sudah complete
const [isCycleRunning, setIsCycleRunning] = useState(false)  // Status cycle (running/stopped)
```

#### 2. Cycle Detection Logic
```javascript
setCurrentIndex((prev) => {
  const nextIndex = (prev + 1) % data.length
  
  // Detect cycle completion: bila kembali ke index 0
  if (nextIndex === 0 && prev !== 0) {
    setCycleCount(count => count + 1)
    console.log(`[ComponentName] Cycle complete: ${cycleCount + 1} cycles`)
  }
  
  return nextIndex
})
```

#### 3. Status Logging
```javascript
useEffect(() => {
  if (data.length > 0) {
    console.log(`[ComponentName] Index: ${currentIndex + 1}/${data.length} | Cycle: ${cycleCount} | Running: ${isCycleRunning}`)
  }
}, [currentIndex, cycleCount, isCycleRunning, data.length])
```

### Output Console
Setiap component akan log status dalam format:
```
[Announcements] Index: 1/3 | Cycle: 0 | Running: true
[Announcements] Index: 2/3 | Cycle: 0 | Running: true
[Announcements] Index: 3/3 | Cycle: 0 | Running: true
[Announcements] Cycle complete: 1 cycles
[Announcements] Index: 1/3 | Cycle: 1 | Running: true
```

### Components dengan Cycle Detection
| Component | Interval | Cycle Detection | Trigger |
|-----------|----------|-----------------|---------|
| Activity | 5 saat | ✓ Ada | Jika data.length > 1 |
| WeeklyLecture | 5 saat | ✓ Ada | Jika data.length > 1 |
| MediaCarousel | 5 saat | ✓ Ada | Jika slides.length > 1 |
| ReligiousEvent | 10 saat | ✓ Ada | Jika events.length > 9 |

### Kegunaan
1. **Debugging**: Mudah trace bila ada masalah dengan auto-cycling
2. **Monitoring**: Track berapa lama component telah running
3. **Analytics**: Boleh tambah analytics untuk track user engagement
4. **Testing**: Mudah untuk test cycle completion logic

### Countdown Component - Special Case
Component Countdown berbeza sikit kerana ia ada had maksimum **9 rows** yang boleh dipaparkan. Logiknya:

**Jika events ≤ 9:**
- Display semua events sekaligus
- Tiada cycling diperlukan
- `isCycleRunning = false`

**Jika events > 9:**
- Split events kepada pages (9 events per page)
- Auto-cycle setiap **10 saat** (lebih lama dari component lain)
- `isCycleRunning = true`
- Track page number dan cycle count

**Console Output:**
```
[Countdown] Page: 1/3 | Events: 25 | Cycle: 0 | Running: true
[Countdown] Page: 2/3 | Events: 25 | Cycle: 0 | Running: true
[Countdown] Page: 3/3 | Events: 25 | Cycle: 0 | Running: true
[Countdown] Cycle complete: 1 cycles
[Countdown] Page: 1/3 | Events: 25 | Cycle: 1 | Running: true
```

### Backup Files
- Activity: `backup/2025-10-04/Announcements-copy.jsx.bak`
- WeeklyLecture: `backup/2025-10-04/Kuliah-copy.jsx.bak`
- MediaCarousel: `backup/2025-10-04/Slider-copy.jsx.bak`
- ReligiousEvent: `backup/2025-10-04/Countdown-copy.jsx.bak`

---

## Component Renaming (2025-01-27)

### Perubahan Nama Komponen
Komponen telah dinamakan semula berdasarkan ciri-ciri dan keperluan mereka yang lebih tepat:

| Nama Lama | Nama Baru | Sebab Perubahan |
|-----------|-----------|-----------------|
| `Announcements` | `Activity` | Lebih spesifik - menampilkan aktiviti masjid dengan maklumat lengkap |
| `Kuliah` | `WeeklyLecture` | Lebih jelas - kuliah mingguan dengan maklumat lengkap |
| `Slider` | `MediaCarousel` | Lebih tepat - carousel yang support pelbagai jenis media |
| `Countdown` | `ReligiousEvent` | Lebih spesifik - countdown untuk peristiwa agama dengan tarikh Masihi dan Hijrah |

### File Changes
- `Announcements.jsx` → `Activity.jsx`
- `Kuliah.jsx` → `WeeklyLecture.jsx`
- `Slider.jsx` → `MediaCarousel.jsx`
- `Countdown.jsx` → `ReligiousEvent.jsx`

### Import Updates
Semua import statements dalam `App.jsx` telah dikemas kini untuk menggunakan nama komponen yang baru.

### Backup Files
File-file lama telah dibackup dengan format:
- `Announcements-copy.jsx.bak`
- `Kuliah-copy.jsx.bak`
- `Slider-copy.jsx.bak`
- `Countdown-copy.jsx.bak`

---

## Troubleshooting Image Loading

### Masalah: Gambar dari URL tidak keluar (loading terus)

**Penyebab:**
1. **CORS Policy**: Server external tidak allow cross-origin requests
2. **Network Issues**: Koneksi internet atau server down
3. **Invalid URL**: URL gambar tidak valid atau expired
4. **CSP Violations**: Content Security Policy blocking local file access
5. **React DOM Errors**: DOM manipulation conflicts dalam React rendering
6. **DOM Access Errors**: getAttribute errors dari undefined elements

**Penyelesaian:**
1. **Automatic Retry**: Aplikasi akan cuba load dengan dan tanpa CORS
2. **Loading State**: Paparan "Loading image..." semasa proses
3. **Error Fallback**: Paparan "Failed to load image" jika gagal
4. **CSP Compliance**: Local files menggunakan relative paths sahaja dalam development
5. **DOM Stability**: Proper container structure untuk elakkan React DOM conflicts
6. **Default Data**: Default slide data menggunakan URL images untuk elakkan CSP issues
7. **CSP Policy**: Updated CSP policy dalam index.html untuk allow external images
8. **DOM Safety**: Comprehensive checks untuk elakkan undefined element access
9. **Electron CSP**: Fixed security warning dengan proper CSP policy dalam electron-main.js
10. **React Slider**: Pure React state management untuk slide transitions
11. **Console Logs**: Check browser console untuk error details

**Format Data yang Disokong:**
```
// Local images
img|slider1.jpg|Description|5

// URL images (external)
img|https://example.com/image.jpg|Description|5

// Video files
vid|video.mp4|Description|10

// Iframe content
iframe|https://example.com|Description|8
```

### CSP Policy Configuration

Aplikasi menggunakan Content Security Policy untuk security. CSP policy dalam `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; connect-src 'self';">
```

**Key Directives:**
- `img-src 'self' data: https:` - Allow local images, data URLs, dan HTTPS images
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` - Allow local scripts dengan inline dan eval
- `style-src 'self' 'unsafe-inline'` - Allow local styles dengan inline styles

---

## API Endpoints

### Data Management
- `GET /api/health` - Health check
- `GET /api/data` - Get all data files
- `GET /api/data/:filename` - Get specific data file
- `PUT /api/data/:filename` - Update specific data file
- `PUT /api/data` - Update multiple files

### Image Management
- `POST /api/upload-image` - Upload image to sliders folder
- `GET /api/images` - Get all images from sliders folder
- `DELETE /api/images/:filename` - Delete specific image

#### Image Upload Details
- **Supported formats**: JPG, PNG, GIF, WebP
- **Max file size**: 5MB
- **Storage location**: `sliders/` (root, sebelah `data/`)
- **Authentication**: Required (Bearer token)

#### Example Usage
```bash
# Upload image
curl -X POST "http://localhost:1847/api/upload-image?token=ipray-secret-token-2024" \
  -F "image=@/path/to/image.jpg"

# List images
curl "http://localhost:1847/api/images?token=ipray-secret-token-2024"

# Delete image
curl -X DELETE "http://localhost:1847/api/images/filename.jpg?token=ipray-secret-token-2024"
```

### Authentication
Semua API endpoints (kecuali `/api/health`) memerlukan authentication menggunakan Bearer token:
- **Default token**: `ipray-secret-token-2024`
- **Header**: `Authorization: Bearer <token>`
- **Query parameter**: `?token=<token>`

---

## Image Management UI

Aplikasi setting menyediakan interface untuk menguruskan images melalui tab "Image Management":

### Features
1. **Upload Images**: Drag & drop atau browse untuk upload images
2. **Preview**: Lihat preview semua images yang telah diupload
3. **Delete**: Padam images yang tidak diperlukan
4. **File Info**: Lihat maklumat file seperti saiz dan tarikh upload

### Usage
1. Buka aplikasi setting (`setting/index.html`)
2. Klik tab "Image Management"
3. Upload images menggunakan form upload
4. Kelola images dalam grid view
5. Padam images menggunakan butang delete

---

## Troubleshooting

### Common Issues

1. **Images tidak load**: Pastikan folder `sliders/` wujud (root, bukan dalam public)
2. **Upload gagal**: Check file size (max 5MB) dan format (JPG, PNG, GIF, WebP)
3. **API tidak respond**: Pastikan aplikasi Electron berjalan dan port 1847 tidak digunakan
4. **Images tidak boleh dibaca**: 
   - Pastikan static file serving aktif dalam electron-main.js
   - Check console browser untuk error messages
   - Pastikan URL image betul: `http://localhost:1847/sliders/filename.jpg`
   - Test direct access: `curl -I http://localhost:1847/sliders/filename.jpg`

### Debug Mode
Untuk debug, buka Developer Tools dalam Electron app:
- **Mac**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

---

## Development Notes

### File Structure
```
react-migration/
├── electron-main.js          # Main Electron process dengan API server
├── public/
│   └── sliders/              # Folder untuk images
├── setting/
│   ├── index.html            # Settings UI
│   ├── image-management.js   # Image management JavaScript
│   └── style.css             # CSS styles
└── package.json               # Dependencies termasuk multer
```

### Dependencies
- `multer`: Untuk handle file uploads
- `express`: API server
- `cors`: Cross-origin requests
- `body-parser`: Parse request bodies

---

## Changelog

### v1.1.1 - Image Loading Fix
- ✅ Tambah static file serving untuk folder public
- ✅ Fix images tidak boleh dibaca dalam settings UI
- ✅ Tambah debug logging untuk troubleshooting
- ✅ Improve error handling untuk image loading

### v1.1.0 - Image Management
- ✅ Tambah API endpoints untuk upload, list dan delete images
- ✅ Implementasi UI untuk image management dalam settings
- ✅ Support untuk JPG, PNG, GIF, WebP formats
- ✅ File size validation (max 5MB)
- ✅ Image preview dan file info display
- ✅ Responsive grid layout untuk image gallery

---

## Smart Data System

### Overview
Sistem data pintar yang mengimport folder `data/` semasa build, kemudian menyalin fail-fail data ke lokasi bersebelahan dengan executable pada runtime jika diperlukan.

### 🔄 Workflow

#### 1. **Build Process**
```bash
npm run build:mac
```
- Folder `data/` diimport ke dalam app bundle
- Lokasi: `IPRAY IDM.app/Contents/Resources/data/`
- Fail-fail data tersimpan dalam app bundle

#### 2. **Runtime Process**
```bash
# Jalankan aplikasi
open "IPRAY IDM.app"
```
- App check fail-fail data di lokasi external
- Lokasi: `IPRAY IDM.app/../data/` (bersebelahan dengan .app)
- Jika tiada, copy dari app bundle ke external location

#### 3. **File Monitoring**
- Monitor external data directory untuk perubahan
- Real-time updates apabila fail data diubah
- API server berfungsi dengan external data

### 📁 File Structure

#### **Development Mode:**
```
react-migration/
├── data/                    # Data files (development)
│   ├── system-config.txt
│   ├── prayer-times.txt
│   └── ...
└── src/
```

#### **Production Mode (After Build):**
```
dist/
├── IPRAY IDM.app/          # macOS app bundle
│   ├── Contents/
│   │   └── Resources/
│   │       ├── app.asar
│   │       └── data/       # Bundled data (read-only)
│   │           ├── system-config.txt
│   │           ├── prayer-times.txt
│   │           └── ...
│   └── ../data/            # External data (user-editable)
│       ├── system-config.txt
│       ├── prayer-times.txt
│       └── ...
```

### 🎯 Data Flow

#### **First Run:**
1. App starts
2. Check external data directory
3. If empty, copy from bundled data
4. Start file monitoring
5. Load data from external location

#### **Subsequent Runs:**
1. App starts
2. Check external data directory
3. If files exist, use external data
4. Start file monitoring
5. Load data from external location

#### **Data Updates:**
1. User edits external data files
2. File watcher detects changes
3. App reloads with new data
4. Changes persist in external location

### 🔧 Implementation Details

#### **1. Data Directory Detection**
```javascript
// Development mode
const dataDir = path.join(__dirname, 'data')

// Production mode - external location
const dataDir = path.join(process.resourcesPath, '..', 'data')
```

#### **2. Bundled Data Location**
```javascript
// Production mode - inside app bundle
const bundledDataDir = path.join(process.resourcesPath, 'data')
```

#### **3. Auto-Copy Logic**
```javascript
function ensureDataFilesExist() {
  const requiredFiles = [
    'system-config.txt',
    'prayer-times.txt',
    'religious-events.txt',
    'weekly-lectures.txt',
    'masjid-programs.txt',
    'scroll-messages.txt',
    'media-slides.txt'
  ]
  
  for (const filename of requiredFiles) {
    const externalPath = path.join(externalDataDir, filename)
    const bundledPath = path.join(bundledDataDir, filename)
    
    if (!fs.existsSync(externalPath) && fs.existsSync(bundledPath)) {
      fs.copyFileSync(bundledPath, externalPath)
    }
  }
}
```

### 🚀 Usage Examples

#### **Development:**
```bash
npm run dev
# Data dibaca dari ./data/ dalam project
```

#### **Production Build:**
```bash
npm run build:mac
# Data diimport ke app bundle
```

#### **Production Run:**
```bash
open "dist/mac/IPRAY IDM.app"
# Data disalin ke external location (first run)
# Data dibaca dari external location (subsequent runs)
```

### 📋 Benefits

#### **1. User Customization**
- User boleh edit fail data di external location
- Perubahan kekal walaupun app diupdate
- Tidak perlu rebuild app untuk data changes

#### **2. Backup & Recovery**
- Data tersimpan dalam app bundle sebagai backup
- Jika external data hilang, akan di-copy semula
- Data tidak hilang walaupun app diuninstall

#### **3. Easy Deployment**
- App bundle mengandungi data default
- Tidak perlu setup data folder secara manual
- Plug-and-play installation

#### **4. Development Friendly**
- Development mode guna project data folder
- Production mode guna external data folder
- Consistent API untuk kedua-dua mode

### 🔍 Troubleshooting

#### **Data Not Found**
1. Check external data directory exists
2. Verify file permissions
3. Check bundled data exists in app bundle

#### **File Watching Not Working**
1. Verify external data directory path
2. Check file permissions
3. Restart application

#### **Data Not Updating**
1. Check external data files exist
2. Verify file modification timestamps
3. Check console for file watcher errors

### 🧪 Testing

#### **Test Data Copying:**
```bash
node test-data-copying.js
```

#### **Test File Watching:**
1. Edit external data files
2. Check console for reload messages
3. Verify UI updates with new data

### 📊 File Monitoring

#### **Watched Files:**
- `system-config.txt`
- `prayer-times.txt`
- `religious-events.txt`
- `weekly-lectures.txt`
- `masjid-programs.txt`
- `scroll-messages.txt`
- `media-slides.txt`

#### **Monitoring Events:**
- `change` - File modified
- `add` - New file added
- `unlink` - File deleted
- `error` - File system error

### 🎯 API Endpoints

#### **Data Access:**
- `GET /api/data` - Get all data files
- `GET /api/data/:filename` - Get specific data file
- `PUT /api/data/:filename` - Update specific data file
- `PUT /api/data` - Update multiple data files

#### **Authentication:**
- Token: `ipray-secret-token-2024`
- Header: `Authorization: Bearer <token>`
- Query: `?token=<token>`

### 🔄 Update Process

#### **App Update:**
1. New app bundle installed
2. External data preserved
3. New bundled data available
4. Missing files auto-copied

#### **Data Update:**
1. Edit external data files
2. File watcher detects changes
3. App reloads automatically
4. New data displayed

### 📝 Summary

Sistem ini memberikan:
- **Flexibility**: User boleh customize data
- **Reliability**: Data backup dalam app bundle
- **Simplicity**: Auto-setup pada first run
- **Consistency**: Same API untuk dev/prod mode
- **Maintainability**: Easy updates dan deployment

---

## Data Paths Configuration

### Overview
IPRAY kini menyokong dua mode untuk mengakses data:

#### 1. Development Mode
- **Data Location**: `./data/` (dalam project root)
- **Environment**: `NODE_ENV=development`
- **Usage**: Semasa development dan testing

#### 2. Production Mode  
- **Data Location**: `./data/` (berhampiran dengan executable)
- **Environment**: `NODE_ENV=production`
- **Usage**: Selepas build, data akan berada di folder `data/` bersebelahan dengan executable

### File Structure

#### Development Mode
```
react-migration/
├── data/                    # Data files di sini
│   ├── system-config.txt
│   ├── prayer-times.txt
│   ├── religious-events.txt
│   ├── weekly-lectures.txt
│   ├── masjid-programs.txt
│   ├── scroll-messages.txt
│   └── media-slides.txt
├── src/
├── electron-main.js
└── preload.js
```

#### Production Mode (After Build)
```
dist/
├── IPRAY IDM.app/          # macOS executable
├── data/                   # Data files di sini
│   ├── system-config.txt
│   ├── prayer-times.txt
│   ├── religious-events.txt
│   ├── weekly-lectures.txt
│   ├── masjid-programs.txt
│   ├── scroll-messages.txt
│   └── media-slides.txt
└── resources/
    └── app.asar
```

### How It Works

#### 1. Environment Detection
```javascript
const isDev = process.env.NODE_ENV === 'development'
```

#### 2. Data Directory Resolution
```javascript
function getDataDirectory() {
  if (isDev) {
    return path.join(__dirname, 'data')           // Development
  } else {
    return path.join(process.resourcesPath, 'data') // Production
  }
}
```

#### 3. File Reading
```javascript
// Development: ./data/prayer-times.txt
// Production:  ./data/prayer-times.txt (next to executable)
const data = window.electronAPI.readFile('prayer-times.txt')
```

### Build Configuration

#### package.json
```json
{
  "build": {
    "extraResources": [
      {
        "from": "data",
        "to": "data"
      }
    ]
  }
}
```

### Usage Examples

#### Development
```bash
# Start development mode
npm run dev
# Data akan dibaca dari ./data/
```

#### Production
```bash
# Build aplikasi
npm run build

# Data akan disalin ke folder data/ bersebelahan dengan executable
# Aplikasi akan membaca data dari folder tersebut
```

### API Endpoints

API server juga mengikuti path yang sama:

- **Development**: `http://localhost:1847/api/data?token=ipray-secret-token-2024`
- **Production**: `http://localhost:1847/api/data?token=ipray-secret-token-2024`

### File Watching

File watcher akan monitor fail-fail data dalam kedua-dua mode:

- **Development**: Monitor `./data/*.txt`
- **Production**: Monitor `./data/*.txt` (next to executable)

### Troubleshooting

#### Data Not Found
1. Pastikan fail data wujud dalam folder yang betul
2. Check environment variable `NODE_ENV`
3. Verify build configuration dalam `package.json`

#### File Watching Not Working
1. Pastikan chokidar dependency terinstall
2. Check file permissions
3. Verify file paths dalam `filesToWatch` array

### Testing

Gunakan script test untuk verify configuration:

```bash
node test-data-paths.js
```

Script ini akan:
- Test development mode paths
- Test production mode paths  
- List semua fail data yang ditemui
- Verify file watching configuration

---

## Settings Website

### Overview
Website untuk menguruskan konfigurasi dan data fail IPRAY melalui API.

### Ciri-ciri

#### 🏠 Dashboard
- Status sambungan API server
- Maklumat fail data
- Status authentication
- Statistik fail

#### 📁 Data Files Management
- Senarai semua fail data
- Edit kandungan fail secara langsung
- Simpan perubahan
- Refresh data

#### ⚙️ System Configuration
- Timer settings untuk setiap view
- Display settings (time format, imsak display)
- Message status
- Stage durations (azan, iqamah, solat)

#### 🔌 API Information
- Dokumentasi semua endpoint
- Maklumat authentication
- API testing tool

### API Endpoints

#### Health Check
- `GET /api/health` - Status server

#### Data Management
- `GET /api/data` - Dapatkan semua fail data
- `GET /api/data/:filename` - Dapatkan fail tertentu
- `PUT /api/data/:filename` - Kemaskini fail tertentu
- `PUT /api/data` - Kemaskini multiple files

### Authentication

Menggunakan Bearer Token:
- Header: `Authorization: Bearer <token>`
- Query: `?token=<token>`
- Default token: `ipray-secret-token-2024`

### Penggunaan

1. Pastikan IPRAY API server berjalan di port 1847
2. Buka `index.html` dalam browser
3. Dashboard akan menunjukkan status sambungan
4. Gunakan tab yang berbeza untuk fungsi yang berlainan

### Fail-fail Data

Website ini menguruskan fail-fail berikut:
- `system-config.txt` - Konfigurasi sistem
- `prayer-times.txt` - Waktu solat
- `religious-events.txt` - Peristiwa agama
- `weekly-lectures.txt` - Kuliah mingguan
- `masjid-programs.txt` - Program masjid
- `scroll-messages.txt` - Mesej scroll
- `media-slides.txt` - Slide media

### Responsive Design

Website ini responsive dan boleh digunakan pada:
- Desktop
- Tablet
- Mobile devices

### Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

---

## Next Steps

1. Test dengan data sebenar
2. Add error boundaries
3. Implement TypeScript
4. Add unit tests
5. Optimize performance

---

## License

MIT License - IPRAY Project