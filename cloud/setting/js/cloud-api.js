/**
 * Cloud API Functions
 * Ganti api.js asal — semua CRUD via socket emit (tiada fetch/axios).
 */

import {
  getCurrentFileName,
  getCurrentData,
  getEditingRowId,
  isAddMode,
  getCurrentColumns,
  setLastEditedRowId,
  findRowById,
  setCurrentData,
} from "./state.js";
import { showNotification } from "./notification.js";
import * as TableUtils from "./table-utils.js";
import { closeDialog } from "./dialog.js";
import { emitWithResponse, registerOnReconnect, fetchData } from "./cloud-socket.js";

/** Antrian upload image: bila internet putus, item masuk sini; bila sambung semula, proses sehingga selesai. */
const imageUploadQueue = [];

async function processImageUploadQueue() {
  if (imageUploadQueue.length === 0) return;
  const item = imageUploadQueue[0];
  try {
    await emitWithResponse('cloud:image:upload', {
      base64: item.base64,
      originalName: item.originalName,
      category: item.category || 'penceramah'
    });
    imageUploadQueue.shift();
    if (imageUploadQueue.length > 0) {
      showNotification(`Gambar dihantar. ${imageUploadQueue.length} lagi dalam antrian…`, "success");
      processImageUploadQueue();
    } else {
      showNotification("Semua gambar dalam antrian telah dihantar ke local.", "success");
    }
  } catch (err) {
    console.warn('[cloud-api] Image upload queue item failed, will retry on next connect:', err.message);
  }
}

async function uploadImageForSave(file, category) {
  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const result = await emitWithResponse('cloud:image:upload', {
      base64,
      originalName: file.name,
      category
    });
    return result;
  } catch (err) {
    imageUploadQueue.push({ base64, originalName: file.name, category: category || 'penceramah' });
    showNotification("Sambungan terputus. Gambar akan dihantar apabila sambungan pulih.", "info");
    throw err;
  }
}

async function upsertImageEntry(imageCode, imagePath) {
  const imageRow = { imageCode, imagePath };
  const imageRaw = reconstructRawLine("images", imageRow);
  const listJson = await fetchData("images");
  const existing = (listJson.data || []).find(
    (im) => (im.imageCode || "").trim() === imageCode,
  );
  if (existing && existing.id != null) {
    await emitWithResponse("cloud:data:update", {
      fileName: "images",
      id: existing.id,
      row: { ...imageRow, raw: imageRaw },
    });
  } else {
    await emitWithResponse("cloud:data:insert", {
      fileName: "images",
      row: { ...imageRow, raw: imageRaw },
      position: "end",
    });
  }
}

registerOnReconnect(processImageUploadQueue);

