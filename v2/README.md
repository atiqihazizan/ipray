# iPray v2

Repository untuk iPray Version 2 yang mengandungi semua sub-projects.

## Struktur Project

```
v2/
├── audio/                    # Fail audio untuk aplikasi
├── jssor slider/            # Project Jssor Slider (vanilla, jQuery, React)
├── node-react-jssor/        # Project Node.js + React dengan kiosk setup
├── react-jssor_slider/      # Project React dengan Electron
└── react-migration/         # Project React migration dengan Electron
```

## Cara Clone Repository Ini

### 1. Clone dari GitHub (setelah push)

```bash
git clone git@github.com:atiqihazizan/ipray-v2.git
cd ipray-v2
```

### 2. Setup Project

Setiap sub-project mempunyai `package.json` sendiri. Install dependencies untuk project yang anda mahu gunakan:

```bash
# Untuk react-jssor_slider
cd react-jssor_slider
npm install

# Untuk node-react-jssor/nodejs
cd node-react-jssor/nodejs
npm install

# Untuk react-migration
cd react-migration
npm install
```

## Cara Push ke GitHub

1. Buat repository baru di GitHub (contoh: `ipray-v2`)

2. Tambah remote origin:
```bash
git remote add origin git@github.com:atiqihazizan/ipray-v2.git
```

3. Push ke GitHub:
```bash
git branch -M main
git push -u origin main
```

## Sub-Projects

### jssor slider
Project slider dengan pelbagai implementasi (vanilla JS, jQuery, React)

### node-react-jssor
Full-stack application dengan Node.js backend dan React frontend, termasuk kiosk setup scripts.

### react-jssor_slider
React application dengan Electron wrapper untuk desktop.

### react-migration
React migration project dengan Electron untuk desktop application.

## Nota

- Semua `node_modules/`, `dist/`, `backup/`, dan fail build di-ignore oleh `.gitignore`
- Install dependencies selepas clone untuk setiap sub-project yang anda mahu gunakan
