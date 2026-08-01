#!/usr/bin/env node
/**
 * Migration: tukar primary key petugas dari slug ke UUID yang stable.
 *
 * - petugas.txt:          kolum 0 (slug) -> UUID
 * - jadual-petugas.txt:   kolum 0 (officerCode) -> UUID petugas (rujuk map slug->uuid)
 * - images.txt:           imageCode petugas -> UUID (baris lain tidak disentuh)
 *
 * Jalankan: node nodejs/scripts/migrate-petugas-uuid.js
 * Idempotent: jika kolum 0 sudah UUID, UUID dikekalkan (tidak dijana semula).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PETUGAS_FILE = path.join(DATA_DIR, 'petugas.txt');
const JADUAL_FILE = path.join(DATA_DIR, 'jadual-petugas.txt');
const IMAGES_FILE = path.join(DATA_DIR, 'images.txt');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n');
}

function writeLines(file, lines) {
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

function main() {
  if (!fs.existsSync(PETUGAS_FILE)) {
    console.error(`✗ ${PETUGAS_FILE} tidak wujud`);
    process.exit(1);
  }

  const petugasLines = readLines(PETUGAS_FILE);
  const slugToUuid = {};
  let generated = 0;

  const newPetugas = petugasLines.map((line) => {
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
  writeLines(PETUGAS_FILE, newPetugas);

  let jadualUpdated = 0;
  if (fs.existsSync(JADUAL_FILE)) {
    const jadualLines = readLines(JADUAL_FILE);
    const newJadual = jadualLines.map((line) => {
      if (!line.trim()) return line;
      const parts = line.split('|');
      const officerCode = (parts[0] || '').trim();
      if (officerCode && slugToUuid[officerCode]) {
        parts[0] = slugToUuid[officerCode];
        jadualUpdated += 1;
      }
      return parts.join('|');
    });
    writeLines(JADUAL_FILE, newJadual);
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
  console.log('Ringkasan migrasi petugas -> UUID:');
  console.log(`  Petugas diproses: ${total} (UUID dijana baru: ${generated})`);
  console.log(`  Jadual-petugas dikemas: ${jadualUpdated} baris`);
  console.log(`  Images dikemas: ${imagesUpdated} baris`);
  console.log('Selesai.');
}

main();