function reconstructRawLine(fileName, rowData) {
  if (fileName === "slides") {
    return `${rowData.type || ""}|${rowData.image || ""}|${rowData.duration || ""}|${rowData.checkbox || ""}|${rowData.hide || "0"}`;
  } else if (fileName === "kuliah") {
    return `${rowData.week || ""}|${rowData.day || ""}|${rowData.type || ""}|${rowData.speaker || ""}|${rowData.title || ""}`;
  } else if (fileName === "kuliah-override") {
    const format = (rowData.format || "single").toLowerCase();
    if (format === "single") {
      return `${rowData.date || ""}|${rowData.type || ""}|${rowData.notes || ""}`;
    }
    if (format === "weekly") {
      const hari = (rowData.hari || "").trim();
      const type = (rowData.type || "").trim();
      const replace = (rowData.replace || "").trim();
      const notes = (rowData.notes || "").trim();
      return `weekly|${hari}|${type}|${replace}|${notes}`;
    }
    const tahun = (rowData.tahun || "").trim();
    const bulan = (rowData.bulan || "").trim();
    const type = (rowData.type || "").trim();
    const hari = (rowData.hari || "").trim();
    const replace = (rowData.replace || "").trim();
    const notes = (rowData.notes || "").trim();
    if (format === "hijri") {
      const showAnnounce = (rowData.showAnnounce || "").toString().trim() === "1" ? "1" : "0";
      const title = (rowData.title || "").trim();
      const tempat = (rowData.tempat || "").trim();
      const jemputan = (rowData.jemputan || "").trim();
      if (showAnnounce === "1" || title || tempat || jemputan) {
        return `hijri|${tahun}|${bulan}|${hari}|${type}|${replace || "0"}|${notes}|${showAnnounce}|${title}|${tempat}|${jemputan}`;
      }
      return `hijri|${tahun}|${bulan}|${hari}|${type}|${replace || "0"}|${notes}`;
    }
    if (tahun) {
      return `${tahun}|${bulan}|${type}|${hari}|${replace || "0"}|${notes}`;
    }
    if (replace) {
      return `${bulan}|${type}|${hari}|${replace}|${notes}`;
    }
    return `${bulan}|${type}|${hari}|${notes}`;
  } else if (fileName === "images") {
    return `${rowData.imageCode || ""}|${rowData.imagePath || ""}`;
  } else if (fileName === "announcements") {
    return `${rowData.type || ""}|${rowData.title || ""}|${rowData.speaker || ""}|${rowData.category || ""}|${rowData.datetime || ""}|${rowData.location || ""}|${rowData.audience || ""}`;
  } else if (fileName === "countdowns") {
    const format = (rowData.format || "date").toLowerCase();
    const event = (rowData.event || "").trim();
    const windowDays = (rowData.windowDays ?? "").toString().trim();
    const bg = (rowData.background || "").trim();
    const display = (rowData.display || "").trim();
    const layout = (rowData.layout || "").trim();
    const suffix = bg || display || layout ? `|${bg}|${display}|${layout}` : "";
    if (format === "hijri") {
      return `COUNTDOWN_HIJRI|${rowData.tahun || ""}|${rowData.bulan || ""}|${rowData.hari || ""}|${event}|${windowDays}${suffix}`;
    }
    if (format === "masihi") {
      return `COUNTDOWN_MASIHI|${rowData.bulan || ""}|${rowData.hari || ""}|${event}|${windowDays}${suffix}`;
    }
    return `COUNTDOWN|${(rowData.date || "").trim()}|${event}|${windowDays}${suffix}`;
  } else if (fileName === "config") {
    return `${rowData.key || ""}|${rowData.value || ""}`;
  } else if (fileName === "takwim") {
    const dateHijri = `${rowData.date || ""} ${rowData.hijri || ""}`.trim();
    const times = [rowData.imsak || "", rowData.subuh || "", rowData.syuruk || "", rowData.zohor || "", rowData.asar || "", rowData.maghrib || "", rowData.isyak || ""];
    return [dateHijri, ...times].join("\t");
  } else if (fileName === "slideshow") {
    const caption = (rowData.caption || "").replace(/\t/g, " ");
    return `${caption}|${rowData.image || ""}|${(rowData.validFrom || "").trim()}|${(rowData.validTo || "").trim()}`;
  } else if (fileName === "hebahan") {
    return `${rowData.text || ""}|${rowData.startDate || ""}|${rowData.endDate || ""}`;
  } else if (fileName === "livestream") {
    return `${rowData.tajuk || ""}|${rowData.url || ""}|${rowData.jenis || ""}`;
  } else if (fileName === "petugas") {
    return `${rowData.slug || ""}|${rowData.namaPenuh || ""}|${rowData.shortname || ""}|${rowData.role || ""}|`;
  } else if (fileName === "jadual-petugas") {
    return `${rowData.week || ""}|${rowData.day || ""}|${rowData.role || ""}|${rowData.officerCode || ""}`;
  } else if (fileName === "penceramah") {
    return `${rowData.kod || ""}|${rowData.namaPenuh || ""}|${rowData.shortname || ""}|${rowData.kitab || ""}`;
  }
  return "";
}

function normalizeSlidesRowForSave(row) {
  const next = { ...row };
  if (next.hide !== "1") next.hide = "0";
  if (next.checkbox == null) next.checkbox = "";
  if (next.image == null) next.image = "";
  if (next.duration != null && String(next.duration).trim() !== "") {
    const seconds = parseFloat(String(next.duration).trim());
    if (!isNaN(seconds)) next.duration = String(Math.round(seconds * 1000));
  } else {
    next.duration = "";
  }
  next.raw = reconstructRawLine("slides", next);
  return next;
}

export async function getSlideshowSettings() {
  try {
    const { data, columns } = await emitWithResponse('cloud:data:get', { fileName: 'config' });
    const row = (data || []).find(r => r.key === 'slideshow_paparan');
    let parsed = {};
    try { parsed = row?.value ? JSON.parse(row.value) : {}; } catch (e) { parsed = {}; }
    return { ok: true, settings: { date: !!parsed.date, solatTime: !!parsed.solatTime, solatTimeSmall: !!parsed.solatTimeSmall } };
  } catch (error) {
    return { ok: false, error: error?.message || "Gagal baca setting slideshow" };
  }
}

