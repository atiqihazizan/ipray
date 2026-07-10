/**
 * Table & UI Functions
 * Function untuk table operations dan UI management
 */

import {
  setCurrentFileName,
  setCurrentData,
  setCurrentColumns,
  getCurrentData,
  getCurrentColumns,
  getLastEditedRowId,
  setLastEditedRowId,
  getScrollPosition,
  setScrollPosition,
} from "./state.js";
import { showNotification } from "./notification.js";
import { openEditDialog } from "./dialog.js";
import { deleteRow, toggleSlideHide, reorderSlideshow, updateSlideRow } from "./api.js";
import { loadTabContent } from "./tab-loader.js";
import { renderSlidesCards } from "./cards/slidesCards.js";
import { renderKuliahPaparanCards } from "./cards/kuliahPaparanCards.js";
import { renderSlideshowPaparanCards } from "./cards/slideshowPaparanCards.js";
import { renderAnnouncementPaparanCards } from "./cards/announcementPaparanCards.js";
import { renderCountdownPaparanCards } from "./cards/countdownPaparanCards.js";
import * as TableUtils from "./table-utils.js";

// Framework-like SVG Icons
const Icons = {
  pencil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 348.882 348.882"><path d="m333.988 11.758-.42-.383A43.363 43.363 0 0 0 304.258 0a43.579 43.579 0 0 0-32.104 14.153L116.803 184.231a14.993 14.993 0 0 0-3.154 5.37l-18.267 54.762c-2.112 6.331-1.052 13.333 2.835 18.729 3.918 5.438 10.23 8.685 16.886 8.685h.001c2.879 0 5.693-.592 8.362-1.76l52.89-23.138a14.985 14.985 0 0 0 5.063-3.626L336.771 73.176c16.166-17.697 14.919-45.247-2.783-61.418zM130.381 234.247l10.719-32.134.904-.99 20.316 18.556-.904.99-31.035 13.578zm184.24-181.304L182.553 197.53l-20.316-18.556L294.305 34.386c2.583-2.828 6.118-4.386 9.954-4.386 3.365 0 6.588 1.252 9.082 3.53l.419.383c5.484 5.009 5.87 13.546.861 19.03z"/><path d="M303.85 138.388c-8.284 0-15 6.716-15 15v127.347c0 21.034-17.113 38.147-38.147 38.147H68.904c-21.035 0-38.147-17.113-38.147-38.147V100.413c0-21.034 17.113-38.147 38.147-38.147h131.587c8.284 0 15-6.716 15-15s-6.716-15-15-15H68.904C31.327 32.266.757 62.837.757 100.413v180.321c0 37.576 30.571 68.147 68.147 68.147h181.798c37.576 0 68.147-30.571 68.147-68.147V153.388c.001-8.284-6.715-15-14.999-15z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 7a1 1 0 0 0-1 1v11.191A1.92 1.92 0 0 1 15.99 21H8.01A1.92 1.92 0 0 1 6 19.191V8a1 1 0 0 0-2 0v11.191A3.918 3.918 0 0 0 8.01 23h7.98A3.918 3.918 0 0 0 20 19.191V8a1 1 0 0 0-1-1Zm1-3h-4V2a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2ZM10 4V3h4v1Z"/><path d="M11 17v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Zm4 0v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Z"/></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.92 11.6C19.9 6.91 16.1 4 12 4S4.1 6.91 2.08 11.6a1 1 0 0 0 0 .8C4.1 17.09 7.9 20 12 20s7.9-2.91 9.92-7.6a1 1 0 0 0 0-.8ZM12 18c-3.17 0-6.17-2.29-7.9-6C5.83 8.29 8.83 6 12 6s6.17 2.29 7.9 6c-1.73 3.71-4.73 6-7.9 6Z"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.94 6.08A6.93 6.93 0 0 1 12 6c3.18 0 6.17 2.29 7.91 6a15.23 15.23 0 0 1-.9 1.64 1 1 0 1 0 1.7 1.05 16.27 16.27 0 0 0 1.21-2.3 1 1 0 0 0 0-.79C19.9 6.91 16.1 4 12 4a7.77 7.77 0 0 0-1.4.12 1 1 0 1 0 .34 1.96ZM3.71 2.29a1 1 0 0 0-1.42 1.42l3.1 3.09a14.62 14.62 0 0 0-3.31 4.8 1 1 0 0 0 0 .8C4.1 17.09 7.9 20 12 20a9.26 9.26 0 0 0 5.05-1.54l3.24 3.25a1 1 0 0 0 1.42-1.42Zm6.36 9.19 2.45 2.45a2 2 0 0 1-2.45-2.45ZM12 18c-3.18 0-6.17-2.29-7.9-6a12.69 12.69 0 0 1 2.8-3.79l1.61 1.6A4 4 0 0 0 14.2 15.4l1.52 1.53A7.13 7.13 0 0 1 12 18Z"/></svg>`,
  arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 15a1 1 0 0 1-.71-.29L12 10.41l-4.29 4.3a1 1 0 1 1-1.42-1.42l5-5a1 1 0 0 1 1.42 0l5 5A1 1 0 0 1 17 15Z"/></svg>`,
  arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 16a1 1 0 0 1-.71-.29l-5-5a1 1 0 1 1 1.42-1.42L12 13.59l4.29-4.3a1 1 0 0 1 1.42 1.42l-5 5A1 1 0 0 1 12 16Z"/></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.54 9.88 8.16 3.06A2.44 2.44 0 0 0 4.5 5.18v13.64a2.44 2.44 0 0 0 3.66 2.12l10.38-6.82a2.44 2.44 0 0 0 0-4.24Z"/></svg>`,
  stop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 4H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4Z"/></svg>`,
  pencilOutline: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 4v4.75A2.25 2.25 0 0016.25 11H20"/></svg>`,
  navPage: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512.001 512.001" style="enable-background:new 0 0 512.001 512.001;" xml:space="preserve">
<path style="fill:#0089FF;" d="M388.819,239.537L156.092,6.816c-9.087-9.089-23.824-9.089-32.912,0.002
	c-9.087,9.089-9.087,23.824,0.002,32.912l216.27,216.266L123.179,472.272c-9.087,9.089-9.087,23.824,0.002,32.912
	c4.543,4.544,10.499,6.816,16.455,6.816c5.956,0,11.913-2.271,16.457-6.817L388.819,272.45c4.366-4.364,6.817-10.283,6.817-16.455
	C395.636,249.822,393.185,243.902,388.819,239.537z"/>
</svg>`,
  setting: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z"></path></svg>`,
  editAnt: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"></path></svg>`,
  ellipsis: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M176 511a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0z"></path></svg>`,
};

