/**
 * API Functions
 * Function untuk CRUD operations dengan backend API
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

async function uploadImageForSave(file, category) {
  const API_URL = window.Config.API_URL;
  const formData = new FormData();
  formData.append("image", file);
  formData.append("category", category);

  const url = `${API_URL}/images/upload?category=${encodeURIComponent(category)}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `HTTP ${response.status}: Upload gagal`);
  }
  return result;
}

async function upsertImageEntry(imageCode, imagePath) {
  const API_URL = window.Config.API_URL;
  const imageRow = { imageCode, imagePath };
  const imageRaw = reconstructRawLine("images", imageRow);
  const listRes = await fetch(`${API_URL}/data/images`);
  const listJson = await listRes.json();
  const allMatches = (listJson.data || []).filter(
    (im) => (im.imageCode || "").trim() === imageCode,
  );

  if (allMatches.length === 0) {
    // Tiada rekod — insert baru
    await fetch(`${API_URL}/data/images/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row: { ...imageRow, raw: imageRaw }, position: "end" }),
    });
  } else {
    // Update rekod pertama
    await fetch(`${API_URL}/data/images/${allMatches[0].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row: { ...imageRow, raw: imageRaw } }),
    });
    // Buang semua rekod duplikat (dari belakang supaya ID tidak bergeser)
    const duplicates = allMatches.slice(1).sort((a, b) => b.id - a.id);
    for (const dup of duplicates) {
      await fetch(`${API_URL}/data/images/${dup.id}`, { method: "DELETE" });
    }
  }
}

/**
 * Reconstruct raw line based on file type
 * @param {string} fileName - Nama fail
 * @param {object} rowData - Data row
 * @returns {string} Raw line string
 */
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
      const showAnnounce =
        (rowData.showAnnounce || "").toString().trim() === "1" ? "1" : "0";
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
      const tahun = (rowData.tahun || "").trim();
      const bulan = (rowData.bulan || "").trim();
      const hari = (rowData.hari || "").trim();
      return `COUNTDOWN_HIJRI|${tahun}|${bulan}|${hari}|${event}|${windowDays}${suffix}`;
    }
    if (format === "masihi") {
      const bulan = (rowData.bulan || "").trim();
      const hari = (rowData.hari || "").trim();
      return `COUNTDOWN_MASIHI|${bulan}|${hari}|${event}|${windowDays}${suffix}`;
    }
    const date = (rowData.date || "").trim();
    return `COUNTDOWN|${date}|${event}|${windowDays}${suffix}`;
  } else if (fileName === "config") {
    return `${rowData.key || ""}|${rowData.value || ""}`;
  } else if (fileName === "takwim") {
    // Format: DD-MM-YYYY DD-MM-HHHH\tImsak\tSubuh\tSyuruk\tZohor\tAsar\tMaghrib\tIsyak
    const dateHijri = `${rowData.date || ""} ${rowData.hijri || ""}`.trim();
    const times = [
      rowData.imsak || "",
      rowData.subuh || "",
      rowData.syuruk || "",
      rowData.zohor || "",
      rowData.asar || "",
      rowData.maghrib || "",
      rowData.isyak || "",
    ];
    return [dateHijri, ...times].join("\t");
  } else if (fileName === "slideshow") {
    const caption = (rowData.caption || "").replace(/\t/g, " ");
    const image = rowData.image || "";
    const validFrom = (rowData.validFrom || "").trim();
    const validTo = (rowData.validTo || "").trim();
    const showOn = (rowData.showOn || "").trim();
    return `${caption}|${image}|${validFrom}|${validTo}|${showOn}`;
  } else if (fileName === "hebahan") {
    return `${rowData.text || ""}|${rowData.startDate || ""}|${rowData.endDate || ""}`;
  } else if (fileName === "livestream") {
    return `${rowData.tajuk || ""}|${rowData.url || ""}|${rowData.jenis || ""}`;
  } else if (fileName === "petugas") {
    return `${rowData.slug || ""}|${rowData.namaPenuh || ""}|${rowData.shortname || ""}|${rowData.role || ""}|`;
  } else if (fileName === "jadual-petugas") {
    return `${rowData.week || ""}|${rowData.day || ""}|${rowData.role || ""}|${rowData.officerCode || ""}`;
  } else if (fileName === "penceramah") {
    // Fail penceramah: kod(slug namaPenuh)|namaPenuh|shortname|kitab
    return `${rowData.kod || ""}|${rowData.namaPenuh || ""}|${rowData.shortname || ""}|${rowData.kitab || ""}`;
  }
  return "";
}