export async function updateSlideshowSettings(settings) {
  try {
    const { data } = await emitWithResponse('cloud:data:get', { fileName: 'config' });
    const row = (data || []).find(r => r.key === 'slideshow_paparan');
    const value = JSON.stringify({ date: !!settings.date, solatTime: !!settings.solatTime, solatTimeSmall: !!settings.solatTimeSmall });
    const rawLine = `slideshow_paparan|${value}`;
    if (row && row.id) {
      await emitWithResponse('cloud:data:update', { fileName: 'config', id: row.id, row: { key: 'slideshow_paparan', value, raw: rawLine } });
    } else {
      await emitWithResponse('cloud:data:insert', { fileName: 'config', row: { key: 'slideshow_paparan', value, raw: rawLine }, position: 'end' });
    }
    return { ok: true };
  } catch (error) {
    showNotification("✗ Gagal menyimpan setting slideshow", "error");
    return { ok: false, error: error?.message };
  }
}

export async function updateSlideRow(rowId, partial) {
  const currentFileName = getCurrentFileName();
  if (currentFileName !== "slides") return { ok: false, error: "Wrong context" };
  const existing = findRowById(rowId);
  if (!existing) return { ok: false, error: "Row not found" };
  const mergedUi = { ...existing, ...partial, id: rowId, type: existing.type };
  const payloadRow = normalizeSlidesRowForSave(mergedUi);
  try {
    const result = await emitWithResponse('cloud:data:update', { fileName: 'slides', id: rowId, row: payloadRow });
    const data = getCurrentData();
    if (Array.isArray(data) && data.length) {
      const nextData = data.map(r => (r.id === rowId ? mergedUi : r));
      setCurrentData(nextData);
    }
    return { ok: true, result };
  } catch (e) {
    showNotification("✗ Gagal kemaskini", "error");
    return { ok: false, error: e?.message };
  }
}

function validateAnnouncementData(rowData) {
  if (!rowData.type || !rowData.title || !rowData.datetime) {
    return { valid: false, error: "Type, Title, dan Datetime wajib diisi" };
  }
  const parsedDate = DateUtils.parseDateTime(rowData.datetime);
  if (!parsedDate) {
    return { valid: false, error: "Format datetime tidak sah. Guna: YYYY-MM-DD HH:MM" };
  }
  return { valid: true };
}

function slugifyName(name) {
  if (!name) return "";
  return String(name).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");
}