/** Pemetaan jenis slide (template) ke tab halaman setting */
const SLIDE_TYPE_TO_TAB = {
  announce: "announcements",
  countdown: "countdowns",
  countDown: "countdowns",
  kuliahhari: "kuliah",
  kuliahweekly: "kuliah",
  kuliahbulanan: "kuliah",
  kuliahHari: "kuliah",
  kuliahWeekly: "kuliah",
  kuliahBulanan: "kuliah",
  slideshow: "slideshow",
};

/**
 * Check if announcement is expired
 * @param {string} datetimeStr - DateTime string
 * @returns {boolean}
 */
function isAnnouncementExpired(datetimeStr) {
  if (!datetimeStr) return false;
  return DateUtils.isDateExpired(datetimeStr);
}

import { loadTodayTakwim, loadZoneDropdown, syncJakimYear, uploadTakwimFile } from "./takwim.js";

/**
 * Gerak baris slideshow ke atas atau ke bawah (butang ↑↓)
 * @param {number} rowId - ID row yang ingin digerak
 * @param {"up"|"down"} direction - Arah gerakan
 * @param {HTMLElement} tbody - Elemen tbody jadual
 */
async function moveSlideshowRow(rowId, direction, tbody) {
  const rows = Array.from(tbody.querySelectorAll("tr[data-row-id]"));
  const idx = rows.findIndex(
    (r) => parseInt(r.getAttribute("data-row-id")) === rowId,
  );
  if (idx === -1) return;

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= rows.length) return;

  // Tukar kedudukan DOM
  if (direction === "up") {
    tbody.insertBefore(rows[idx], rows[targetIdx]);
  } else {
    tbody.insertBefore(rows[targetIdx], rows[idx]);
  }

  // Hantar susunan baru ke backend
  const updatedRows = Array.from(tbody.querySelectorAll("tr[data-row-id]"));
  const orderedIds = updatedRows.map((r) =>
    parseInt(r.getAttribute("data-row-id")),
  );
  await reorderSlideshow(orderedIds);
}

/**
 * Bina satu <tr> untuk table (digunakan oleh TableUtils.initTable / updateRow / addRow / reloadTbody)
 * @param {object} row - data row
 * @param {object} ctx - { fileName, targetRowId, imagesList, petugasList, BASE_URL, tbody }
 * @returns {HTMLTableRowElement}
 */