function normalizeSlidesRowForSave(row) {
  const next = { ...row };
  if (next.hide !== "1") next.hide = "0";
  if (next.checkbox == null) next.checkbox = "";
  if (next.image == null) next.image = "";

  // UI guna saat, storage guna ms
  if (next.duration != null && String(next.duration).trim() !== "") {
    const seconds = parseFloat(String(next.duration).trim());
    if (!isNaN(seconds)) next.duration = String(Math.round(seconds * 1000));
  } else {
    next.duration = "";
  }

  next.raw = reconstructRawLine("slides", next);
  return next;
}

/**
 * Baca setting paparan slideshow (overlay) dari backend.
 * Setting ini biasanya disimpan dalam config (kunci slideshow_paparan) sebagai JSON string.
 */
export async function getSlideshowSettings() {
  try {
    const API_URL = window.Config.API_URL;
    const response = await fetch(`${API_URL}/config/slideshow_paparan`);
    if (!response.ok) {
      // Jika 404 atau tiada config, pulangkan default
      return {
        ok: true,
        settings: {
          date: false,
          solatTime: false,
          solatTimeSmall: false,
        },
      };
    }
    const result = await response.json();
    let parsed = {};
    try {
      parsed = result?.value ? JSON.parse(result.value) : {};
    } catch (e) {
      parsed = {};
    }
    return {
      ok: true,
      settings: {
        date: !!parsed.date,
        solatTime: !!parsed.solatTime,
        solatTimeSmall: !!parsed.solatTimeSmall,
      },
    };
  } catch (error) {
    console.error("Error getSlideshowSettings:", error);
    return {
      ok: false,
      error: error?.message || "Gagal baca setting slideshow",
    };
  }
}

/**
 * Kemaskini setting paparan slideshow ke backend (auto-save).
 * @param {{date:boolean, solatTime:boolean, solatTimeSmall:boolean}} settings
 */
export async function updateSlideshowSettings(settings) {
  try {
    const API_URL = window.Config.API_URL;
    const body = {
      key: "slideshow_paparan",
      value: JSON.stringify({
        date: !!settings.date,
        solatTime: !!settings.solatTime,
        solatTimeSmall: !!settings.solatTimeSmall,
      }),
    };
    const response = await fetch(`${API_URL}/config/slideshow_paparan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    await response.json();
    return { ok: true };
  } catch (error) {
    console.error("Error updateSlideshowSettings:", error);
    showNotification("✗ Gagal menyimpan setting slideshow", "error");
    return {
      ok: false,
      error: error?.message || "Gagal menyimpan setting slideshow",
    };
  }
}

/**
 * Inline update untuk row slides (tanpa modal).
 * - `partial` guna format UI: duration dalam saat (string/number)
 * - akan dihantar ke backend dalam format storage: duration ms + raw.
 */
export async function updateSlideRow(rowId, partial) {
  const currentFileName = getCurrentFileName();
  if (currentFileName !== "slides") return { ok: false, error: "Wrong context" };

  const existing = findRowById(rowId);
  if (!existing) return { ok: false, error: "Row not found" };

  const mergedUi = {
    ...existing,
    ...partial,
    id: rowId,
    type: existing.type, // type ialah key: jangan ubah
  };

  const payloadRow = normalizeSlidesRowForSave(mergedUi);

  try {
    const API_URL = window.Config.API_URL;
    const response = await fetch(`${API_URL}/data/slides/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row: payloadRow }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    // Kekalkan state dalam format UI (saat)
    const data = getCurrentData();
    if (Array.isArray(data) && data.length) {
      const nextData = data.map((r) => (r.id === rowId ? mergedUi : r));
      setCurrentData(nextData);
    }

    return { ok: true, result };
  } catch (e) {
    console.error("Error updating slide row:", e);
    showNotification("✗ Gagal kemaskini", "error");
    return { ok: false, error: e?.message || "Update failed" };
  }
}