export async function saveRow() {
  const currentFileName = getCurrentFileName();
  const currentColumns = getCurrentColumns();
  const editingRowId = getEditingRowId();
  const addMode = isAddMode();

  const rowData = addMode ? {} : { id: editingRowId };
  currentColumns.forEach(col => {
    const field = document.getElementById(`field-${col}`);
    rowData[col] = field ? field.value.trim() : "";
  });

  if (currentFileName === "penceramah") {
    const slug = slugifyName((rowData.namaPenuh || "").trim());
    if (slug) rowData.kod = slug;
  }
  if (currentFileName === "petugas") {
    const slug = slugifyName((rowData.namaPenuh || "").trim());
    if (slug) rowData.slug = slug;
  }

  try {
    if (currentFileName === "images") {
      const code = (rowData.imageCode || "").trim();
      if (!code) { showNotification("✗ Image Code wajib diisi", "error"); return; }
      const fileInput = document.getElementById("file-imagePath");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const existingPath = (rowData.imagePath || "").trim();
      if (!file && !existingPath) { showNotification("✗ Sila pilih fail image sebelum simpan", "error"); return; }
      const imgChgEl = document.getElementById("field-imgChg");
      const imgChg = imgChgEl ? (imgChgEl.value || "").trim() : (file ? "1" : "0");
      const shouldUpload = addMode ? !!file : (imgChg === "1" && !!file);
      if (shouldUpload) {
        const forceSlides = typeof window !== "undefined" && window.__BACKGROUND_MODE__ === true;
        const categorySelect = document.getElementById("category-imagePath");
        const category = forceSlides ? "slides" : (categorySelect ? categorySelect.value : "penceramah");
        const uploaded = await uploadImageForSave(file, category);
        rowData.imagePath = uploaded.path || "";
        const hidden = document.getElementById("field-imagePath");
        if (hidden) hidden.value = rowData.imagePath;
      }
    }

    if (currentFileName === "penceramah") {
      const fileInput = document.getElementById("file-imageCode");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const changeFlagEl = document.getElementById("field-changeImage");
      const changeFlag = changeFlagEl ? (changeFlagEl.value || "").trim() : "0";
      if (addMode && !file) { showNotification("✗ Sila pilih fail gambar penceramah sebelum simpan", "error"); return; }
      if (file && (addMode || changeFlag === "1")) {
        const uploaded = await uploadImageForSave(file, "penceramah");
        const imageCode = (rowData.kod || "").trim();
        if (imageCode) {
          const imageRow = { imageCode, imagePath: uploaded.path || "" };
          const imageRaw = reconstructRawLine("images", imageRow);
          await emitWithResponse('cloud:data:insert', { fileName: 'images', row: { ...imageRow, raw: imageRaw }, position: 'end' });
        }
      }
    }

    if (currentFileName === "petugas") {
      const fileInput = document.getElementById("file-petugas-gambar");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const changeFlagEl = document.getElementById("field-changeImage");
      const changeFlag = changeFlagEl ? (changeFlagEl.value || "").trim() : "0";
      if (file && (addMode || changeFlag === "1")) {
        const uploaded = await uploadImageForSave(file, "imambilal");
        const slug = (rowData.slug || "").trim();
        if (slug && uploaded.path) {
          const imageRow = { imageCode: slug, imagePath: uploaded.path };
          const imageRaw = reconstructRawLine("images", imageRow);
          await emitWithResponse('cloud:data:insert', { fileName: 'images', row: { ...imageRow, raw: imageRaw }, position: 'end' });
        }
      }
    }

    if (currentFileName === "slideshow") {
      const caption = (rowData.caption || "").trim();
      if (!caption) { showNotification("✗ Caption wajib diisi", "error"); return; }
      const fileInput = document.getElementById("file-image");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const existingImage = (rowData.image || "").trim();
      if (!file && !existingImage) { showNotification("✗ Sila pilih fail image sebelum simpan", "error"); return; }
      if (file) {
        const uploaded = await uploadImageForSave(file, "slideshow");
        rowData.image = uploaded.path || "";
        const hidden = document.getElementById("field-image");
        if (hidden) hidden.value = rowData.image;
      }
    }

    if (currentFileName === "countdowns") {
      const fileInput = document.getElementById("file-countdown-background");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const imgChgEl = document.getElementById("field-countdownBgChg");
      const imgChg = imgChgEl ? (imgChgEl.value || "").trim() : (file ? "1" : "0");
      const shouldUpload = addMode ? !!file : (imgChg === "1" && !!file);
      if (shouldUpload) {
        const imageCode = (rowData.background || "").trim();
        if (!imageCode) {
          showNotification("✗ Kod background wajib diisi sebelum upload imej", "error");
          return;
        }
        const uploaded = await uploadImageForSave(file, "countdown");
        await upsertImageEntry(imageCode, uploaded.path || "");
      }
    }
  } catch (error) {
    showNotification(`✗ ${error.message || "Upload gagal"}`, "error");
    return;
  }

  if (currentFileName === "announcements" && rowData.datetime) {
    rowData.datetime = rowData.datetime.replace("T", " ");
  }
  if (currentFileName === "countdowns" && (rowData.format || "date").toLowerCase() === "date" && rowData.date) {
    const d = String(rowData.date).trim();
    if (d.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(d)) rowData.date = d + " 00:00";
  }
  if (currentFileName === "kuliah-override" && (rowData.format || "single").toLowerCase() === "single" && rowData.date) {
    const dateParts = rowData.date.split("-");
    if (dateParts.length === 3) rowData.date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  }
  if (currentFileName === "slides" && rowData.duration) {
    const seconds = parseFloat(rowData.duration);
    if (!isNaN(seconds)) rowData.duration = String(Math.round(seconds * 1000));
  }
  if (currentFileName === "announcements") {
    Object.keys(rowData).forEach(key => {
      if (key !== "datetime" && key !== "id" && typeof rowData[key] === "string") rowData[key] = rowData[key].toUpperCase();
    });
    const validation = validateAnnouncementData(rowData);
    if (!validation.valid) { showNotification(`✗ ${validation.error}`, "error"); return; }
  }
  if (currentFileName === "countdowns") {
    if (!rowData.event || !rowData.event.trim()) { showNotification("✗ Event wajib diisi", "error"); return; }
    const fmt = (rowData.format || "date").toLowerCase();
    if (fmt === "date" && (!rowData.date || !rowData.date.trim())) { showNotification("✗ Tarikh wajib diisi", "error"); return; }
    if (fmt !== "date") {
      const bulan = parseInt(rowData.bulan, 10);
      const hari = parseInt(rowData.hari, 10);
      if (isNaN(bulan) || bulan < 1 || bulan > 12) { showNotification("✗ Bulan wajib (1-12)", "error"); return; }
      if (isNaN(hari) || hari < 1 || hari > 31) { showNotification("✗ Hari wajib (1-31)", "error"); return; }
    }
  }
  if (currentFileName === "kuliah-override") {
    const format = (rowData.format || "single").toLowerCase();
    const typeStr = (rowData.type || "").trim();
    if (!typeStr) { showNotification("✗ Type kuliah wajib dipilih", "error"); return; }
    if (format === "single" && (!rowData.date || !rowData.date.trim())) { showNotification("✗ Tarikh wajib diisi", "error"); return; }
    if (format === "weekly") {
      const hari = parseInt(rowData.hari, 10);
      if (isNaN(hari) || hari < 0 || hari > 6) { showNotification("✗ Hari minggu wajib (0-6)", "error"); return; }
    } else if (format !== "single") {
      const bulan = parseInt(rowData.bulan, 10);
      if (isNaN(bulan) || bulan < 1 || bulan > 12) { showNotification("✗ Bulan wajib (1-12)", "error"); return; }
      if (!rowData.hari || !rowData.hari.trim()) { showNotification("✗ Hari wajib", "error"); return; }
    }
  }
  if (currentFileName === "livestream" && (!rowData.url || !rowData.url.trim())) {
    showNotification("✗ URL / IP Streaming wajib diisi", "error"); return;
  }

  rowData.raw = reconstructRawLine(currentFileName, rowData);

  try {
    let result;
    if (addMode) {
      result = await emitWithResponse('cloud:data:insert', { fileName: currentFileName, row: rowData, position: 'end' });
    } else {
      if (!editingRowId) return;
      result = await emitWithResponse('cloud:data:update', { fileName: currentFileName, id: editingRowId, row: rowData });
    }

    closeDialog();

    if (result.success && result.row != null && result.action) {
      let row = result.row;
      if (currentFileName === "slides" && row.duration != null && row.duration !== "") {
        const ms = parseFloat(row.duration);
        if (!isNaN(ms)) row = { ...row, duration: String(ms / 1000) };
      }
      if (result.action === "insert") {
        TableUtils.addRow(currentFileName, row);
      } else if (result.action === "update") {
        TableUtils.updateRow(currentFileName, editingRowId, row);
      }
    }
  } catch (error) {
    console.error("Error saving row:", error);
    showNotification("✗ Gagal menyimpan", "error");
  }
}

