#!/usr/bin/env node
/**
 * Migration: tukar primary key penceramah dari slug ke UUID yang stable.
 *
 * - penceramah.txt: kolum 0 (slug) -> UUID
 * - kuliah.txt:     kolum 3 (speaker) -> UUID penceramah (rujuk map slug->uuid)
 * - images.txt:     imageCode penceramah -> UUID (baris lain tidak disentuh)
 *
 * Jalankan: node nodejs/scripts/migrate-penceramah-uuid.js
 * Idempotent: jika kolum 0 sudah UUID, UUID dikekalkan (tidak dijana semula).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PEN_FILE = path.join(DATA_DIR, 'penceramah.txt');
const KULIAH_FILE = path.join(DATA_DIR, 'kuliah.txt');
const IMAGES_FILE = path.join(DATA_DIR, 'images.txt');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n');
}

function writeLines(file, lines) {
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

function main() {
  if (!fs.existsSync(PEN_FILE)) {
    console.error(`✗ ${PEN_FILE} tidak wujud`);
    process.exit(1);
  }

  const penceramahLines = readLines(PEN_FILE);
  const slugToUuid = {};
  let generated = 0;

  const newPenceramah = penceramahLines.map((line) => {
    if (!line.trim()) return line;
    const parts = line.split('|');
    const slug = (parts[0] || '').trim();
    if (!slug) return line;
    let uuid;
    if (UUID_RE.test(slug)) {
      uuid = slug;
    } else {
      uuid = crypto.randomUUID();
      generated += 1;
    }
    slugToUuid[slug] = uuid;
    parts[0] = uuid;
    return parts.join('|');
  });
  writeLines(PEN_FILE, newPenceramah);

  let kuliahUpdated = 0;
  if (fs.existsSync(KULIAH_FILE)) {
    const kuliahLines = readLines(KULIAH_FILE);
    const newKuliah = kuliahLines.map((line) => {
      if (!line.trim()) return line;
      const parts = line.split('|');
      const speaker = (parts[3] || '').trim();
      if (speaker && slugToUuid[speaker]) {
        parts[3] = slugToUuid[speaker];
        kuliahUpdated += 1;
      }
      // Format 6-kolum lama: lajur ke-4 = imageCode (slug) — tukar juga jika match
      const imageCode = (parts[4] || '').trim();
      if (parts.length >= 6 && imageCode && slugToUuid[imageCode]) {
        parts[4] = slugToUuid[imageCode];
        kuliahUpdated += 1;
      }
      return parts.join('|');
    });
    writeLines(KULIAH_FILE, newKuliah);
  }

  let imagesUpdated = 0;
  if (fs.existsSync(IMAGES_FILE)) {
    const imagesLines = readLines(IMAGES_FILE);
    const newImages = imagesLines.map((line) => {
      if (!line.trim()) return line;
      const parts = line.split('|');
      const imageCode = (parts[0] || '').trim();
      if (imageCode && slugToUuid[imageCode]) {
        parts[0] = slugToUuid[imageCode];
        imagesUpdated += 1;
      }
      return parts.join('|');
    });
    writeLines(IMAGES_FILE, newImages);
  }

  const total = Object.keys(slugToUuid).length;
  console.log('Ringkasan migrasi penceramah -> UUID:');
  console.log(`  Penceramah diproses: ${total} (UUID dijana baru: ${generated})`);
  console.log(`  Kuliah dikemas: ${kuliahUpdated} baris`);
  console.log(`  Images dikemas: ${imagesUpdated} baris`);
  console.log('Selesai.');
}

main();