/**
 * Validate row data untuk announcements
 * @param {object} rowData - Data row
 * @returns {object} { valid: boolean, error: string }
 */
function validateAnnouncementData(rowData) {
  if (!rowData.type || !rowData.title || !rowData.datetime) {
    return { valid: false, error: "Type, Title, dan Datetime wajib diisi" };
  }

  // Validate datetime format
  const parsedDate = DateUtils.parseDateTime(rowData.datetime);
  if (!parsedDate) {
    return {
      valid: false,
      error: "Format datetime tidak sah. Guna: YYYY-MM-DD HH:MM",
    };
  }

  return { valid: true };
}

function slugifyName(name) {
  if (!name) return "";
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

/**
 * Save row (handle both Edit and Add mode)
 */
export async function saveRow() {
  const currentFileName = getCurrentFileName();
  const currentColumns = getCurrentColumns();
  const editingRowId = getEditingRowId();
  const addMode = isAddMode();

  // Build row object
  const rowData = addMode ? {} : { id: editingRowId };
  currentColumns.forEach((col) => {
    const field = document.getElementById(`field-${col}`);
    rowData[col] = field ? field.value.trim() : "";
  });

  // Penceramah: jana kod automatik dari namaPenuh (slug); tiada imageCode
  if (currentFileName === "penceramah") {
    const namaPenuh = (rowData.namaPenuh || "").trim();
    const slug = slugifyName(namaPenuh);
    if (slug) rowData.kod = slug;
  }

  // Petugas: jana slug automatik dari namaPenuh
  if (currentFileName === "petugas") {
    const namaPenuh = (rowData.namaPenuh || "").trim();
    const slug = slugifyName(namaPenuh);
    if (slug) rowData.slug = slug;
  }

  // Images + Slideshow: upload image dibuat masa Save (bukan di dialog)
  // - images: imageCode wajib, file wajib dipilih untuk add; untuk edit, wajib jika tiada imagePath sedia ada
  // - slideshow: caption wajib; file wajib dipilih untuk add; untuk edit, wajib jika tiada image sedia ada
  try {
    if (currentFileName === "images") {
      const code = (rowData.imageCode || "").trim();
      if (!code) {
        showNotification("✗ Image Code wajib diisi", "error");
        return;
      }

      const fileInput = document.getElementById("file-imagePath");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const existingPath = (rowData.imagePath || "").trim();
      if (!file && !existingPath) {
        showNotification("✗ Sila pilih fail image sebelum simpan", "error");
        return;
      }

      // Flag ringkas untuk edit: upload hanya bila betul-betul tukar imej
      // - Add mode: file wajib (akan upload)
      // - Edit mode: upload hanya bila imgChg === "1"
      const imgChgEl = document.getElementById("field-imgChg");
      const imgChg = imgChgEl ? (imgChgEl.value || "").trim() : (file ? "1" : "0");
      const shouldUpload = addMode ? !!file : (imgChg === "1" && !!file);

      if (shouldUpload) {
        const categorySelect = document.getElementById("category-imagePath");
        // Background mode: force kategori slides
        const forceSlides =
          typeof window !== "undefined" && window.__BACKGROUND_MODE__ === true;
        const category = forceSlides
          ? "slides"
          : (categorySelect ? categorySelect.value : "penceramah");
        const uploaded = await uploadImageForSave(file, category);
        rowData.imagePath = uploaded.path || "";
        const hidden = document.getElementById("field-imagePath");
        if (hidden) hidden.value = rowData.imagePath;
      }
    }

    // Penceramah:
    // - ADD (penceramah baru): WAJIB ada fail gambar, jika tiada → tidak boleh simpan
    // - EDIT: hanya bila flag changeImage=true dan ada fail, baru upload & update gallery/images.txt
    if (currentFileName === "penceramah") {
      const fileInput = document.getElementById("file-imageCode");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const changeFlagEl = document.getElementById("field-changeImage");
      const changeFlag = changeFlagEl ? (changeFlagEl.value || "").trim() : "0";

      // ADD MODE: gambar wajib
      if (addMode) {
        if (!file) {
          showNotification("✗ Sila pilih fail gambar penceramah sebelum simpan", "error");
          return;
        }
      } else {
        // EDIT MODE: jika tiada perubahan gambar (flag masih "0"), abaikan upload
        if (changeFlag !== "1" || !file) {
          // Tiada upload diperlukan, teruskan proses simpan data teks
          // (imageCode mungkin diubah secara manual oleh user)
          // Hanya keluar dari blok penceramah, bukan seluruh saveRow
          // eslint-disable-next-line no-empty
        } else {
          // fallthrough ke upload di bawah
        }
      }

      // Pada ketika ini:
      // - ADD: dijamin ada file
      // - EDIT: hanya masuk sini jika changeFlag === "1" dan ada file
      if (file) {
        const uploaded = await uploadImageForSave(file, "penceramah");
        const imageCode = (rowData.kod || "").trim();
        if (imageCode) {
          const API_URL = window.Config.API_URL;
          const imageRow = { imageCode, imagePath: uploaded.path || "" };
          const imageRaw = reconstructRawLine("images", imageRow);
          await fetch(`${API_URL}/data/images/insert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row: { ...imageRow, raw: imageRaw }, position: "end" }),
          });
        }
      }
    }

    // Petugas: gambar pilihan - upload dan simpan dalam images.txt dengan imageCode = slug
    if (currentFileName === "petugas") {
      const fileInput = document.getElementById("file-petugas-gambar");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const changeFlagEl = document.getElementById("field-changeImage");
      const changeFlag = changeFlagEl ? (changeFlagEl.value || "").trim() : "0";

      const shouldUpload = file && (addMode || changeFlag === "1");
      if (shouldUpload) {
        const uploaded = await uploadImageForSave(file, "imambilal");
        const slug = (rowData.slug || "").trim();
        if (slug && uploaded.path) {
          const API_URL = window.Config.API_URL;
          const imageRow = { imageCode: slug, imagePath: uploaded.path };
          const imageRaw = reconstructRawLine("images", imageRow);
          await fetch(`${API_URL}/data/images/insert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row: { ...imageRow, raw: imageRaw }, position: "end" }),
          });
        }
      }
    }

    if (currentFileName === "slideshow") {
      const caption = (rowData.caption || "").trim();
      if (!caption) {
        showNotification("✗ Caption wajib diisi", "error");
        return;
      }

      const fileInput = document.getElementById("file-image");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const existingImage = (rowData.image || "").trim();
      if (!file && !existingImage) {
        showNotification("✗ Sila pilih fail image sebelum simpan", "error");
        return;
      }

      if (file) {
        const uploaded = await uploadImageForSave(file, "slideshow");
        rowData.image = uploaded.path || "";
        const hidden = document.getElementById("field-image");
        if (hidden) hidden.value = rowData.image;
      }
    }

    // Countdown: upload background ke images/countdown/ dan daftar dalam images.txt
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
    console.error("Error uploading image on save:", error);
    showNotification(`✗ ${error.message || "Upload gagal"}`, "error");
    return;
  }

  // Convert datetime-local format (YYYY-MM-DDTHH:MM) to storage format (YYYY-MM-DD HH:MM)
  if (currentFileName === "announcements" && rowData.datetime) {
    rowData.datetime = rowData.datetime.replace("T", " ");
  }

  // Countdowns: jika format date dan date hanya YYYY-MM-DD (10 char), tambah 00:00 untuk backend
  if (
    currentFileName === "countdowns" &&
    (rowData.format || "date").toLowerCase() === "date" &&
    rowData.date
  ) {
    const d = String(rowData.date).trim();
    if (d.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      rowData.date = d + " 00:00";
    }
  }

  // Convert date input (YYYY-MM-DD) to storage (DD-MM-YYYY) untuk kuliah-override format single sahaja
  if (
    currentFileName === "kuliah-override" &&
    (rowData.format || "single").toLowerCase() === "single" &&
    rowData.date
  ) {
    const dateParts = rowData.date.split("-");
    if (dateParts.length === 3) {
      rowData.date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    }
  }

  // Convert duration dalam saat (UI) kepada ms untuk disimpan dalam screen.txt
  if (currentFileName === "slides" && rowData.duration) {
    const seconds = parseFloat(rowData.duration);
    if (!isNaN(seconds)) {
      rowData.duration = String(Math.round(seconds * 1000));
    }
  }

  // Convert semua text field kepada uppercase untuk announcements (kecuali datetime)
  if (currentFileName === "announcements") {
    Object.keys(rowData).forEach((key) => {
      if (
        key !== "datetime" &&
        key !== "id" &&
        typeof rowData[key] === "string"
      ) {
        rowData[key] = rowData[key].toUpperCase();
      }
    });
  }

  // Validate untuk announcements
  if (currentFileName === "announcements") {
    const validation = validateAnnouncementData(rowData);
    if (!validation.valid) {
      showNotification(`✗ ${validation.error}`, "error");
      return;
    }
  }

  // Validate untuk images & slideshow kini diurus dalam blok upload-on-save di atas

  // Validate countdowns: event wajib; format date = tarikh wajib; format masihi/hijri = bulan + hari wajib
  if (currentFileName === "countdowns") {
    if (!rowData.event || !rowData.event.trim()) {
      showNotification("✗ Event wajib diisi", "error");
      return;
    }
    const fmt = (rowData.format || "date").toLowerCase();
    if (fmt === "date") {
      if (!rowData.date || !rowData.date.trim()) {
        showNotification("✗ Tarikh wajib diisi (YYYY-MM-DD)", "error");
        return;
      }
    } else {
      const bulan = parseInt(rowData.bulan, 10);
      const hari = parseInt(rowData.hari, 10);
      if (
        !rowData.bulan ||
        !rowData.bulan.trim() ||
        isNaN(bulan) ||
        bulan < 1 ||
        bulan > 12
      ) {
        showNotification("✗ Bulan wajib (1-12)", "error");
        return;
      }
      if (
        !rowData.hari ||
        !rowData.hari.trim() ||
        isNaN(hari) ||
        hari < 1 ||
        hari > 31
      ) {
        showNotification("✗ Hari wajib (1-31 Masihi, 1-30 Hijri)", "error");
        return;
      }
    }
  }

  // Validate untuk kuliah-override: ikut format (single = date+type; range = bulan+type+hari). Type boleh berbilang: kd,ks
  if (currentFileName === "kuliah-override") {
    const format = (rowData.format || "single").toLowerCase();
    const typeStr = (rowData.type || "").trim();
    if (!typeStr) {
      showNotification("✗ Type kuliah wajib dipilih", "error");
      return;
    }
    const validTypes = ["km", "kd", "ks", "kk"];
    const typeParts = typeStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const invalid = typeParts.some((t) => !validTypes.includes(t));
    if (invalid) {
      showNotification("✗ Type mestilah km, kd, ks, atau kk (boleh guna koma: kd,ks)","error");
      return;
    }
    if (format === "single") {
      if (!rowData.date || !rowData.date.trim()) {
        showNotification("✗ Tarikh wajib diisi (format: DD-MM-YYYY)", "error");
        return;
      }
      const datePattern = /^\d{2}-\d{2}-\d{4}$/;
      const dateVal = rowData.date.trim();
      if (!datePattern.test(dateVal)) {
        const ymd = dateVal.split("-");
        if (ymd.length === 3) {
          rowData.date = `${ymd[2]}-${ymd[1]}-${ymd[0]}`;
        } else {
          showNotification("✗ Format tarikh tidak betul. Gunakan: DD-MM-YYYY atau YYYY-MM-DD","error");
          return;
        }
      }
    } else if (format === "weekly") {
      const hari = parseInt(rowData.hari, 10);
      if (isNaN(hari) || hari < 0 || hari > 6) {
        showNotification("✗ Hari minggu wajib (0-6)", "error");
        return;
      }
    } else {
      const bulan = parseInt(rowData.bulan, 10);
      if (
        !rowData.bulan ||
        !rowData.bulan.trim() ||
        isNaN(bulan) ||
        bulan < 1 ||
        bulan > 12
      ) {
        showNotification("✗ Bulan wajib (1-12)", "error");
        return;
      }
      if (!rowData.hari || !rowData.hari.trim()) {
        showNotification("✗ Hari wajib (cth: 1-30 atau 1,2,3)", "error");
        return;
      }
    }
  }

  // Validate untuk livestream: URL wajib
  if (currentFileName === "livestream") {
    if (!rowData.url || !rowData.url.trim()) {
      showNotification("✗ URL / IP Streaming wajib diisi", "error");
      return;
    }
  }

  // Reconstruct raw line
  rowData.raw = reconstructRawLine(currentFileName, rowData);

  try {
    const API_URL = window.Config.API_URL;
    let response;

    if (addMode) {
      // Add new row - POST request
      response = await fetch(`${API_URL}/data/${currentFileName}/insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ row: rowData, position: "end" }),
      });
    } else {
      // Update existing row - PUT request
      if (!editingRowId) return;

      response = await fetch(
        `${API_URL}/data/${currentFileName}/${editingRowId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ row: rowData }),
        },
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

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
    showNotification(`✗ Gagal menyimpan`, "error");
  }
}

