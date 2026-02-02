# Jssor Slider - Vite + React + TailwindCSS

Projek ini adalah conversion dari `vanilla.html` ke Vite project dengan React, VanillaJS, dan TailwindCSS.

## Teknologi

- **Vite** - Build tool dan dev server
- **React** - UI library
- **TailwindCSS** - CSS framework
- **Jssor Slider** - JavaScript slider library

## Struktur Projek

```
jssor-vite-app/
├── public/
│   ├── img/          # Images assets
│   └── js/           # Jssor slider scripts
├── src/
│   ├── components/
│   │   └── JssorSlider.jsx  # Main slider component
│   ├── styles/
│   │   └── jssor.css        # Jssor custom styles
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json
```

## Installation

```bash
cd jssor-vite-app
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Features

- ✅ Jssor Slider dengan 4 slides
- ✅ Caption transitions
- ✅ Slideshow transitions
- ✅ Arrow navigation
- ✅ Bullet navigation
- ✅ Share buttons
- ✅ QR code
- ✅ Responsive design
- ✅ Touch swipe support

## Nota

- Jssor scripts dimuatkan secara dinamik dalam component
- Styles menggunakan kombinasi TailwindCSS dan custom CSS untuk Jssor
- Semua assets (images, scripts) berada dalam folder `public/`
