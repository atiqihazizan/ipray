/**
 * TableUtils - operasi table terpusat: initTable, updateRow, addRow, removeRow, reloadTbody
 * Thead dibina sekali; tbody dikemaskini per-row atau reload sahaja.
 */

import {
  setCurrentFileName,
  setCurrentData,
  setCurrentColumns,
  getCurrentData,
  getCurrentColumns,
} from "./state.js";

const theadTbodyIds = (fileName) => {
  const theadId =
    fileName === "kuliah-override"
      ? "kuliah-override-thead"
      : fileName === "penceramah"
        ? "penceramah-thead"
        : fileName === "jadual-petugas"
          ? "jadual-petugas-thead"
          : `${fileName}-thead`;
  const tbodyId =
    fileName === "kuliah-override"
      ? "kuliah-override-tbody"
      : fileName === "penceramah"
        ? "penceramah-tbody"
        : fileName === "jadual-petugas"
          ? "jadual-petugas-tbody"
          : `${fileName}-tbody`;
  return { theadId, tbodyId };
};

const colLabelMap = {
  slides: { type: "Jenis", image: "Imej", duration: "Tempoh", checkbox: "Paparan", hide: "Papar/Sembunyi" },
  kuliah: { week: "Minggu", day: "Hari", type: "Jenis", speaker: "Penceramah", speakerId: "ID Penceramah", title: "Tajuk" },
  "kuliah-override": { format: "Format", date: "Tarikh", tahun: "Tahun", bulan: "Bulan", type: "Jenis", hari: "Hari", replace: "Ganti (1=ya)", notes: "Catatan", showAnnounce: "Pengumuman", title: "Tajuk", tempat: "Tempat", jemputan: "Jemputan" },
  images: { imageCode: "Kod Imej", imagePath: "Laluan Imej" },
  announcements: { type: "Jenis", title: "Tajuk", speaker: "Penceramah", category: "Kategori", datetime: "Tarikh/Masa", location: "Lokasi", audience: "Jemputan" },
  countdowns: { format: "Format", date: "Tarikh", tahun: "Tahun", bulan: "Bulan", hari: "Hari", event: "Acara", windowDays: "Papar (hari)" },
  config: { key: "Kekunci", value: "Nilai" },
  slideshow: { caption: "Kapsyen", image: "Imej", validFrom: "Mula", validTo: "Tamat", showOn: "Papar Pada" },
  hebahan: { text: "Teks", startDate: "Tarikh Mula", endDate: "Tarikh Akhir" },
  livestream: { tajuk: "Tajuk", url: "URL / IP", jenis: "Jenis" },
  petugas: { slug: "Slug", namaPenuh: "Nama Penuh", shortname: "Shortname", role: "Peranan", gambar: "Gambar" },
  "jadual-petugas": { week: "Minggu", day: "Hari", role: "Peranan", officerCode: "Petugas" },
  penceramah: { kod: "Kod", namaPenuh: "Nama Penuh", shortname: "Shortname", gambar: "Gambar", kitab: "Kitab" },
};

const _buildRowStore = {};
const _optionsStore = {};

/**
 * Bina thead sekali (tidak disentuh selepas itu)
 */
function buildThead(fileName, columns, thead) {
  thead.innerHTML = "";
  const headerRow = document.createElement("tr");
  if (fileName === "slideshow") {
    headerRow.innerHTML = '<th style="width:36px;text-align:center;color:#9ca3af;" title="Seret untuk susun semula">⠿</th><th class="w-20">ID</th>';
  } else {
    headerRow.innerHTML = '<th class="w-20">ID</th>';
  }
  const labels = colLabelMap[fileName] || {};
  const displayColumns = fileName === "penceramah"
    ? [...(columns || []).slice(0, 3), "gambar", ...(columns || []).slice(3)]
    : fileName === "petugas"
      ? [...(columns || []), "gambar"]
      : columns || [];
  displayColumns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = labels[col] || (col && col.charAt(0).toUpperCase() + col.slice(1)) || "";
    headerRow.appendChild(th);
  });
  headerRow.innerHTML += '<th class="w-32" style="width:130px">Tindakan</th>';
  thead.appendChild(headerRow);
}