function buildTableRow(row, ctx) {
  const { fileName, targetRowId, imagesList, petugasList, BASE_URL, tbody } = ctx;
  const currentColumns = getCurrentColumns();
  const displayColumns =
    fileName === "penceramah"
      ? [...(currentColumns || []).slice(0, 3), "gambar", ...(currentColumns || []).slice(3)]
      : fileName === "petugas"
        ? [...(currentColumns || []), "gambar"]
        : currentColumns;

  const tr = document.createElement("tr");
  tr.setAttribute("data-row-id", row.id);

  if (targetRowId && row.id === targetRowId) {
    tr.classList.add("row-highlight");
    tr.style.backgroundColor = "#fef3c7";
  }

  if (fileName === "slideshow") {
    const dragTd = document.createElement("td");
    dragTd.className = "drag-handle";
    dragTd.style.cssText =
      "width:36px;text-align:center;cursor:grab;color:#9ca3af;font-size:20px;user-select:none;";
    dragTd.title = "Seret untuk susun semula";
    dragTd.textContent = "⠿";
    tr.appendChild(dragTd);
  }

  const idTd = document.createElement("td");
  idTd.textContent = row.id;
  tr.appendChild(idTd);

  const rowColumns =
    fileName === "penceramah" || fileName === "petugas"
      ? displayColumns
      : currentColumns;
  rowColumns.forEach((col) => {
    const td = document.createElement("td");
    let value =
      col === "gambar"
        ? fileName === "penceramah"
          ? row.kod
          : fileName === "petugas"
            ? row.slug
            : ""
        : row[col] || "";
    if (fileName === "kuliah-override") {
      if (col === "format")
        value =
          value === "hijri"
            ? "Hijri"
            : value === "range"
              ? "Range"
              : value === "weekly"
                ? "Weekly"
                : "Tarikh";
      if (col === "showAnnounce")
        value =
          value === "1" ? "Ya" : value === "0" ? "Tidak" : value || "–";
      if (
        value === "" &&
        (col === "date" ||
          col === "tahun" ||
          col === "bulan" ||
          col === "hari" ||
          col === "replace" ||
          col === "showAnnounce" ||
          col === "title" ||
          col === "tempat" ||
          col === "jemputan")
      )
        value = "–";
    }
    if (fileName === "countdowns") {
      if (col === "format")
        value =
          value === "hijri"
            ? "Hijri (ulang)"
            : value === "masihi"
              ? "Masihi (ulang)"
              : "Tarikh tetap";
      if (
        value === "" &&
        (col === "date" ||
          col === "tahun" ||
          col === "bulan" ||
          col === "hari" ||
          col === "windowDays")
      )
        value = "–";
    }
    if (fileName === "jadual-petugas" && col === "day") {
      const dayMap = {
        h0: "AHAD",
        h1: "ISNIN",
        h2: "SELASA",
        h3: "RABU",
        h4: "KHAMIS",
        h5: "JUMAAT",
        h6: "SABTU",
      };
      value = dayMap[(value || "").trim().toLowerCase()] || value || "";
    }
    if (fileName === "jadual-petugas" && col === "officerCode") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const slug = (value || "").trim();
      const petugas = petugasList.find((p) => (p.slug || "").trim() === slug);
      const namaPenuh = petugas ? (petugas.namaPenuh || slug) : slug;
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "10px";
      const img = document.createElement("img");
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "50%";
      img.style.border = "1px solid #e5e7eb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolveOfficerPath = (s) => {
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === (s || "").trim(),
        );
        return found ? found.imagePath || "" : null;
      };
      const officerImgPath = resolveOfficerPath(slug);
      img.src = officerImgPath
        ? (officerImgPath.startsWith("/")
            ? `${BASE_URL}${officerImgPath}`
            : `${BASE_URL}/${officerImgPath}`)
        : `${BASE_URL}/images/penceramah/Random_user.svg`;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/penceramah/Random_user.svg`;
        this.onerror = null;
      };
      imgContainer.appendChild(img);
      const nameSpan = document.createElement("span");
      nameSpan.textContent = namaPenuh;
      nameSpan.style.fontSize = "13px";
      nameSpan.style.color = "#374151";
      imgContainer.appendChild(nameSpan);
      td.appendChild(imgContainer);
      tr.appendChild(td);
      return;
    }
    if (fileName === "kuliah" && col === "day") {
      const dayMap = {
        h0: "AHAD",
        h1: "ISNIN",
        h2: "SELASA",
        h3: "RABU",
        h4: "KHAMIS",
        h5: "JUMAAT",
        h6: "SABTU",
      };
      value = dayMap[(value || "").trim().toLowerCase()] || value || "";
    }
    if (fileName === "kuliah" && col === "speakerId") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.backgroundColor = "#f9fafb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolvePath = (code) => {
        if (!code || !code.trim()) return null;
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === code.trim(),
        );
        return found ? found.imagePath || "" : null;
      };
      const path = resolvePath(value);
      let imageUrl;
      if (path) {
        imageUrl = path.startsWith("/")
          ? `${BASE_URL}${path}`
          : `${BASE_URL}/${path}`;
      } else {
        imageUrl = `${BASE_URL}/images/penceramah/Random_user.svg`;
      }
      img.src = imageUrl;
      const defaultImage = `${BASE_URL}/images/penceramah/Random_user.svg`;
      let errorCount = 0;
      img.onerror = function () {
        errorCount++;
        if (errorCount === 1) {
          this.src = defaultImage;
        } else {
          this.onerror = null;
          this.src =
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAyMEMyNS41ODIyIDIwIDIyIDIzLjU4MjIgMjIgMjhDMjIgMzIuNDE3OCAyNS41ODIyIDM2IDMwIDM2QzM0LjQxNzggMzYgMzggMzIuNDE3OCAzOCAyOEMzOCAyMy41ODIyIDM0LjQxNzggMjAgMzAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNiA0NEMxNiA0MC42ODYzIDE4LjY4NjMgMzggMjIgMzhIMzguMDAwMUM0MS4zMTM3IDM4IDQ0IDQwLjY4NjMgNDQgNDRWMjZIMTZWMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==";
          this.style.opacity = "0.4";
        }
      };
      imgContainer.appendChild(img);
      const codeText = document.createElement("span");
      codeText.textContent = value || "—";
      codeText.title = value || "";
      codeText.style.fontSize = "13px";
      codeText.style.color = "#374151";
      codeText.style.flex = "1";
      codeText.style.wordBreak = "break-all";
      codeText.style.lineHeight = "1.4";
      imgContainer.appendChild(codeText);
      td.appendChild(imgContainer);
    } else if (fileName === "penceramah" && col === "gambar") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const code = (row.kod || "").trim();
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolvePath = (c) => {
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === (c || "").trim(),
        );
        return found ? found.imagePath || "" : null;
      };
      const path = resolvePath(code);
      img.src = path
        ? (path.startsWith("/")
            ? `${BASE_URL}${path}`
            : `${BASE_URL}/${path}`)
        : `${BASE_URL}/images/penceramah/Random_user.svg`;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/penceramah/Random_user.svg`;
        this.onerror = null;
      };
      imgContainer.appendChild(img);
      const codeText = document.createElement("span");
      codeText.textContent = code || "—";
      codeText.style.fontSize = "13px";
      codeText.style.color = "#374151";
      imgContainer.appendChild(codeText);
      td.appendChild(imgContainer);
    } else if (fileName === "petugas" && col === "gambar") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const slug = (row.slug || "").trim();
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolvePetugasPath = (s) => {
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === (s || "").trim(),
        );
        return found ? found.imagePath || "" : null;
      };
      const petugasImgPath = resolvePetugasPath(slug);
      img.src = petugasImgPath
        ? (petugasImgPath.startsWith("/")
            ? `${BASE_URL}${petugasImgPath}`
            : `${BASE_URL}/${petugasImgPath}`)
        : `${BASE_URL}/images/penceramah/Random_user.svg`;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/penceramah/Random_user.svg`;
        this.onerror = null;
      };
      imgContainer.appendChild(img);
      td.appendChild(imgContainer);
    } else if (fileName === "slides" && col === "image") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.backgroundColor = "#f9fafb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolvePath = (code) => {
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === (code || "").trim(),
        );
        return found
          ? found.imagePath || ""
          : value && value.startsWith("/")
            ? value
            : "";
      };
      const path = resolvePath(value);
      let imageUrl;
      if (path) {
        if (path.startsWith("/")) imageUrl = `${BASE_URL}${path}`;
        else imageUrl = `${BASE_URL}/images/${path}`;
      } else {
        imageUrl = `${BASE_URL}/images/noimage.png`;
      }
      img.src = imageUrl;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/noimage.png`;
        this.onerror = null;
      };
      imgContainer.appendChild(img);
      const codeText = document.createElement("span");
      codeText.style.fontSize = "13px";
      codeText.style.color = "#374151";
      codeText.textContent = value || "—";
      imgContainer.appendChild(codeText);
      td.appendChild(imgContainer);
    } else if (fileName === "slideshow" && col === "image") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      const resolvePath = (code) => {
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === (code || "").trim(),
        );
        return found
          ? found.imagePath || ""
          : value && value.startsWith("/")
            ? value
            : "";
      };
      const path = resolvePath(value);
      let imageUrl;
      if (path) {
        if (path.startsWith("/")) imageUrl = `${BASE_URL}${path}`;
        else imageUrl = `${BASE_URL}/images/${path}`;
      } else {
        imageUrl = `${BASE_URL}/images/noimage.png`;
      }
      img.src = imageUrl;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/noimage.png`;
        this.onerror = null;
      };
      imgContainer.appendChild(img);
      const pathText = document.createElement("span");
      pathText.textContent =
        value.length > 40 ? value.substring(0, 40) + "..." : value;
      pathText.title = value;
      pathText.style.fontSize = "13px";
      pathText.style.color = "#374151";
      pathText.style.flex = "1";
      pathText.style.wordBreak = "break-all";
      td.appendChild(imgContainer);
    } else if (fileName === "images" && col === "imagePath") {
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";
      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.backgroundColor = "#f9fafb";
      img.style.flexShrink = "0";
      img.loading = "lazy";
      let imageUrl;
      if (value.startsWith("/")) {
        imageUrl = `${BASE_URL}${value}`;
      } else {
        imageUrl = `${BASE_URL}/images/${value}`;
      }
      img.src = imageUrl;
      const defaultImage = `${BASE_URL}/images/penceramah/Random_user.svg`;
      let errorCount = 0;
      img.onerror = function () {
        errorCount++;
        if (errorCount === 1) {
          this.src = defaultImage;
        } else {
          this.onerror = null;
          this.src =
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAyMEMyNS41ODIyIDIwIDIyIDIzLjU4MjIgMjIgMjhDMjIgMzIuNDE3OCAyNS41ODIyIDM2IDMwIDM2QzM0LjQxNzggMzYgMzggMzIuNDE3OCAzOCAyOEMzOCAyMy41ODIyIDM0LjQxNzggMjAgMzAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNiA0NEMxNiA0MC42ODYzIDE4LjY4NjMgMzggMjIgMzhIMzguMDAwMUM0MS4zMTM3IDM4IDQ0IDQwLjY4NjMgNDQgNDRWMjZIMTZWMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==";
          this.style.opacity = "0.4";
        }
      };
      imgContainer.appendChild(img);
      const pathText = document.createElement("span");
      pathText.textContent =
        value.length > 40 ? value.substring(0, 40) + "..." : value;
      pathText.title = value;
      pathText.style.fontSize = "13px";
      pathText.style.color = "#374151";
      pathText.style.flex = "1";
      pathText.style.wordBreak = "break-all";
      pathText.style.lineHeight = "1.4";
      imgContainer.appendChild(pathText);
      td.appendChild(imgContainer);
    } else if (fileName === "slides" && col === "hide") {
      const isHidden = value === "1";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-icon btn-toggle-hide";
      btn.title = isHidden
        ? "Klik untuk paparkan slide"
        : "Klik untuk sembunyikan slide";
      btn.innerHTML = isHidden
        ? `<span>${Icons.eyeOff}</span>`
        : `<span>${Icons.eye}</span>`;
      btn.style.background = "none";
      btn.style.border = "none";
      btn.style.cursor = "pointer";
      btn.style.padding = "4px";
      btn.style.fill = isHidden ? "#9ca3af" : "#374151";
      btn.onclick = () => toggleSlideHide(row.id);
      td.appendChild(btn);
    } else if (fileName === "slides" && col === "duration") {
      const displayVal =
        value !== null && value !== undefined ? String(value).trim() : "";
      if (displayVal) {
        td.textContent = `${displayVal} s`;
        td.title = `${displayVal} saat`;
      } else {
        td.textContent = "";
        td.title = "";
      }
    } else {
      td.textContent =
        value.length > 50 ? value.substring(0, 50) + "..." : value;
      td.title = value;
    }

    tr.appendChild(td);
  });

  const actionTd = document.createElement("td");
  actionTd.className = "action-buttons";
  actionTd.style.width = "130px";

  if (fileName === "announcements") {
    let isExpired = false;
    if (row.datetime) {
      isExpired = isAnnouncementExpired(row.datetime);
    }
    if (!isExpired) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon btn-edit";
      editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
      editBtn.title = "Edit";
      editBtn.onclick = () => openEditDialog(row.id);
      actionTd.appendChild(editBtn);
    }
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "images") {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "slideshow") {
    const upBtn = document.createElement("button");
    upBtn.className = "btn-icon";
    upBtn.style.cssText = "fill:#6b7280;";
    upBtn.innerHTML = `<span>${Icons.arrowUp}</span>`;
    upBtn.title = "Gerak ke atas";
    upBtn.onclick = () => moveSlideshowRow(row.id, "up", tbody);
    actionTd.appendChild(upBtn);
    const downBtn = document.createElement("button");
    downBtn.className = "btn-icon";
    downBtn.style.cssText = "fill:#6b7280;";
    downBtn.innerHTML = `<span>${Icons.arrowDown}</span>`;
    downBtn.title = "Gerak ke bawah";
    downBtn.onclick = () => moveSlideshowRow(row.id, "down", tbody);
    actionTd.appendChild(downBtn);
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "kuliah-override") {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "countdowns") {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "hebahan") {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (
    fileName === "penceramah" ||
    fileName === "petugas" ||
    fileName === "jadual-petugas"
  ) {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Padam";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "livestream") {
    const liveBtn = document.createElement("button");
    liveBtn.className = "btn-icon btn-play btn-live-play";
    liveBtn.innerHTML = `<span>${Icons.play}</span>`;
    liveBtn.title = "Mula Siaran Langsung";
    liveBtn.onclick = () => window.handleLiveStartFromTable(row);
    actionTd.appendChild(liveBtn);
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Padam";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else if (fileName === "kuliah") {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon btn-delete";
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.title = "Padam";
    deleteBtn.onclick = () => deleteRow(row.id);
    actionTd.appendChild(deleteBtn);
  } else {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon btn-edit";
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.title = "Edit";
    editBtn.onclick = () => openEditDialog(row.id);
    actionTd.appendChild(editBtn);
  }

  tr.appendChild(actionTd);
  return tr;
}

/**
 * Resolve image path dari kod imej (slides) menggunakan senarai images
 */
function resolveSlideImagePath(imageCode, imagesList, BASE_URL) {
  const found = imagesList.find(
    (r) => (r.imageCode || "").trim() === (imageCode || "").trim(),
  );
  const path = found
    ? found.imagePath || ""
    : imageCode && imageCode.startsWith("/")
      ? imageCode
      : "";
  if (!path) return `${BASE_URL}/images/noimage.png`;
  if (path.startsWith("/")) return `${BASE_URL}${path}`;
  return `${BASE_URL}/images/${path}`;
}

/**
 * Muat tab Template (slides) sebagai grid card seperti galeri.
 * Setiap card tunjuk data column: Jenis, Imej, Tempoh, Papar/Sembunyi, Edit.
 */
// async function loadSlidesAsCards() {
//   const grid = document.getElementById("slides-gallery-grid");
//   const container = document.getElementById("slides-gallery-container");
//   if (!grid || !container) return;

//   setCurrentFileName("slides");
//   grid.innerHTML = '<div class="gallery-loading">Memuat data...</div>';

//   const API_URL = window.Config.API_URL;
//   const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

//   let imagesList = [];
//   try {
//     const imgRes = await fetch(`${API_URL}/data/images`);
//     if (imgRes.ok) {
//       const imgResult = await imgRes.json();
//       imagesList = imgResult.data || [];
//     }
//   } catch (e) {
//     console.warn("Could not load images for slides:", e);
//   }

//   try {
//     const response = await fetch(`${API_URL}/data/slides`);
//     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//     const result = await response.json();

//     let data = result.data || [];
//     const columns = result.columns || [];
//     data = data.map((row) => {
//       const newRow = { ...row };
//       if (newRow.duration != null && newRow.duration !== "") {
//         const ms = parseFloat(newRow.duration);
//         if (!isNaN(ms)) newRow.duration = String(ms / 1000);
//       }
//       return newRow;
//     });

//     setCurrentData(data);
//     setCurrentColumns(columns);

//     if (data.length === 0) {
//       grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
//       return;
//     }

//     renderSlidesCards({
//       gridEl: grid,
//       data,
//       imagesList,
//       BASE_URL,
//       Icons,
//       resolveSlideImagePath,
//       toggleSlideHide,
//       openEditDialog,
//       showTab,
//     });
//   } catch (err) {
//     console.error(err);
//     grid.innerHTML =
//       '<div class="gallery-error">Gagal memuat data. Sila cuba lagi.</div>';
//   }
// }

/**
 * Muat card paparan Kuliah (Harian/Mingguan/Bulanan) yang ditapis dari data slides.
 * Nota: Ini masih guna sumber `slides` sebab ia mengawal template paparan.
 * Paparkan semua (harian + mingguan + bulanan) dalam satu grid.
 */
async function loadKuliahPaparanAsCards() {
  const grid = document.getElementById("kuliah-paparan-grid");
  const container = document.getElementById("kuliah-paparan-container");
  if (!grid || !container) return;

  // Penting untuk edit dialog: rekod ini datang dari /data/slides
  setCurrentFileName("slides");
  grid.innerHTML = '<div class="gallery-loading">Memuat data...</div>';

  const API_URL = window.Config.API_URL;
  const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

  const kuliahTypes = new Set(["kuliahhari", "kuliahweekly", "kuliahbulanan"]);

  let imagesList = [];
  try {
    const imgRes = await fetch(`${API_URL}/data/images`);
    if (imgRes.ok) {
      const imgResult = await imgRes.json();
      imagesList = imgResult.data || [];
    }
  } catch (e) {
    console.warn("Could not load images for kuliah paparan cards:", e);
  }

  try {
    const response = await fetch(`${API_URL}/data/slides`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    let data = result.data || [];
    const columns = result.columns || [];
    data = data
      .map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) newRow.duration = String(ms / 1000);
        }
        return newRow;
      })
      .filter((row) => kuliahTypes.has((row.type || "").trim().toLowerCase()));

    // Susun ikut urutan harian → mingguan → bulanan
    const typeOrder = { kuliahhari: 1, kuliahweekly: 2, kuliahbulanan: 3 };
    data.sort((a, b) => {
      const ta = (a.type || "").trim().toLowerCase();
      const tb = (b.type || "").trim().toLowerCase();
      return (typeOrder[ta] || 999) - (typeOrder[tb] || 999);
    });

    // Simpan state supaya inline update boleh guna findRowById()
    setCurrentData(data);
    setCurrentColumns(columns);

    grid.innerHTML = "";
    if (data.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
      return;
    }

    if (data.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
      return;
    }

    renderKuliahPaparanCards({
      gridEl: grid,
      data,
      imagesList,
      BASE_URL,
      resolveSlideImagePath,
      updateSlideRow,
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="gallery-error">Gagal memuat data. Sila cuba lagi.</div>';
  }
}

/**
 * Muat card paparan untuk semua template jenis slideshow.
 * Gaya dan inline editor ikut Kuliah → List Paparan, dengan auto-save.
 */
async function loadSlideshowPaparanAsCards() {
  const grid = document.getElementById("slideshow-paparan-grid");
  const container = document.getElementById("slideshow-paparan-container");
  if (!grid || !container) return;

  // Rekod datang dari /data/slides (template slideshow)
  setCurrentFileName("slides");
  grid.innerHTML = '<div class="gallery-loading">Memuat data...</div>';

  const API_URL = window.Config.API_URL;
  const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

  let imagesList = [];
  try {
    const imgRes = await fetch(`${API_URL}/data/images`);
    if (imgRes.ok) {
      const imgResult = await imgRes.json();
      imagesList = imgResult.data || [];
    }
  } catch (e) {
    console.warn("Could not load images for slideshow paparan cards:", e);
  }

  try {
    const response = await fetch(`${API_URL}/data/slides`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    let data = result.data || [];
    const columns = result.columns || [];
    data = data
      .map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) newRow.duration = String(ms / 1000);
        }
        return newRow;
      })
      .filter(
        (row) => (row.type || "").trim().toLowerCase() === "slideshow",
      );

    setCurrentData(data);
    setCurrentColumns(columns);

    grid.innerHTML = "";
    if (data.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
      return;
    }

    renderSlideshowPaparanCards({
      gridEl: grid,
      data,
      imagesList,
      BASE_URL,
      resolveSlideImagePath,
      updateSlideRow,
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="gallery-error">Gagal memuat data. Sila cuba lagi.</div>';
  }
}

/**
 * Muat card paparan untuk semua template jenis announce (Pengumuman).
 * Gaya dan inline editor ikut Slideshow → Setting Paparan, dengan auto-save.
 */
async function loadAnnouncementsPaparanAsCards() {
  const grid = document.getElementById("announcements-paparan-grid");
  const container = document.getElementById("announcements-paparan-container");
  if (!grid || !container) return;

  // Rekod datang dari /data/slides (template announce)
  setCurrentFileName("slides");
  grid.innerHTML = '<div class="gallery-loading">Memuat data...</div>';

  const API_URL = window.Config.API_URL;
  const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

  let imagesList = [];
  try {
    const imgRes = await fetch(`${API_URL}/data/images`);
    if (imgRes.ok) {
      const imgResult = await imgRes.json();
      imagesList = imgResult.data || [];
    }
  } catch (e) {
    console.warn("Could not load images for announcements paparan cards:", e);
  }

  try {
    const response = await fetch(`${API_URL}/data/slides`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    let data = result.data || [];
    const columns = result.columns || [];
    data = data
      .map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) newRow.duration = String(ms / 1000);
        }
        return newRow;
      })
      .filter(
        (row) => (row.type || "").trim().toLowerCase() === "announce",
      );

    setCurrentData(data);
    setCurrentColumns(columns);

    grid.innerHTML = "";
    if (data.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
      return;
    }

    renderAnnouncementPaparanCards({
      gridEl: grid,
      data,
      imagesList,
      BASE_URL,
      resolveSlideImagePath,
      updateSlideRow,
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="gallery-error">Gagal memuat data. Sila cuba lagi.</div>';
  }
}

/**
 * Muat card paparan untuk semua template jenis countdown (Undur Detik).
 * Gaya dan inline editor ikut Pengumuman/Slideshow → Setting Paparan, dengan auto-save.
 */
async function loadCountdownPaparanAsCards() {
  const grid = document.getElementById("countdown-paparan-grid");
  const container = document.getElementById("countdown-paparan-container");
  if (!grid || !container) return;

  // Rekod datang dari /data/slides (template countdown)
  setCurrentFileName("slides");
  grid.innerHTML = '<div class="gallery-loading">Memuat data...</div>';

  const API_URL = window.Config.API_URL;
  const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

  let imagesList = [];
  try {
    const imgRes = await fetch(`${API_URL}/data/images`);
    if (imgRes.ok) {
      const imgResult = await imgRes.json();
      imagesList = imgResult.data || [];
    }
  } catch (e) {
    console.warn("Could not load images for countdown paparan cards:", e);
  }

  try {
    const response = await fetch(`${API_URL}/data/slides`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    let data = result.data || [];
    const columns = result.columns || [];
    data = data
      .map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) newRow.duration = String(ms / 1000);
        }
        return newRow;
      })
      .filter(
        (row) => (row.type || "").trim().toLowerCase() === "countdown",
      );

    setCurrentData(data);
    setCurrentColumns(columns);

    grid.innerHTML = "";
    if (data.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">Tiada data</div>';
      return;
    }

    renderCountdownPaparanCards({
      gridEl: grid,
      data,
      imagesList,
      BASE_URL,
      resolveSlideImagePath,
      updateSlideRow,
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="gallery-error">Gagal memuat data. Sila cuba lagi.</div>';
  }
}

/**
 * Load Background (Slides) table.
 * - Sumber data: /data/images (images.txt)
 * - Tapisan: imagePath mesti mengandungi "/slides/"
 * - DOM target: #background-thead, #background-tbody
 */
export async function loadBackgroundTable() {
  // Background sebenarnya mengurus fail "images" (images.txt) tapi ditapis
  setCurrentFileName("images");
  // Flag untuk dialog/images supaya restrict category ke slides sahaja
  window.__BACKGROUND_MODE__ = true;

  const thead = document.getElementById("background-thead");
  const tbody = document.getElementById("background-tbody");

  if (!thead || !tbody) return;

  thead.innerHTML = "";
  tbody.innerHTML =
    '<tr><td colspan="100" class="text-center py-8 text-gray-500">Memuat data...</td></tr>';

  try {
    const API_URL = window.Config.API_URL;
    const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");

    const response = await fetch(`${API_URL}/data/images`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    const all = Array.isArray(result.data) ? result.data : [];
    const filtered = all.filter((row) =>
      String(row?.imagePath || "").includes("/slides/"),
    );

    setCurrentData(filtered);
    setCurrentColumns(["imageCode", "imagePath"]);

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = '<th class="w-20">ID</th>';

    const labels = { imageCode: "Nama", imagePath: "Imej" };
    ["imageCode", "imagePath"].forEach((col) => {
      const th = document.createElement("th");
      th.textContent = labels[col] || col;
      headerRow.appendChild(th);
    });
    headerRow.innerHTML += '<th class="w-32" style="width:130px">Tindakan</th>';
    thead.appendChild(headerRow);

    tbody.innerHTML = "";
    if (filtered.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="100" class="text-center py-8 text-gray-500">Tiada data background (slides)</td></tr>';
      return;
    }

    filtered.forEach((row) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-row-id", row.id);

      const idTd = document.createElement("td");
      idTd.textContent = row.id;
      tr.appendChild(idTd);

      // Nama (imageCode)
      const nameTd = document.createElement("td");
      const codeVal = String(row.imageCode || "");
      nameTd.textContent = codeVal.length > 50 ? codeVal.substring(0, 50) + "..." : codeVal;
      nameTd.title = codeVal;
      tr.appendChild(nameTd);

      // Imej (thumbnail + path)
      const imgTd = document.createElement("td");
      imgTd.style.padding = "8px";
      imgTd.style.verticalAlign = "middle";

      const imgContainer = document.createElement("div");
      imgContainer.style.display = "flex";
      imgContainer.style.alignItems = "center";
      imgContainer.style.gap = "12px";

      const img = document.createElement("img");
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.border = "1px solid #e5e7eb";
      img.style.backgroundColor = "#f9fafb";
      img.style.flexShrink = "0";
      img.loading = "lazy";

      const pathVal = String(row.imagePath || "");
      const imageUrl = pathVal.startsWith("/")
        ? `${BASE_URL}${pathVal}`
        : `${BASE_URL}/images/${pathVal}`;
      img.src = imageUrl;
      img.onerror = function () {
        this.src = `${BASE_URL}/images/slides/noimage.png`;
        this.onerror = null;
      };

      imgContainer.appendChild(img);

      const pathText = document.createElement("span");
      pathText.textContent =
        pathVal.length > 50 ? pathVal.substring(0, 50) + "..." : pathVal;
      pathText.title = pathVal;
      pathText.style.fontSize = "13px";
      pathText.style.color = "#374151";
      pathText.style.flex = "1";
      pathText.style.wordBreak = "break-all";
      pathText.style.lineHeight = "1.4";

      imgContainer.appendChild(pathText);
      imgTd.appendChild(imgContainer);
      tr.appendChild(imgTd);

      const actionTd = document.createElement("td");
      actionTd.className = "action-buttons";
      actionTd.style.width = "130px";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon btn-edit";
      editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
      editBtn.title = "Edit";
      editBtn.onclick = () => openEditDialog(row.id);
      actionTd.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-icon btn-delete";
      deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
      deleteBtn.title = "Padam";
      deleteBtn.onclick = () => deleteRow(row.id);
      actionTd.appendChild(deleteBtn);

      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading background table:", error);
    const errorRow = document.createElement("tr");
    const errorTd = document.createElement("td");
    errorTd.setAttribute("colspan", "100");
    errorTd.textContent = `Ralat memuat data: ${error.message}`;
    errorTd.style.textAlign = "center";
    errorTd.style.padding = "48px 20px";
    errorTd.style.color = "#ef4444";
    errorRow.appendChild(errorTd);
    tbody.innerHTML = "";
    tbody.appendChild(errorRow);
    showNotification("✗ Gagal memuat data background", "error");
  }
}

/**
 * Tukar sub-tab dalam panel Kuliah dan muatkan data berkaitan.
 * @param {"jadual"|"ganti"|"pengkuliah"|"paparan"} tabId
 */
function showKuliahTab(tabId) {
  const panels = ["jadual", "ganti", "pengkuliah", "paparan"];
  panels.forEach((id) => {
    const panel = document.getElementById(`kuliah-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(`[data-kuliah-tab="${id}"]`);
    if (btn) btn.classList.toggle("active", id === tabId);
  });

  if (tabId === "jadual") {
    loadTable("kuliah");
    return;
  }
  if (tabId === "ganti") {
    loadTable("kuliah-override");
    return;
  }
  if (tabId === "pengkuliah") {
    loadTable("penceramah");
    return;
  }
  if (tabId === "paparan") {
    loadKuliahPaparanAsCards();
  }
}