/**
 * Delete row by ID
 * @param {number} rowId - ID row untuk dipadam
 */
export async function deleteRow(rowId) {
  if (!confirm(`Adakah anda pasti mahu memadam baris #${rowId}?`)) {
    return;
  }

  const currentFileName = getCurrentFileName();

  try {
    const API_URL = window.Config.API_URL;
    const response = await fetch(
      `${API_URL}/data/${currentFileName}/${rowId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.action === "delete" && result.rowId != null) {
      TableUtils.removeRow(currentFileName, result.rowId);
    }
  } catch (error) {
    console.error("Error deleting row:", error);
    showNotification(`✗ Gagal memadam`, "error");
  }
}

/**
 * Toggle hide/show slide (tanpa buka dialog). Hanya untuk fail slides.
 * @param {number} rowId - ID row slide
 */
export async function toggleSlideHide(rowId) {
  const currentFileName = getCurrentFileName();
  if (currentFileName !== "slides") return;
  try {
    const API_URL = window.Config.API_URL;
    const response = await fetch(
      `${API_URL}/data/slides/${rowId}/toggle-hide`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    await response.json();
    // if (typeof window.loadTable === "function") window.loadTable("slides");
  } catch (error) {
    console.error("Error toggling slide hide:", error);
    showNotification("✗ Gagal kemaskini", "error");
  }
}

/**
 * Reorder slideshow rows
 * @param {number[]} orderedIds - Array ID dalam susunan baru
 */
export async function reorderSlideshow(orderedIds) {
  try {
    const API_URL = window.Config.API_URL;
    const response = await fetch(`${API_URL}/data/slideshow/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    // showNotification("✓ Susunan berjaya disimpan", "success");
  } catch (error) {
    console.error("Error reordering slideshow:", error);
    showNotification("✗ Gagal menyimpan susunan", "error");
  }
}

// Export untuk browser environment
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