/**
 * Init table: bina thead sekali + isi tbody. Simpan buildRow untuk update/add/reloadTbody.
 * @param {string} fileName
 * @param {string[]} columns
 * @param {object[]} data
 * @param {object} options - { buildRow(row): HTMLElement, imagesList?, petugasList?, BASE_URL? }
 */
export function initTable(fileName, columns, data, options) {
  setCurrentFileName(fileName);
  setCurrentData(data || []);
  setCurrentColumns(columns || []);
  const { theadId, tbodyId } = theadTbodyIds(fileName);
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;
  _optionsStore[fileName] = options;
  _buildRowStore[fileName] = options.buildRow;
  buildThead(fileName, columns, thead);
  tbody.innerHTML = "";
  const buildRow = options.buildRow;
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="100">Tiada data</td></tr>';
    return;
  }
  data.forEach((row) => {
    const tr = buildRow(row);
    if (tr) tbody.appendChild(tr);
  });
}

/**
 * Kemaskini satu row dalam DOM (ganti tr berkenaan sahaja)
 */
export function updateRow(fileName, rowId, rowData) {
  const buildRow = _buildRowStore[fileName];
  if (!buildRow) return;
  const { tbodyId } = theadTbodyIds(fileName);
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = tbody.querySelector(`tr[data-row-id="${rowId}"]`);
  if (!tr) return;
  const newTr = buildRow(rowData);
  if (newTr) tbody.replaceChild(newTr, tr);
  const current = getCurrentData();
  const idx = current.findIndex((r) => r.id === rowId);
  if (idx !== -1) {
    const next = [...current];
    next[idx] = { ...rowData, id: rowId };
    setCurrentData(next);
  }
}

/**
 * Tambah satu row ke akhir tbody
 */
export function addRow(fileName, rowData) {
  const buildRow = _buildRowStore[fileName];
  if (!buildRow) return;
  const { tbodyId } = theadTbodyIds(fileName);
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const newTr = buildRow(rowData);
  if (newTr) tbody.appendChild(newTr);
  const current = getCurrentData();
  setCurrentData([...current, rowData]);
}

/**
 * Buang satu row dari DOM
 */
export function removeRow(fileName, rowId) {
  const { tbodyId } = theadTbodyIds(fileName);
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = tbody.querySelector(`tr[data-row-id="${rowId}"]`);
  if (tr) tr.remove();
  const current = getCurrentData().filter((r) => r.id !== rowId);
  setCurrentData(current);
}

/**
 * Reload tbody sahaja (fetch data, bina semula tbody; thead tidak disentuh)
 */
export async function reloadTbody(fileName) {
  const buildRow = _buildRowStore[fileName];
  if (!buildRow) return;
  const { theadId, tbodyId } = theadTbodyIds(fileName);
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;
  const API_URL = window.Config?.API_URL;
  if (!API_URL) return;
  try {
    const response = await fetch(`${API_URL}/data/${fileName}`);
    if (!response.ok) return;
    const result = await response.json();
    let data = result.data || [];
    const columns = result.columns || getCurrentColumns();
    if (fileName === "slides" && Array.isArray(data)) {
      data = data.map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) newRow.duration = String(ms / 1000);
        }
        return newRow;
      });
    }
    setCurrentData(data);
    setCurrentColumns(columns);
    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="100">Tiada data</td></tr>';
      return;
    }
    data.forEach((row) => {
      const tr = buildRow(row);
      if (tr) tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("reloadTbody error:", err);
  }
}

if (typeof window !== "undefined") {
  window.TableUtils = {
    initTable,
    updateRow,
    addRow,
    removeRow,
    reloadTbody,
  };
}