/**
 * Tukar sub-tab dalam panel Slideshow dan muatkan data berkaitan.
 * @param {"senarai"|"setting"} tabId
 */
function showSlideshowTab(tabId) {
  const panels = ["senarai", "setting"];
  panels.forEach((id) => {
    const panel = document.getElementById(`slideshow-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(`[data-slideshow-tab="${id}"]`);
    if (btn) btn.classList.toggle("active", id === tabId);
  });

  if (tabId === "senarai") {
    loadTable("slideshow");
    return;
  }
  if (tabId === "setting") {
    loadSlideshowPaparanAsCards();
  }
}

/**
 * Tukar sub-tab dalam panel Pengumuman dan muatkan data berkaitan.
 * @param {"senarai"|"setting"} tabId
 */
function showAnnouncementsTab(tabId) {
  const panels = ["senarai", "setting"];
  panels.forEach((id) => {
    const panel = document.getElementById(`announcements-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(`[data-announcements-tab="${id}"]`);
    if (btn) btn.classList.toggle("active", id === tabId);
  });

  if (tabId === "senarai") {
    loadTable("announcements");
    return;
  }
  if (tabId === "setting") {
    loadAnnouncementsPaparanAsCards();
  }
}

/**
 * Tukar sub-tab dalam panel Countdown dan muatkan data berkaitan.
 * @param {"senarai"|"setting"} tabId
 */
function showCountdownsTab(tabId) {
  const panels = ["senarai", "setting"];
  panels.forEach((id) => {
    const panel = document.getElementById(`countdowns-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(`[data-countdowns-tab="${id}"]`);
    if (btn) btn.classList.toggle("active", id === tabId);
  });

  if (tabId === "senarai") {
    loadTable("countdowns");
    return;
  }
  if (tabId === "setting") {
    loadCountdownPaparanAsCards();
  }
}

/**
 * Load table data
 * @param {string} fileName - Nama fail untuk dimuat
 * @param {number} scrollToRowId - Optional: ID row untuk scroll selepas load
 */
export async function loadTable(fileName, scrollToRowId = null) {
  // Special handling for takwim - use configuration layout
  // if (fileName === "takwim") {
  //   return loadTodayTakwim();
  // }

  // Images - guna gallery grid, bukan table
  // if (fileName === "images") {
  //   if (typeof window.GalleryUtils?.loadGallery === "function") {
  //     return window.GalleryUtils.loadGallery();
  //   }
  //   return;
  // }

  setCurrentFileName(fileName);

  // Slides (Template) - papar sebagai card galeri
  // if (fileName === "slides") {
  //   return loadSlidesAsCards();
  // }

  // Handle kuliah-override, penceramah, petugas, jadual-petugas table IDs
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
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  // Jika struktur table untuk fileName ini belum wujud (dipanggil oleh socket
  // ketika tab lain aktif), jangan crash – keluar awal sahaja.
  if (!thead || !tbody) {
    console.warn(
      `[Table] Element table tidak dijumpai untuk "${fileName}" (theadId=${theadId}, tbodyId=${tbodyId})`,
    );
    return;
  }
  const tableContainer = tbody?.closest(".table-container");

  // Simpan scroll position sebelum reload
  if (tableContainer) {
    setScrollPosition(tableContainer.scrollTop);
  }

  // Gunakan lastEditedRowId jika tidak ada scrollToRowId
  const targetRowId = scrollToRowId || getLastEditedRowId();

  thead.innerHTML = "";
  tbody.innerHTML =
    '<tr><td colspan="100" class="text-center py-8 text-gray-500">Memuat data...</td></tr>';

  try {
    const API_URL = window.Config.API_URL;
    const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, "");
    // Untuk slides dan kuliah, muat images sekali gus untuk resolve image code → path
    let imagesList = [];
    if (fileName === "slides" || fileName === "kuliah" || fileName === "penceramah" || fileName === "petugas" || fileName === "jadual-petugas") {
      try {
        const imgRes = await fetch(`${API_URL}/data/images`);
        if (imgRes.ok) {
          const imgResult = await imgRes.json();
          imagesList = imgResult.data || [];
        }
      } catch (e) {
        console.warn(`Could not load images for ${fileName} column:`, e);
      }
    }

    // Untuk jadual-petugas, muat senarai petugas untuk lookup nama
    let petugasList = [];
    if (fileName === "jadual-petugas") {
      try {
        const ptRes = await fetch(`${API_URL}/data/petugas`);
        if (ptRes.ok) {
          const ptResult = await ptRes.json();
          petugasList = ptResult.data || [];
        }
      } catch (e) {
        console.warn("Could not load petugas for jadual-petugas lookup:", e);
      }
    }

    const response = await fetch(`${API_URL}/data/${fileName}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Untuk slides: papar duration dalam saat (s) di UI, tetapi simpan dalam ms di fail
    if (fileName === "slides" && Array.isArray(result.data)) {
      result.data = result.data.map((row) => {
        const newRow = { ...row };
        if (newRow.duration != null && newRow.duration !== "") {
          const ms = parseFloat(newRow.duration);
          if (!isNaN(ms)) {
            newRow.duration = String(ms / 1000);
          }
        }
        return newRow;
      });
    }

    setCurrentData(result.data);
    setCurrentColumns(result.columns);

    const currentData = getCurrentData();
    const currentColumns = getCurrentColumns();

    TableUtils.initTable(fileName, currentColumns, currentData, {
      buildRow: (row) =>
        buildTableRow(row, {
          fileName,
          targetRowId,
          imagesList,
          petugasList,
          BASE_URL,
          tbody,
        }),
      imagesList,
      petugasList,
      BASE_URL,
    });
    if (fileName === "slideshow" && typeof window.Sortable !== "undefined") {
      if (tbody._sortableInstance) {
        tbody._sortableInstance.destroy();
      }
      tbody._sortableInstance = window.Sortable.create(tbody, {
        handle: ".drag-handle",
        animation: 150,
        ghostClass: "sortable-ghost",
        onEnd: async () => {
          const rows = tbody.querySelectorAll("tr[data-row-id]");
          const orderedIds = Array.from(rows).map((r) =>
            parseInt(r.getAttribute("data-row-id")),
          );
          await reorderSlideshow(orderedIds);
        },
      });
    }

    // Scroll ke row yang baru dikemaskini selepas render
    if (targetRowId && tableContainer) {
      setTimeout(() => {
        const targetRow = tbody.querySelector(
          `tr[data-row-id="${targetRowId}"]`,
        );
        if (targetRow) {
          // Calculate position relative to container
          const containerRect = tableContainer.getBoundingClientRect();
          const rowRect = targetRow.getBoundingClientRect();
          const scrollTop = tableContainer.scrollTop;
          const rowOffset = rowRect.top - containerRect.top + scrollTop;

          // Scroll ke row tersebut (center dalam container)
          const targetScroll =
            rowOffset - containerRect.height / 2 + rowRect.height / 2;
          tableContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });

          // Remove highlight selepas beberapa saat
          setTimeout(() => {
            targetRow.classList.remove("row-highlight");
            targetRow.style.backgroundColor = "";
          }, 3000);
        } else {
          // Jika row tidak ditemui, restore scroll position
          const savedPosition = getScrollPosition();
          if (savedPosition !== null) {
            tableContainer.scrollTop = savedPosition;
          }
        }

        // Clear lastEditedRowId selepas scroll
        setLastEditedRowId(null);
        setScrollPosition(null);
      }, 100);
    } else {
      // Restore scroll position jika tiada target row
      const savedPosition = getScrollPosition();
      if (savedPosition !== null && tableContainer) {
        setTimeout(() => {
          tableContainer.scrollTop = savedPosition;
          setScrollPosition(null);
        }, 100);
      }
    }
  } catch (error) {
    console.error("Error loading table:", error);
    const errorRow = document.createElement("tr");
    const errorTd = document.createElement("td");
    errorTd.setAttribute("colspan", "100");
    errorTd.textContent = `Ralat memuat data: ${error.message}`;
    errorTd.style.textAlign = "center";
    errorTd.style.padding = "48px 20px";
    errorTd.style.color = "#ef4444";
    errorRow.appendChild(errorTd);
    tbody.innerHTML = "";
    tbody.appendChild(errorRow);
    showNotification(`✗ Gagal memuat data`, "error");
  }
}

// Export untuk browser environment (TableUtils dari table-utils.js, jangan overwrite)
if (typeof window !== "undefined") {
  window.loadTable = loadTable;
  window.loadBackgroundTable = loadBackgroundTable;
  window.loadTodayTakwim = loadTodayTakwim;
  window.showKuliahTab = showKuliahTab;
  window.showSlideshowTab = showSlideshowTab;
  window.showAnnouncementsTab = showAnnouncementsTab;
   window.showCountdownsTab = showCountdownsTab;
  window.loadZoneDropdown = loadZoneDropdown;
  window.syncJakimYear = syncJakimYear;
  window.uploadTakwimFile = uploadTakwimFile;
}