export async function deleteRow(rowId) {
  if (!confirm(`Adakah anda pasti mahu memadam baris #${rowId}?`)) return;
  const currentFileName = getCurrentFileName();
  try {
    const result = await emitWithResponse('cloud:data:delete', { fileName: currentFileName, id: rowId });
    if (result.success && result.action === "delete" && result.rowId != null) {
      TableUtils.removeRow(currentFileName, result.rowId);
    }
  } catch (error) {
    console.error("Error deleting row:", error);
    showNotification("✗ Gagal memadam", "error");
  }
}

export async function toggleSlideHide(rowId) {
  const currentFileName = getCurrentFileName();
  if (currentFileName !== "slides") return;
  try {
    await emitWithResponse('cloud:slides:toggle-hide', { id: rowId });
  } catch (error) {
    console.error("Error toggling slide hide:", error);
    showNotification("✗ Gagal kemaskini", "error");
  }
}

export async function reorderSlideshow(orderedIds) {
  try {
    await emitWithResponse('cloud:slideshow:reorder', { orderedIds });
  } catch (error) {
    console.error("Error reordering slideshow:", error);
    showNotification("✗ Gagal menyimpan susunan", "error");
  }
}

if (typeof window !== "undefined") {
  window.ApiUtils = {
    saveRow,
    deleteRow,
    toggleSlideHide,
    reorderSlideshow,
    updateSlideRow,
    getSlideshowSettings,
    updateSlideshowSettings,
  };
}
