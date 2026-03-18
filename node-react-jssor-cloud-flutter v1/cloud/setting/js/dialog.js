/**
 * Dialog & Form Functions
 * Function untuk dialog operations (Add, Edit, Close)
 */

import {
  getCurrentFileName,
  getCurrentColumns,
  findRowById,
  setEditingRowId,
  setAddMode,
} from "./state.js";
import { showNotification } from "./notification.js";
import { fetchData } from "./cloud-socket.js";

/**
 * Upload image file
 * @param {File} file - File object
 * @param {string} category - Category (penceramah atau slides)
 * @returns {Promise<object>} Upload result dengan path
 */
// Upload image kini dibuat semasa proses Save (rujuk setting/js/api.js)

/**
 * Delete image file
 * @param {string} imagePath - Path image untuk dipadam
 * @returns {Promise<object>} Delete result
 */
// Delete image file kini diurus melalui delete row (Delete button pada table)

/**
 * Download image from URL
 * @param {string} imageUrl - URL image untuk dimuat turun
 * @param {string} category - Category (penceramah atau slides)
 * @param {string} filename - Optional filename
 * @returns {Promise<object>} Download result dengan path
 */
// Download-from-URL tidak lagi digunakan dalam dialog (upload dibuat semasa Save)

/**
 * Create form fields untuk dialog
 * @param {HTMLElement} form - Form element
 * @param {object} row - Data row (null untuk add mode)
 * @param {boolean} isAdd - Mode add atau edit
 * @param {{ imagesList?: Array, penceramahList?: Array, petugasList?: Array }} options - Optional; penceramahList untuk kuliah, petugasList untuk jadual-petugas
 */
function createFormFields(form, row, isAdd, options = {}) {
  const currentFileName = getCurrentFileName();
  const currentColumns = getCurrentColumns();
  const imagesList = options.imagesList || [];
  const penceramahList = options.penceramahList || [];
  const petugasList = options.petugasList || [];
  const API_URL =
    typeof window !== "undefined" && window.Config ? window.Config.API_URL : "";
  const BASE_URL =
    typeof window !== "undefined" && window.Config
      ? window.Config.BASE_URL
      : API_URL
        ? API_URL.replace(/\/api\/?$/, "")
        : "";

  currentColumns.forEach((col) => {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.textContent = col.charAt(0).toUpperCase() + col.slice(1);
    label.setAttribute("for", `field-${col}`);

    // Slides: label BM
    if (currentFileName === "slides" && col === "duration") {
      label.textContent = "Tempoh (s)";
    }
    if (currentFileName === "slides" && (col === "type" || col === "image")) {
      label.textContent = col === "type" ? "Jenis" : "Imej";
    }

    // Kuliah: label mesra pengguna
    if (currentFileName === "kuliah" && col === "speaker") {
      label.textContent = "Penceramah";
    }
    // Kuliah speakerId tiada dalam dialog - image diurus dalam Penceramah
    if (currentFileName === "kuliah" && col === "title") {
      label.textContent = "Nama Kitab / Tajuk Kuliah";
    }
    // Kuliah-override: label kolom
    if (currentFileName === "kuliah-override") {
      const kbLabels = {
        format: "Format",
        date: "Tarikh (DD-MM-YYYY)",
        tahun: "Tahun (pilihan)",
        bulan: "Bulan (1-12)",
        type: "Type",
        hari: "Hari (cth: 1-30 atau 1,2,3)",
        replace: "Ganti paparan (1=ya)",
        notes: "Catatan",
        showAnnounce: "Paparkan di announcement (1=ya)",
        title: "Tajuk (announcement)",
        tempat: "Tempat",
        jemputan: "Jemputan",
      };
      if (kbLabels[col]) label.textContent = kbLabels[col];
    }
    // Countdown: label kolom
    if (currentFileName === "countdowns") {
      const cdLabels = {
        format: "Format",
        date: "Tarikh",
        tahun: "Tahun (kosong = setiap tahun)",
        bulan: "Bulan",
        hari: "Hari",
        event: "Event",
        windowDays: "Papar bila tinggal ___ hari (0 = selalu)",
      };
      if (cdLabels[col]) label.textContent = cdLabels[col];
    }
    // Hebahan: label kolom
    if (currentFileName === "hebahan") {
      const hebahanLabels = {
        text: "Teks Mesej",
        startDate: "Tarikh Mula (YYYY-MM-DD)",
        endDate: "Tarikh Akhir (YYYY-MM-DD)",
      };
      if (hebahanLabels[col]) label.textContent = hebahanLabels[col];
    }
    // Siaran langsung: label kolom
    if (currentFileName === "livestream") {
      const lsLabels = {
        tajuk: "Tajuk Siaran",
        url: "URL / IP Streaming",
        jenis: "Jenis Siaran",
      };
      if (lsLabels[col]) label.textContent = lsLabels[col];
    }

    // Petugas: label mesra pengguna
    if (currentFileName === "petugas") {
      const petugasLabels = { slug: "Slug (jana automatik)", namaPenuh: "Nama Penuh", shortname: "Shortname", role: "Peranan" };
      if (petugasLabels[col]) label.textContent = petugasLabels[col];
    }
    // Jadual petugas: label
    if (currentFileName === "jadual-petugas") {
      const jpLabels = { week: "Minggu", day: "Hari", role: "Peranan", officerCode: "Petugas" };
      if (jpLabels[col]) label.textContent = jpLabels[col];
    }
    // Penceramah: label (kod dijana automatik dari namaPenuh)
    if (currentFileName === "penceramah") {
      const pLabels = { namaPenuh: "Nama Penuh", shortname: "Shortname", kitab: "Kitab (comma-separated)" };
      if (pLabels[col]) label.textContent = pLabels[col];
    }

    // Penceramah: kolum kod dijana automatik dari namaPenuh (slug), jadi tiada input dalam dialog
    if (currentFileName === "penceramah" && col === "kod") {
      return;
    }

    // Petugas: kolum slug dijana automatik dari namaPenuh, papar sebagai readonly
    if (currentFileName === "petugas" && col === "slug") {
      const currentVal = !isAdd && row && row.slug ? String(row.slug).trim() : "";
      const input = document.createElement("input");
      input.type = "text";
      input.id = "field-slug";
      input.name = "slug";
      input.className = "form-control";
      input.value = currentVal;
      input.readOnly = true;
      input.style.background = "#f3f4f6";
      input.style.color = "#6b7280";
      input.placeholder = "Jana automatik dari Nama Penuh";
      group.appendChild(label);
      group.appendChild(input);
      form.appendChild(group);
      return;
    }

    // Petugas: role dropdown (BILAL/IMAM)
    if (currentFileName === "petugas" && col === "role") {
      const select = document.createElement("select");
      select.id = `field-${col}`;
      select.name = col;
      select.className = "form-control";
      const currentVal = !isAdd && row && row[col] ? String(row[col] || "").trim() : "";
      [{ value: "BILAL", label: "BILAL" }, { value: "IMAM", label: "IMAM" }].forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (currentVal === opt.value) o.selected = true;
        select.appendChild(o);
      });
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      return;
    }

    // Petugas: imageCode tidak lagi digunakan (gambar diurus via slug di images.txt)

    // Jadual-petugas: week, day (radio), role (dropdown), officerCode (dropdown dari petugas)
    if (currentFileName === "jadual-petugas" && col === "week") {
      label.textContent = "Minggu";
      const WEEK_OPTIONS = [{ value: "w1", label: "Minggu 1" }, { value: "w2", label: "Minggu 2" }, { value: "w3", label: "Minggu 3" }, { value: "w4", label: "Minggu 4" }, { value: "w5", label: "Minggu 5" }];
      const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : "";
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px 16px";
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal || "w1";
      WEEK_OPTIONS.forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";
        const rb = document.createElement("input");
        rb.type = "radio";
        rb.name = "jadual-petugas-week";
        rb.value = opt.value;
        rb.checked = (currentVal || "w1") === opt.value;
        rb.addEventListener("change", () => { hiddenInput.value = opt.value; });
        wrap.appendChild(rb);
        wrap.appendChild(document.createTextNode(opt.label));
        container.appendChild(wrap);
      });
      group.appendChild(label);
      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }
    if (currentFileName === "jadual-petugas" && col === "day") {
      label.textContent = "Hari";
      const DAY_OPTIONS = [{ value: "h0", label: "Ahad" }, { value: "h1", label: "Isnin" }, { value: "h2", label: "Selasa" }, { value: "h3", label: "Rabu" }, { value: "h4", label: "Khamis" }, { value: "h5", label: "Jumaat" }, { value: "h6", label: "Sabtu" }];
      const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : "";
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px 16px";
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal || "h0";
      DAY_OPTIONS.forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";
        const rb = document.createElement("input");
        rb.type = "radio";
        rb.name = "jadual-petugas-day";
        rb.value = opt.value;
        rb.checked = (currentVal || "h0") === opt.value;
        rb.addEventListener("change", () => { hiddenInput.value = opt.value; });
        wrap.appendChild(rb);
        wrap.appendChild(document.createTextNode(opt.label));
        container.appendChild(wrap);
      });
      group.appendChild(label);
      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }
    if (currentFileName === "jadual-petugas" && col === "role") {
      const select = document.createElement("select");
      select.id = `field-${col}`;
      select.name = col;
      select.className = "form-control";
      const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : "";
      [{ value: "BILAL", label: "BILAL" }, { value: "IMAM", label: "IMAM" }].forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (currentVal === opt.value) o.selected = true;
        select.appendChild(o);
      });
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      return;
    }
    if (currentFileName === "jadual-petugas" && col === "officerCode") {
      const roleVal = !isAdd && row && row.role ? String(row.role).trim() : (form.querySelector("#field-role")?.value || "BILAL");
      const filtered = petugasList.filter((p) => (p.role || "").trim().toUpperCase() === roleVal.toUpperCase());
      const select = document.createElement("select");
      select.id = `field-${col}`;
      select.name = col;
      select.className = "form-control";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "-- Pilih petugas --";
      select.appendChild(emptyOpt);
      const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : "";
      filtered.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.slug || "";
        opt.textContent = p.namaPenuh || p.slug || "";
        if (currentVal === (p.slug || "")) opt.selected = true;
        select.appendChild(opt);
      });
      const roleField = form.querySelector("#field-role");
      if (roleField) {
        roleField.addEventListener("change", () => {
          const rv = roleField.value || "BILAL";
          select.innerHTML = "";
          select.appendChild(emptyOpt.cloneNode(true));
          petugasList.filter((p) => (p.role || "").trim().toUpperCase() === rv.toUpperCase()).forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.slug || "";
            opt.textContent = p.namaPenuh || p.slug || "";
            select.appendChild(opt);
          });
        });
      }
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      return;
    }

    // Siaran langsung: jenis sebagai dropdown
    if (currentFileName === "livestream" && col === "jenis") {
      const select = document.createElement("select");
      select.id = "field-jenis";
      select.name = "jenis";
      select.className = "form-control";
      const currentVal = !isAdd && row[col] ? (row[col] || "").trim().toLowerCase() : "";
      [
        { value: "", label: "— Pilih jenis —" },
        { value: "youtube", label: "YouTube" },
        { value: "facebook", label: "Facebook" },
        { value: "hls", label: "HLS (.m3u8)" },
        { value: "video", label: "Video (.mp4 / .webm)" },
      ].forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (currentVal === opt.value) o.selected = true;
        select.appendChild(o);
      });
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      return;
    }

    // Kuliah-batal: format dropdown (Tarikh tunggal / Range)
    if (currentFileName === "kuliah-override" && col === "format") {
      const select = document.createElement("select");
      select.id = "field-format";
      select.name = "format";
      select.className = "form-control";
      const fmt =
        !isAdd && row[col] ? (row[col] || "single").toLowerCase() : "single";
      // [{ value: 'single', label: 'Tarikh tunggal (DD-MM-YYYY|type|notes)' }, { value: 'range', label: 'Range bulan/hari Masihi (tahun?|bulan|type|hari|flag|catatan)' }, { value: 'hijri', label: 'Tarikh Hijri (bulan|hari|type|flag|catatan)' }].forEach(opt => {
      [
        { value: "single", label: "Tarikh tunggal" },
        { value: "range", label: "Range bulan/hari Masihi" },
        { value: "hijri", label: "Tarikh Hijri" },
      ].forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (fmt === opt.value) o.selected = true;
        select.appendChild(o);
      });
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      select.addEventListener("change", () => {
        const v = select.value;
        form.querySelectorAll("[data-kb-single]").forEach((el) => {
          el.style.display = v === "single" ? "" : "none";
        });
        form.querySelectorAll("[data-kb-range]").forEach((el) => {
          el.style.display = v === "range" || v === "hijri" ? "" : "none";
        });
        form.querySelectorAll("[data-kb-hijri]").forEach((el) => {
          el.style.display = v === "hijri" ? "" : "none";
        });
      });
      return;
    }
    // Kuliah-batal: date (format single) - toggle by format
    if (currentFileName === "kuliah-override" && col === "date") {
      group.setAttribute("data-kb-single", "1");
      const fmt =
        !isAdd && row.format
          ? (row.format || "single").toLowerCase()
          : "single";
      if (fmt === "range" || fmt === "hijri") group.style.display = "none";
    }
    // Kuliah-override: tahun, bulan, hari, replace (format range atau hijri) - toggle by format
    if (
      currentFileName === "kuliah-override" &&
      (col === "tahun" ||
        col === "bulan" ||
        col === "hari" ||
        col === "replace")
    ) {
      group.setAttribute("data-kb-range", "1");
      const fmt =
        !isAdd && row.format
          ? (row.format || "single").toLowerCase()
          : "single";
      if (fmt === "single") group.style.display = "none";
    }
    // Kuliah-override: showAnnounce, title, tempat, jemputan (format hijri sahaja - untuk announcement)
    if (
      currentFileName === "kuliah-override" &&
      (col === "showAnnounce" ||
        col === "title" ||
        col === "tempat" ||
        col === "jemputan")
    ) {
      group.setAttribute("data-kb-hijri", "1");
      const fmt =
        !isAdd && row.format
          ? (row.format || "single").toLowerCase()
          : "single";
      if (fmt !== "hijri") group.style.display = "none";
    }

    // Slides: type adalah key, tidak boleh diubah (disabled)
    if (currentFileName === "slides" && col === "type") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = `field-${col}`;
      input.name = col;
      input.value = isAdd ? "" : row[col] || "";
      input.disabled = true;
      input.className = "form-control";
      input.style.opacity = "0.85";
      input.style.cursor = "not-allowed";
      input.title = "Type adalah key dan tidak boleh diubah";
      group.appendChild(label);
      group.appendChild(input);
      form.appendChild(group);
      return;
    }

    // Special handling untuk speaker dalam kuliah table: dropdown penceramah (full name)
    if (currentFileName === "kuliah" && col === "speaker") {
      const select = document.createElement("select");
      select.id = `field-${col}`;
      select.name = col;
      select.className = "form-control";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "-- Pilih penceramah --";
      select.appendChild(emptyOpt);
      const currentSpeakerVal = !isAdd && row && row[col] ? String(row[col] || "").trim() : "";
      penceramahList.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.kod || "";
        opt.textContent = p.namaPenuh || p.kod || "";
        opt.dataset.imageCode = p.kod || "";
        opt.dataset.kitab = p.kitab || "";
        if (currentSpeakerVal === (p.kod || "") || currentSpeakerVal === (p.namaPenuh || "")) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
      if (currentSpeakerVal && !penceramahList.some((p) => (p.kod || "") === currentSpeakerVal || (p.namaPenuh || "") === currentSpeakerVal)) {
        const opt = document.createElement("option");
        opt.value = currentSpeakerVal;
        opt.textContent = currentSpeakerVal + " (legacy)";
        opt.selected = true;
        opt.dataset.imageCode = "";
        opt.dataset.kitab = "";
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        const sel = select.options[select.selectedIndex];
        const kitabStr = sel?.dataset?.kitab || "";
        const titleContainer = form.querySelector("#kuliah-title-checkbox-container");
        if (titleContainer) {
          titleContainer.innerHTML = "";
          const hiddenTitle = form.querySelector("#field-title");
          if (hiddenTitle) hiddenTitle.value = "";
          if (kitabStr) {
            const kitabArr = kitabStr.split(",").map((s) => s.trim()).filter(Boolean);
            const updateTitleHidden = () => {
              const checked = titleContainer.querySelectorAll('input[type="checkbox"]:checked');
              hiddenTitle.value = Array.from(checked).map((cb) => cb.value).join(",");
            };
            kitabArr.forEach((k) => {
              const labelWrap = document.createElement("label");
              labelWrap.style.display = "flex";
              labelWrap.style.alignItems = "center";
              labelWrap.style.gap = "6px";
              labelWrap.style.cursor = "pointer";
              labelWrap.style.marginRight = "12px";
              const cb = document.createElement("input");
              cb.type = "checkbox";
              cb.value = k;
              cb.addEventListener("change", updateTitleHidden);
              const span = document.createElement("span");
              span.textContent = k;
              labelWrap.appendChild(cb);
              labelWrap.appendChild(span);
              titleContainer.appendChild(labelWrap);
            });
          }
        }
      });
      group.appendChild(label);
      group.appendChild(select);
      form.appendChild(group);
      return;
    }

    // Kuliah speakerId: tiada dalam dialog - image diurus dalam Penceramah (auto dari speaker terpilih)
    if (currentFileName === "kuliah" && col === "speakerId") {
      return; // Skip - tiada input image; speakerId di-resolve dari penceramah semasa save
    }

    // Special handling untuk title (kitab) dalam kuliah table: checkbox array
    if (currentFileName === "kuliah" && col === "title") {
      label.textContent = "Nama Kitab / Tajuk Kuliah";
      const currentTitleVal = !isAdd && row && row[col] ? String(row[col] || "").trim() : "";
      const selectedKitab = new Set(currentTitleVal ? currentTitleVal.split(",").map((s) => s.trim()).filter(Boolean) : []);
      const titleContainer = document.createElement("div");
      titleContainer.id = "kuliah-title-checkbox-container";
      titleContainer.style.display = "flex";
      titleContainer.style.flexWrap = "wrap";
      titleContainer.style.gap = "8px 16px";
      titleContainer.style.alignItems = "center";
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentTitleVal;
      const currentSpeakerField = form.querySelector("#field-speaker");
      let hasCheckboxes = false;
      if (currentSpeakerField) {
        const selOpt = currentSpeakerField.options[currentSpeakerField.selectedIndex];
        const kitabStr = selOpt?.dataset?.kitab || "";
        if (kitabStr) {
          const kitabArr = kitabStr.split(",").map((s) => s.trim()).filter(Boolean);
          kitabArr.forEach((k) => {
            hasCheckboxes = true;
            const labelWrap = document.createElement("label");
            labelWrap.style.display = "flex";
            labelWrap.style.alignItems = "center";
            labelWrap.style.gap = "6px";
            labelWrap.style.cursor = "pointer";
            labelWrap.style.marginRight = "12px";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = k;
            cb.checked = selectedKitab.has(k);
            cb.addEventListener("change", () => {
              const checked = titleContainer.querySelectorAll('input[type="checkbox"]:checked');
              hiddenInput.value = Array.from(checked).map((c) => c.value).join(",");
            });
            const span = document.createElement("span");
            span.textContent = k;
            labelWrap.appendChild(cb);
            labelWrap.appendChild(span);
            titleContainer.appendChild(labelWrap);
          });
        }
      }
      if (!hasCheckboxes && currentTitleVal) {
        const legacyInput = document.createElement("input");
        legacyInput.type = "text";
        legacyInput.className = "form-control";
        legacyInput.value = currentTitleVal;
        legacyInput.placeholder = "Tajuk / Kitab (legacy)";
        legacyInput.style.marginTop = "8px";
        legacyInput.addEventListener("input", () => { hiddenInput.value = legacyInput.value; });
        titleContainer.appendChild(legacyInput);
      }
      if (titleContainer.children.length === 0) {
        const placeholder = document.createElement("span");
        placeholder.textContent = "Pilih penceramah terlebih dahulu";
        placeholder.style.color = "#6b7280";
        placeholder.style.fontSize = "14px";
        titleContainer.appendChild(placeholder);
      }
      group.appendChild(label);
      group.appendChild(titleContainer);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk week dalam kuliah table: radio button (w1-w4)
    if (currentFileName === "kuliah" && col === "week") {
      label.textContent = "Minggu";

      const WEEK_OPTIONS = [
        { value: "w1", label: "Minggu 1" },
        { value: "w2", label: "Minggu 2" },
        { value: "w3", label: "Minggu 3" },
        { value: "w4", label: "Minggu 4" },
        { value: "w5", label: "Minggu 5" },
      ];

      const currentVal =
        !isAdd && row && row[col] ? String(row[col]).trim() : "";

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px 16px";

      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal || "w1";

      WEEK_OPTIONS.forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";
        wrap.style.textWrap = "nowrap";

        const rb = document.createElement("input");
        rb.type = "radio";
        rb.name = "kuliah-week";
        rb.value = opt.value;
        rb.checked = (currentVal || "w1") === opt.value;
        rb.addEventListener("change", () => {
          if (rb.checked) hiddenInput.value = opt.value;
        });

        const span = document.createElement("span");
        span.textContent = opt.label;

        wrap.appendChild(rb);
        wrap.appendChild(span);
        container.appendChild(wrap);
      });

      group.appendChild(label);
      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk type dalam kuliah table: radio button (ks/km/kd/kk)
    if (currentFileName === "kuliah" && col === "type") {
      label.textContent = "Jenis Kuliah";

      const TYPE_OPTIONS = [
        { value: "ks", label: "KS - Kuliah Subuh" },
        { value: "km", label: "KM - Kuliah Maghrib" },
        { value: "kd", label: "KD - Kuliah Dhuha" },
        { value: "kk", label: "KK - Kuliah Khas" },
      ];

      const currentVal =
        !isAdd && row && row[col] ? String(row[col]).trim() : "";

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px 16px";

      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal || "km";

      TYPE_OPTIONS.forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";

        const rb = document.createElement("input");
        rb.type = "radio";
        rb.name = "kuliah-type";
        rb.value = opt.value;
        rb.checked = (currentVal || "km") === opt.value;
        rb.addEventListener("change", () => {
          if (rb.checked) hiddenInput.value = opt.value;
        });

        const span = document.createElement("span");
        span.textContent = opt.label;

        wrap.appendChild(rb);
        wrap.appendChild(span);
        container.appendChild(wrap);
      });

      group.appendChild(label);
      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk day dalam kuliah table: radio button (h0-h6)
    if (currentFileName === "kuliah" && col === "day") {
      label.textContent = "Hari";

      const DAY_OPTIONS = [
        { value: "h0", label: "Ahad" },
        { value: "h1", label: "Isnin" },
        { value: "h2", label: "Selasa" },
        { value: "h3", label: "Rabu" },
        { value: "h4", label: "Khamis" },
        { value: "h5", label: "Jumaat" },
        { value: "h6", label: "Sabtu" },
      ];

      const currentVal =
        !isAdd && row && row[col] ? String(row[col]).trim() : "";

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "8px 16px";

      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal || "h0";

      DAY_OPTIONS.forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";

        const rb = document.createElement("input");
        rb.type = "radio";
        rb.name = "kuliah-day";
        rb.value = opt.value;
        rb.checked = (currentVal || "h0") === opt.value;
        rb.addEventListener("change", () => {
          if (rb.checked) hiddenInput.value = opt.value;
        });

        const span = document.createElement("span");
        span.textContent = opt.label;

        wrap.appendChild(rb);
        wrap.appendChild(span);
        container.appendChild(wrap);
      });

      group.appendChild(label);
      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk column image dalam slides table: dropdown pilih image + preview
    if (currentFileName === "slides" && col === "image") {
      const wrap = document.createElement("div");
      const previewContainer = document.createElement("div");
      previewContainer.className = "image-preview-container";
      previewContainer.style.marginBottom = "12px";
      const previewImg = document.createElement("img");
      previewImg.id = `slides-image-preview-${col}`;
      previewImg.className = "image-preview";
      previewImg.style.maxWidth = "200px";
      previewImg.style.maxHeight = "160px";
      previewImg.style.borderRadius = "8px";
      previewImg.style.border = "1px solid #e5e7eb";
      previewImg.style.objectFit = "cover";
      previewImg.style.display = "none";
      previewImg.alt = "Preview";
      previewContainer.appendChild(previewImg);

      const select = document.createElement("select");
      select.id = `field-${col}`;
      select.name = col;
      select.className = "form-control";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "-- Pilih image --";
      select.appendChild(emptyOpt);
      const currentVal = !isAdd && row[col] ? (row[col] || "").trim() : "";
      const codesAdded = new Set([""]);
      imagesList.forEach((im) => {
        const code = (im.imageCode || "").trim();
        if (codesAdded.has(code)) return;
        codesAdded.add(code);
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = code;
        if (currentVal === code) opt.selected = true;
        select.appendChild(opt);
      });
      if (currentVal && !codesAdded.has(currentVal)) {
        const opt = document.createElement("option");
        opt.value = currentVal;
        opt.textContent = currentVal + " (tiada dalam Images)";
        opt.selected = true;
        select.appendChild(opt);
      }
      const updatePreview = () => {
        const code = select.value.trim();
        const found = imagesList.find(
          (r) => (r.imageCode || "").trim() === code,
        );
        if (found && found.imagePath) {
          const path = found.imagePath;
          const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : BASE_URL + "/images/clientA";
          const part = window.Config.resolveImagePathForUrl ? window.Config.resolveImagePathForUrl(path) : path.replace(/^\/images\/?/, "").replace(/^images\//, "");
          previewImg.src = path.startsWith("http") ? path : `${base}/${part}`;
          previewImg.style.display = "block";
        } else {
          previewImg.removeAttribute("src");
          previewImg.style.display = "none";
        }
      };
      select.addEventListener("change", updatePreview);
      updatePreview();

      wrap.appendChild(previewContainer);
      wrap.appendChild(select);
      group.appendChild(label);
      group.appendChild(wrap);
      form.appendChild(group);
      return;
    }

    // Special handling untuk column checkbox dalam slides: pilihan overlay (tiada label "Checkbox", no wrap, selari dengan Sembunyikan slide)
    if (currentFileName === "slides" && col === "checkbox") {
      const CHECKBOX_OPTIONS = [
        { value: "date", label: "Tarikh" },
        { value: "solat-time", label: "Waktu solat penuh" },
        { value: "solat-time-small", label: "Waktu solat seterusnya" },
        { value: "marquee", label: "Hebahan bar" },
      ];
      const currentVal =
        !isAdd && row[col] ? String(row[col] || "").trim() : "";
      const selectedSet = new Set(
        currentVal
          ? currentVal
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      );

      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = currentVal;

      const container = document.createElement("div");
      container.className = "checkbox-group slides-dialog-checkbox-row";
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "16px 20px";
      container.style.alignItems = "center";

      const updateHidden = (chkContainer) => {
        const checked = chkContainer.querySelectorAll(
          'input[type="checkbox"]:checked',
        );
        const vals = Array.from(checked)
          .map((cb) => cb.value)
          .filter(Boolean);
        hiddenInput.value = vals.join(",");
      };

      CHECKBOX_OPTIONS.forEach((opt) => {
        const labelWrap = document.createElement("label");
        labelWrap.className = "slides-dialog-checkbox-row";
        labelWrap.style.display = "inline-flex";
        labelWrap.style.alignItems = "center";
        labelWrap.style.gap = "6px";
        labelWrap.style.cursor = "pointer";
        labelWrap.style.whiteSpace = "nowrap";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = opt.value;
        cb.checked = selectedSet.has(opt.value);
        cb.addEventListener("change", () => updateHidden(container));
        const span = document.createElement("span");
        span.textContent = opt.label;
        span.style.whiteSpace = "nowrap";
        labelWrap.appendChild(cb);
        labelWrap.appendChild(span);
        container.appendChild(labelWrap);
      });

      group.appendChild(container);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk column hide dalam slides: selari dengan checkbox Paparan
    if (currentFileName === "slides" && col === "hide") {
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      const isHidden = !isAdd && (row[col] === "1" || row[col] === true);
      hiddenInput.value = isHidden ? "1" : "0";
      const labelWrap = document.createElement("label");
      labelWrap.className = "slides-dialog-checkbox-row";
      labelWrap.style.display = "inline-flex";
      labelWrap.style.alignItems = "center";
      labelWrap.style.gap = "8px";
      labelWrap.style.cursor = "pointer";
      labelWrap.style.whiteSpace = "nowrap";
      const cb = document.createElement("input");
      cb.style.width = "auto";
      cb.type = "checkbox";
      cb.checked = isHidden;
      cb.addEventListener("change", () => {
        hiddenInput.value = cb.checked ? "1" : "0";
      });
      const span = document.createElement("span");
      span.textContent = "Sembunyikan slide";
      span.style.whiteSpace = "nowrap";
      labelWrap.appendChild(cb);
      labelWrap.appendChild(span);
      group.appendChild(labelWrap);
      group.appendChild(hiddenInput);
      form.appendChild(group);
      return;
    }

    // Special handling untuk column image dalam slideshow table:
    // - Dialog hanya pilih file + preview
    // - Upload dibuat semasa Save (rujuk setting/js/api.js)
    if (currentFileName === "slideshow" && col === "image") {
      label.textContent = "Image (pilih fail, kemudian klik Save)";
      const uploadContainer = document.createElement("div");
      uploadContainer.className = "image-upload-container";
      const previewContainer = document.createElement("div");
      previewContainer.className = "image-preview-container";
      previewContainer.style.marginBottom = "12px";
      const previewImg = document.createElement("img");
      previewImg.id = `image-preview-${col}`;
      previewImg.className = "image-preview";
      previewImg.style.maxWidth = "200px";
      previewImg.style.maxHeight = "200px";
      previewImg.style.borderRadius = "8px";
      previewImg.style.border = "1px solid #e5e7eb";
      previewImg.style.display = "none";
      previewImg.style.objectFit = "cover";
      const initialPreview = { src: "", visible: false };
      if (!isAdd && row[col]) {
        const imageUrl = row[col].startsWith("/")
          ? `${BASE_URL}${row[col]}`
          : `${BASE_URL}${row[col]}`;
        previewImg.src = imageUrl;
        previewImg.style.display = "block";
        initialPreview.src = imageUrl;
        initialPreview.visible = true;
      }
      previewImg.onerror = function () {
        this.style.display = "none";
      };
      previewContainer.appendChild(previewImg);
      const fileWrapper = document.createElement("div");
      fileWrapper.style.position = "relative";
      fileWrapper.style.width = "100%";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = `file-${col}`;
      fileInput.accept = "image/*";
      fileInput.className = "form-control";
      fileInput.style.marginBottom = "8px";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.title = "Kosongkan pilihan fail";
      clearBtn.innerHTML = "&times;";
      clearBtn.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-70%);background:none;color:#dc2626;border:none;cursor:pointer;font-size:20px;line-height:1;padding:0;display:none;align-items:center;justify-content:center;";
      clearBtn.onclick = () => {
        fileInput.value = "";
        clearBtn.style.display = "none";
        if (initialPreview.visible && initialPreview.src) {
          previewImg.src = initialPreview.src;
          previewImg.style.display = "block";
        } else {
          previewImg.src = "";
          previewImg.style.display = "none";
        }
      };
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        clearBtn.style.display = file ? "flex" : "none";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(file);
      });
      fileWrapper.appendChild(fileInput);
      fileWrapper.appendChild(clearBtn);
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;
      hiddenInput.value = isAdd ? "" : row[col] || "";
      uploadContainer.appendChild(previewContainer);
      uploadContainer.appendChild(fileWrapper);
      uploadContainer.appendChild(hiddenInput);
      group.appendChild(label);
      group.appendChild(uploadContainer);
      form.appendChild(group);
      return;
    }

    // Special handling untuk validFrom/validTo dalam slideshow: date input (optional) + butang clear
    if (
      currentFileName === "slideshow" &&
      (col === "validFrom" || col === "validTo")
    ) {
      label.textContent =
        col === "validFrom"
          ? "Valid From (pilihan, YYYY-MM-DD)"
          : "Valid To (pilihan, YYYY-MM-DD)";
      const input = document.createElement("input");
      input.type = "date";
      input.id = `field-${col}`;
      input.name = col;
      input.value = isAdd ? "" : row[col] || "";
      input.className = "form-control";
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.gap = "8px";
      wrapper.style.alignItems = "center";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.textContent = "Clear";
      clearBtn.className = "btn-cancel";
      clearBtn.style.padding = "6px 12px";
      clearBtn.style.flexShrink = "0";
      clearBtn.onclick = () => {
        input.value = "";
      };
      wrapper.appendChild(input);
      wrapper.appendChild(clearBtn);
      group.appendChild(label);
      group.appendChild(wrapper);
      form.appendChild(group);
      return;
    }

    // Hebahan: input dengan butang clear X merah di dalam inputbox
    if (
      currentFileName === "hebahan" &&
      (col === "text" || col === "startDate" || col === "endDate")
    ) {
      const input = document.createElement("input");
      input.type = col === "startDate" || col === "endDate" ? "date" : "text";
      input.id = `field-${col}`;
      input.name = col;
      input.value = isAdd ? "" : row[col] || "";
      input.className = "form-control";
      input.style.paddingRight = "36px";
      input.style.boxSizing = "border-box";
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.title = "Kosongkan";
      clearBtn.innerHTML = "&times;";
      clearBtn.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;color:#dc2626;border:none;cursor:pointer;font-size:20px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;";
      clearBtn.style.display = input.value ? "flex" : "none";
      clearBtn.onclick = () => {
        input.value = "";
        clearBtn.style.display = "none";
        input.focus();
      };
      input.addEventListener("input", () => {
        clearBtn.style.display = input.value ? "flex" : "none";
      });
      input.addEventListener("change", () => {
        clearBtn.style.display = input.value ? "flex" : "none";
      });
      wrapper.appendChild(input);
      wrapper.appendChild(clearBtn);
      group.appendChild(label);
      group.appendChild(wrapper);
      form.appendChild(group);
      return;
    }

    // Special handling untuk imagePath dalam images table (path diset auto via upload/download)
    if (currentFileName === "images" && col === "imagePath") {
      label.textContent = "Imej";
      // Image upload section
      const uploadContainer = document.createElement("div");
      uploadContainer.className = "image-upload-container";

      // Flag ringkas: image changed (untuk edit)
      const imgChg = document.createElement("input");
      imgChg.type = "hidden";
      imgChg.id = "field-imgChg";
      imgChg.name = "imgChg";
      imgChg.value = "0";
      uploadContainer.appendChild(imgChg);

      // Image preview
      const previewContainer = document.createElement("div");
      previewContainer.className = "image-preview-container";
      previewContainer.style.marginBottom = "12px";

      const previewImg = document.createElement("img");
      previewImg.id = `image-preview-${col}`;
      previewImg.className = "image-preview";
      previewImg.style.maxWidth = "200px";
      previewImg.style.maxHeight = "200px";
      previewImg.style.borderRadius = "8px";
      previewImg.style.border = "1px solid #e5e7eb";
      previewImg.style.display = "none";
      previewImg.style.objectFit = "cover";

      // Set preview image jika ada value
      if (!isAdd && row[col]) {
        const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : BASE_URL + "/images/clientA";
        const part = window.Config.resolveImagePathForUrl ? window.Config.resolveImagePathForUrl(row[col]) : String(row[col]).replace(/^\/images\/?/, "").replace(/^images\//, "");
        previewImg.src = row[col].startsWith("http") ? row[col] : `${base}/${part}`;
        previewImg.style.display = "block";
      }

      previewImg.onerror = function () {
        this.style.display = "none";
      };

      previewContainer.appendChild(previewImg);
      uploadContainer.appendChild(previewContainer);

      // Category selector untuk upload
      const categorySelect = document.createElement("select");
      categorySelect.id = `category-${col}`;
      categorySelect.className = "form-control";
      categorySelect.style.marginBottom = "8px";

      // Detect category dari existing path (untuk edit mode)
      const backgroundMode = typeof window !== "undefined" && window.__BACKGROUND_MODE__ === true;
      let defaultCategory = backgroundMode ? "slides" : "penceramah";
      if (!isAdd && row[col]) {
        if (
          row[col].includes("/images/slides/") ||
          row[col].includes("images/slides/")
        ) {
          defaultCategory = "slides";
        }
      }

      if (backgroundMode) {
        categorySelect.innerHTML = `<option value="slides" selected>Slides</option>`;
        categorySelect.disabled = true;
        categorySelect.style.opacity = "0.85";
        categorySelect.title = "Tab Background hanya guna folder slides";
        categorySelect.style.display = "none";
      } else {
        categorySelect.innerHTML = `
                  <option value="penceramah" ${defaultCategory === "penceramah" ? "selected" : ""}>Penceramah</option>
                  <option value="slides" ${defaultCategory === "slides" ? "selected" : ""}>Slides</option>
              `;
      }

      // Hidden input untuk imagePath value (path diset auto via upload/download, tidak tunjuk kepada user)
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.id = `field-${col}`;
      hiddenInput.name = col;

      // Set default value berdasarkan category untuk add mode
      if (isAdd) {
        // Default value berdasarkan defaultCategory (default: penceramah)
        const defaultPath =
          defaultCategory === "slides"
            ? "/images/slides/noimage.png"
            : "/images/penceramah/Random_user.svg";
        hiddenInput.value = defaultPath;
      } else {
        hiddenInput.value = row[col] || "";
      }

      // File input + clear (X merah) untuk pilih image (upload dibuat semasa Save)
      const initialPreview = { src: previewImg.src || "", visible: previewImg.style.display === "block" };
      const fileWrapper = document.createElement("div");
      fileWrapper.style.position = "relative";
      fileWrapper.style.width = "100%";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = `file-${col}`;
      fileInput.accept = "image/*";
      fileInput.className = "form-control";
      fileInput.style.marginBottom = "8px";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.title = "Kosongkan pilihan fail";
      clearBtn.innerHTML = "&times;";
      clearBtn.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-70%);background:none;color:#dc2626;border:none;cursor:pointer;font-size:20px;line-height:1;padding:0;display:none;align-items:center;justify-content:center;";
      clearBtn.onclick = () => {
        fileInput.value = "";
        clearBtn.style.display = "none";
        imgChg.value = "0";
        if (initialPreview.visible && initialPreview.src) {
          previewImg.src = initialPreview.src;
          previewImg.style.display = "block";
        } else {
          previewImg.src = "";
          previewImg.style.display = "none";
        }
      };
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        clearBtn.style.display = file ? "flex" : "none";
        if (!file) {
          imgChg.value = "0";
          return;
        }
        imgChg.value = "1";
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(file);
      });
      fileWrapper.appendChild(fileInput);
      fileWrapper.appendChild(clearBtn);

      uploadContainer.appendChild(categorySelect);
      uploadContainer.appendChild(fileWrapper);
      uploadContainer.appendChild(hiddenInput);

      group.appendChild(label);
      group.appendChild(uploadContainer);
      form.appendChild(group);
    } else {
      // Normal input untuk column lain
      let inputElement = null;

      // Special handling for long fields
      if (
        col === "image" ||
        col === "raw" ||
        (!isAdd && row[col] && row[col].length > 100)
      ) {
        const textarea = document.createElement("textarea");
        textarea.id = `field-${col}`;
        textarea.name = col;
        textarea.value = isAdd ? "" : row[col] || "";
        textarea.className = "form-control";

        // Auto uppercase untuk textarea di pengumuman juga
        if (currentFileName === "announcements" && col !== "datetime") {
          if (textarea.value) {
            textarea.value = textarea.value.toUpperCase();
          }

          textarea.addEventListener("input", (e) => {
            const cursorPos = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(cursorPos, cursorPos);
          });

          textarea.addEventListener("paste", (e) => {
            setTimeout(() => {
              const cursorPos = e.target.selectionStart;
              e.target.value = e.target.value.toUpperCase();
              e.target.setSelectionRange(cursorPos, cursorPos);
            }, 0);
          });
        }

        inputElement = textarea;
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.id = `field-${col}`;
        input.name = col;
        input.value = isAdd ? "" : row[col] || "";
        input.className = "form-control";

        // Set default values untuk type (add mode)
        if (isAdd && col === "type") {
          if (currentFileName === "announcements") input.value = "PENGUMUMAN";
        }

        // Slides: duration = number (saat)
        if (currentFileName === "slides" && col === "duration") {
          input.type = "number";
          input.min = "0";
          input.step = "1";
        }

        // Countdowns: format dropdown
        if (currentFileName === "countdowns" && col === "format") {
          const select = document.createElement("select");
          select.id = "field-format";
          select.name = "format";
          select.className = "form-control";
          const fmt =
            !isAdd && row[col] ? (row[col] || "date").toLowerCase() : "date";
          [
            // { value: 'date', label: 'Tarikh tetap (COUNTDOWN|YYYY-MM-DD|event|windowDays)' },
            // { value: 'masihi', label: 'Masihi ulang tahun (COUNTDOWN_MASIHI|bulan|hari|event|windowDays)' },
            // { value: 'hijri', label: 'Hijri ulang tahun (COUNTDOWN_HIJRI|tahun|bulan|hari|event|windowDays)' }
            { value: "date", label: "Tarikh tetap" },
            { value: "masihi", label: "Masihi ulang tahun" },
            { value: "hijri", label: "Hijri ulang tahun" },
          ].forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (fmt === opt.value) o.selected = true;
            select.appendChild(o);
          });
          group.appendChild(label);
          group.appendChild(select);
          form.appendChild(group);
          select.addEventListener("change", () => {
            const v = select.value;
            form.querySelectorAll("[data-cd-date]").forEach((el) => {
              el.style.display = v === "date" ? "" : "none";
            });
            form.querySelectorAll("[data-cd-range]").forEach((el) => {
              el.style.display = v === "masihi" || v === "hijri" ? "" : "none";
            });
            form.querySelectorAll("[data-cd-hijri]").forEach((el) => {
              el.style.display = v === "hijri" ? "" : "none";
            });
          });
          return;
        }
        if (col === "date" && currentFileName === "countdowns") {
          group.setAttribute("data-cd-date", "1");
          const fmt =
            !isAdd && row.format
              ? (row.format || "date").toLowerCase()
              : "date";
          if (fmt !== "date") group.style.display = "none";
          input.type = "date";
          if (!isAdd && row[col]) {
            const raw = String(row[col]).trim();
            const datePart = raw.split(" ")[0];
            if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart))
              input.value = datePart;
          }
        }
        if (col === "tahun" && currentFileName === "countdowns") {
          group.setAttribute("data-cd-range", "1");
          group.setAttribute("data-cd-hijri", "1");
          const fmt =
            !isAdd && row.format
              ? (row.format || "date").toLowerCase()
              : "date";
          if (fmt !== "hijri") group.style.display = "none";
          input.type = "number";
          input.placeholder = "Kosong = setiap tahun";
          input.min = "1440";
          input.max = "1500";
        }
        if (col === "bulan" && currentFileName === "countdowns") {
          group.setAttribute("data-cd-range", "1");
          const fmt =
            !isAdd && row.format
              ? (row.format || "date").toLowerCase()
              : "date";
          if (fmt === "date") group.style.display = "none";
          input.type = "number";
          input.min = "1";
          input.max = "12";
          input.placeholder = "1-12 (10=Syawal)";
        }
        if (col === "hari" && currentFileName === "countdowns") {
          group.setAttribute("data-cd-range", "1");
          const fmt =
            !isAdd && row.format
              ? (row.format || "date").toLowerCase()
              : "date";
          if (fmt === "date") group.style.display = "none";
          input.placeholder = "1-31 (Masihi) atau 1-30 (Hijri)";
        }
        if (col === "windowDays" && currentFileName === "countdowns") {
          input.type = "number";
          input.min = "0";
          input.placeholder =
            "Contoh: 0 = selalu, 30 = tunjuk bila tinggal 30 hari atau kurang";
        }

        // Tukar kepada datetime-local untuk datetime field
        if (col === "datetime" && currentFileName === "announcements") {
          input.type = "datetime-local";
          // Convert "YYYY-MM-DD HH:MM" to "YYYY-MM-DDTHH:MM" untuk datetime-local
          if (!isAdd && row[col]) {
            input.value = row[col].replace(" ", "T");
          }
        }

        // Hebahan: startDate dan endDate gunakan type date
        if (
          (col === "startDate" || col === "endDate") &&
          currentFileName === "hebahan"
        ) {
          input.type = "date";
          if (!isAdd && row[col]) {
            input.value = row[col];
          }
        }

        // Special handling untuk date field dalam kuliah-override: date input
        if (col === "date" && currentFileName === "kuliah-override") {
          input.type = "date";
          // Convert DD-MM-YYYY to YYYY-MM-DD for date input
          if (!isAdd && row[col]) {
            const dateParts = row[col].split("-");
            if (dateParts.length === 3) {
              input.value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }
          }
        }
        // Kuliah-batal: tahun (nombor, pilihan)
        if (col === "tahun" && currentFileName === "kuliah-override") {
          input.type = "number";
          input.placeholder = "Kosong = setiap tahun";
          input.min = "2020";
          input.max = "2040";
        }
        // Kuliah-batal: bulan (1-12)
        if (col === "bulan" && currentFileName === "kuliah-override") {
          input.type = "number";
          input.min = "1";
          input.max = "12";
          input.placeholder = "1-12";
        }
        // Kuliah-batal: hari (range atau senarai)
        if (col === "hari" && currentFileName === "kuliah-override") {
          input.placeholder = "cth: 1-30 atau 1,2,3,5";
        }
        // Kuliah-batal: replace dropdown (0/1)
        if (col === "replace" && currentFileName === "kuliah-override") {
          const selectReplace = document.createElement("select");
          selectReplace.id = `field-${col}`;
          selectReplace.name = col;
          selectReplace.className = "form-control";
          const rv = !isAdd && row[col] != null ? String(row[col]).trim() : "0";
          [
            { value: "0", label: "0 - Papar DITANGGUH" },
            { value: "1", label: "1 - Ganti dengan catatan" },
          ].forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (rv === opt.value) o.selected = true;
            selectReplace.appendChild(o);
          });
          group.appendChild(label);
          group.appendChild(selectReplace);
          form.appendChild(group);
          return;
        }
        // Kuliah-override: showAnnounce dropdown (0/1) - paparkan di announcement
        if (col === "showAnnounce" && currentFileName === "kuliah-override") {
          const selectShow = document.createElement("select");
          selectShow.id = `field-${col}`;
          selectShow.name = col;
          selectShow.className = "form-control";
          const sv = !isAdd && row[col] != null ? String(row[col]).trim() : "0";
          [
            { value: "0", label: "0 - Tidak" },
            { value: "1", label: "1 - Ya (paparkan di Pengumuman)" },
          ].forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (sv === opt.value) o.selected = true;
            selectShow.appendChild(o);
          });
          group.appendChild(label);
          group.appendChild(selectShow);
          form.appendChild(group);
          return;
        }

        // Special handling untuk type field dalam kuliah-override: checkbox (ks, kd, km, kk) -> simpan sebagai kd,ks
        if (col === "type" && currentFileName === "kuliah-override") {
          const TYPE_OPTIONS = [
            { value: "ks", label: "KS - Kuliah Subuh" },
            { value: "kd", label: "KD - Kuliah Dhuha" },
            { value: "km", label: "KM - Kuliah Maghrib" },
            { value: "kk", label: "KK - Kuliah Khas" },
          ];
          const currentVal = !isAdd && row[col] ? (row[col] || "").trim() : "";
          const currentParts = currentVal
            ? currentVal
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.id = `field-${col}`;
          hidden.name = col;
          hidden.value = currentVal;

          const wrapper = document.createElement("div");
          wrapper.className = "kuliah-type-checkboxes";
          wrapper.style.display = "flex";
          wrapper.style.flexWrap = "wrap";
          wrapper.style.gap = "12px 16px";
          wrapper.style.alignItems = "center";

          TYPE_OPTIONS.forEach((opt) => {
            const labelEl = document.createElement("label");
            labelEl.style.display = "inline-flex";
            labelEl.style.alignItems = "center";
            labelEl.style.cursor = "pointer";
            labelEl.style.marginRight = "4px";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.name = `type-${opt.value}`;
            cb.value = opt.value;
            cb.dataset.type = opt.value;
            cb.checked = currentParts.includes(opt.value);
            cb.addEventListener("change", () => {
              const checked = wrapper.querySelectorAll(
                'input[type="checkbox"]:checked',
              );
              hidden.value = Array.from(checked)
                .map((c) => c.value)
                .join(",");
            });
            labelEl.appendChild(cb);
            labelEl.appendChild(document.createTextNode(" " + opt.label));
            wrapper.appendChild(labelEl);
          });

          group.appendChild(label);
          group.appendChild(hidden);
          group.appendChild(wrapper);
          form.appendChild(group);
          return;
        }

        // Auto uppercase untuk semua text input di pengumuman (kecuali datetime)
        if (currentFileName === "announcements" && col !== "datetime") {
          // Convert existing value kepada uppercase
          if (input.value) {
            input.value = input.value.toUpperCase();
          }

          // Auto convert semasa user menaip
          input.addEventListener("input", (e) => {
            const cursorPos = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(cursorPos, cursorPos);
          });

          // Auto convert semasa paste
          input.addEventListener("paste", (e) => {
            setTimeout(() => {
              const cursorPos = e.target.selectionStart;
              e.target.value = e.target.value.toUpperCase();
              e.target.setSelectionRange(cursorPos, cursorPos);
            }, 0);
          });
        }

        inputElement = input;
      }

      group.appendChild(label);
      group.appendChild(inputElement);
      form.appendChild(group);
    }
  });

  // Petugas: bahagian Gambar pilihan (upload + preview) – guna slug untuk lookup dalam images.txt
  if (currentFileName === "petugas") {
    const originalSlug = !isAdd && row && row.slug ? String(row.slug || "").trim() : "";
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.textContent = "Gambar (pilihan)";
    const changeFlag = document.createElement("input");
    changeFlag.type = "hidden";
    changeFlag.id = "field-changeImage";
    changeFlag.name = "changeImage";
    changeFlag.value = "0";
    const uploadContainer = document.createElement("div");
    uploadContainer.style.display = "flex";
    uploadContainer.style.flexDirection = "column";
    uploadContainer.style.gap = "8px";
    const previewContainer = document.createElement("div");
    previewContainer.className = "image-preview-container";
    previewContainer.style.marginTop = "6px";
    const previewImg = document.createElement("img");
    previewImg.id = "petugas-image-preview";
    previewImg.className = "image-preview";
    previewImg.style.maxWidth = "160px";
    previewImg.style.maxHeight = "160px";
    previewImg.style.borderRadius = "8px";
    previewImg.style.border = "1px solid #e5e7eb";
    previewImg.style.objectFit = "cover";
    previewImg.style.display = "none";
    previewImg.alt = "Preview";
    const API_URL = typeof window !== "undefined" && window.Config ? window.Config.API_URL : "";
    const BASE_URL = typeof window !== "undefined" && window.Config ? window.Config.BASE_URL : (API_URL ? API_URL.replace(/\/api\/?$/, "") : "");
    const updatePreviewFromSlug = (slug) => {
      const trimmed = (slug || "").trim();
      if (!trimmed) { previewImg.removeAttribute("src"); previewImg.style.display = "none"; return; }
      const found = (imagesList || []).find((im) => (im.imageCode || "").trim() === trimmed);
      const pathVal = found && found.imagePath ? found.imagePath : null;
      if (pathVal) {
        const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : BASE_URL + "/images/clientA";
        const part = window.Config.resolveImagePathForUrl ? window.Config.resolveImagePathForUrl(pathVal) : pathVal.replace(/^\/images\/?/, "").replace(/^images\//, "");
        previewImg.src = pathVal.startsWith("http") ? pathVal : `${base}/${part}`;
        previewImg.style.display = "block";
      } else {
        previewImg.src = (window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : BASE_URL + "/images/clientA") + "/imambilal/Random_user.svg";
        previewImg.style.display = "block";
      }
    };
    if (originalSlug) updatePreviewFromSlug(originalSlug);
    previewContainer.appendChild(previewImg);
    const fileWrapper = document.createElement("div");
    fileWrapper.style.position = "relative";
    fileWrapper.style.width = "100%";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "file-petugas-gambar";
    fileInput.accept = "image/*";
    fileInput.className = "form-control";
    fileInput.style.marginTop = "4px";
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        changeFlag.value = "0";
        if (originalSlug) updatePreviewFromSlug(originalSlug);
        else { previewImg.removeAttribute("src"); previewImg.style.display = "none"; }
        return;
      }
      changeFlag.value = "1";
      const reader = new FileReader();
      reader.onload = (ev) => { previewImg.src = ev.target.result; previewImg.style.display = "block"; };
      reader.readAsDataURL(file);
    });
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset ke gambar asal";
    resetBtn.className = "btn-cancel";
    resetBtn.style.marginTop = "4px";
    resetBtn.style.alignSelf = "flex-start";
    if (isAdd) resetBtn.style.display = "none";
    resetBtn.onclick = () => {
      fileInput.value = "";
      changeFlag.value = "0";
      if (originalSlug) updatePreviewFromSlug(originalSlug);
      else { previewImg.removeAttribute("src"); previewImg.style.display = "none"; }
    };
    fileWrapper.appendChild(fileInput);
    uploadContainer.appendChild(changeFlag);
    uploadContainer.appendChild(previewContainer);
    uploadContainer.appendChild(fileWrapper);
    uploadContainer.appendChild(resetBtn);
    group.appendChild(label);
    group.appendChild(uploadContainer);
    form.appendChild(group);
  }

  // Penceramah: bahagian Gambar (upload + preview) – tiada kolum imageCode, guna kod untuk lookup
  if (currentFileName === "penceramah") {
    const originalCode = !isAdd && row && row.kod ? String(row.kod || "").trim() : "";
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.textContent = "Gambar";
    const changeFlag = document.createElement("input");
    changeFlag.type = "hidden";
    changeFlag.id = "field-changeImage";
    changeFlag.name = "changeImage";
    changeFlag.value = "0";
    const uploadContainer = document.createElement("div");
    uploadContainer.style.display = "flex";
    uploadContainer.style.flexDirection = "column";
    uploadContainer.style.gap = "8px";
    const previewContainer = document.createElement("div");
    previewContainer.className = "image-preview-container";
    previewContainer.style.marginTop = "6px";
    const previewImg = document.createElement("img");
    previewImg.id = "penceramah-image-preview";
    previewImg.className = "image-preview";
    previewImg.style.maxWidth = "160px";
    previewImg.style.maxHeight = "160px";
    previewImg.style.borderRadius = "8px";
    previewImg.style.border = "1px solid #e5e7eb";
    previewImg.style.objectFit = "cover";
    previewImg.style.display = "none";
    previewImg.alt = "Preview";
    const API_URL = typeof window !== "undefined" && window.Config ? window.Config.API_URL : "";
    const BASE_URL = typeof window !== "undefined" && window.Config ? window.Config.BASE_URL : (API_URL ? API_URL.replace(/\/api\/?$/, "") : "");
    const updatePreviewFromCode = (code) => {
      const trimmed = (code || "").trim();
      if (!trimmed) { previewImg.removeAttribute("src"); previewImg.style.display = "none"; return; }
      const found = (imagesList || []).find((im) => (im.imageCode || "").trim() === trimmed);
      const pathVal = found && found.imagePath ? found.imagePath : `penceramah/${trimmed}`;
      const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : BASE_URL + "/images/clientA";
      const part = window.Config.resolveImagePathForUrl ? window.Config.resolveImagePathForUrl(pathVal) : pathVal.replace(/^\/images\/?/, "").replace(/^images\//, "");
      previewImg.src = pathVal.startsWith("http") ? pathVal : `${base}/${part}`;
      previewImg.style.display = "block";
    };
    if (originalCode) updatePreviewFromCode(originalCode);
    previewContainer.appendChild(previewImg);
    const fileWrapper = document.createElement("div");
    fileWrapper.style.position = "relative";
    fileWrapper.style.width = "100%";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "file-imageCode";
    fileInput.accept = "image/*";
    fileInput.className = "form-control";
    fileInput.style.marginTop = "4px";
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        changeFlag.value = "0";
        if (originalCode) updatePreviewFromCode(originalCode);
        else { previewImg.removeAttribute("src"); previewImg.style.display = "none"; }
        return;
      }
      changeFlag.value = "1";
      const reader = new FileReader();
      reader.onload = (ev) => { previewImg.src = ev.target.result; previewImg.style.display = "block"; };
      reader.readAsDataURL(file);
    });
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset ke gambar asal";
    resetBtn.className = "btn-cancel";
    resetBtn.style.marginTop = "4px";
    resetBtn.style.alignSelf = "flex-start";
    if (isAdd) resetBtn.style.display = "none";
    resetBtn.onclick = () => {
      fileInput.value = "";
      changeFlag.value = "0";
      if (originalCode) updatePreviewFromCode(originalCode);
      else { previewImg.removeAttribute("src"); previewImg.style.display = "none"; }
    };
    fileWrapper.appendChild(fileInput);
    uploadContainer.appendChild(changeFlag);
    uploadContainer.appendChild(previewContainer);
    uploadContainer.appendChild(fileWrapper);
    uploadContainer.appendChild(resetBtn);
    group.appendChild(label);
    group.appendChild(uploadContainer);
    form.appendChild(group);
  }
}

/**
 * Open add dialog (untuk tambah entry baru)
 */
export async function openAddDialog() {
  const currentFileName = getCurrentFileName();
  const currentColumns = getCurrentColumns();

  // Allow add untuk announcements, countdowns, images, slideshow, hebahan, kuliah, kuliah-override, livestream, penceramah, petugas, jadual-petugas
  if (
    currentFileName !== "announcements" &&
    currentFileName !== "countdowns" &&
    currentFileName !== "images" &&
    currentFileName !== "slideshow" &&
    currentFileName !== "hebahan" &&
    currentFileName !== "kuliah" &&
    currentFileName !== "kuliah-override" &&
    currentFileName !== "livestream" &&
    currentFileName !== "penceramah" &&
    currentFileName !== "petugas" &&
    currentFileName !== "jadual-petugas"
  ) {
    showNotification("✗ Fungsi tambah tidak tersedia untuk tab ini","error");
    return;
  }

  // Check jika columns sudah loaded (untuk pastikan table sudah dimuat)
  if (!currentColumns || currentColumns.length === 0) {
    showNotification("✗ Sila tunggu data dimuat terlebih dahulu", "error");
    return;
  }

  setAddMode(true);
  setEditingRowId(null);

  // Load imagesList dan penceramahList untuk kuliah; imagesList untuk petugas
  let imagesList = [];
  let penceramahList = [];
  if (currentFileName === "kuliah") {
    try {
      const result = await fetchData("penceramah");
      penceramahList = result.data || [];
    } catch (e) {
      console.warn("Could not load kuliah data:", e);
    }
  }
  if (currentFileName === "petugas" || currentFileName === "penceramah") {
    try {
      const result = await fetchData("images");
      imagesList = (result.data || []).filter((im) =>
        (im.imagePath || "").includes("/penceramah/"),
      );
    } catch (e) {
      console.warn("Could not load images for " + currentFileName + ":", e);
    }
  }
  let petugasList = [];
  if (currentFileName === "jadual-petugas") {
    try {
      const result = await fetchData("petugas");
      petugasList = result.data || [];
    } catch (e) {
      console.warn("Could not load petugas for jadual:", e);
    }
  }

  const dialog = document.getElementById("edit-dialog");
  const form = document.getElementById("edit-form");
  const title = document.getElementById("dialog-title");

  // Set title berdasarkan file type
  if (currentFileName === "announcements") {
    title.textContent = "Tambah Pengumuman Baru";
  } else if (currentFileName === "countdowns") {
    title.textContent = "Tambah Countdown Baru";
  } else if (currentFileName === "images") {
    title.textContent = "Tambah Image Baru";
  } else if (currentFileName === "slideshow") {
    title.textContent = "Tambah Slideshow Baru";
  } else if (currentFileName === "hebahan") {
    title.textContent = "Tambah Hebahan Baru";
  } else if (currentFileName === "kuliah") {
    title.textContent = "Tambah Kuliah Baru";
  } else if (currentFileName === "kuliah-override") {
    title.textContent = "Tambah Rekod Override Kuliah";
  } else if (currentFileName === "penceramah") {
    title.textContent = "Tambah Penceramah";
  } else if (currentFileName === "petugas") {
    title.textContent = "Tambah Petugas";
  } else if (currentFileName === "jadual-petugas") {
    title.textContent = "Tambah Jadual Petugas";
  }

  form.innerHTML = "";

  createFormFields(form, null, true, { imagesList, penceramahList, petugasList });

  dialog.style.display = "flex";
  dialog.classList.remove("hidden");
}

/**
 * Open edit dialog
 * @param {number} rowId - ID row untuk diedit
 */
export async function openEditDialog(rowId) {
  setAddMode(false);
  setEditingRowId(rowId);

  const row = findRowById(rowId);

  if (!row) {
    showNotification("✗ Baris tidak dijumpai", "error");
    return;
  }

  const currentFileName = getCurrentFileName();
  let imagesList = [];
  let penceramahList = [];
  let petugasList = [];
  if (currentFileName === "slides" || currentFileName === "penceramah" || currentFileName === "petugas") {
    try {
      const result = await fetchData("images");
      let list = result.data || [];
      if (currentFileName === "slides") {
        list = list.filter((im) => (im.imagePath || "").includes("/slides/"));
      } else if (currentFileName === "penceramah" || currentFileName === "petugas") {
        list = list.filter((im) =>
          (im.imagePath || "").includes("/penceramah/"),
        );
      }
      imagesList = list;
    } catch (e) {
      console.warn(`Could not load data for ${currentFileName}:`, e);
    }
  }
  if (currentFileName === "kuliah") {
    try {
      const result = await fetchData("penceramah");
      penceramahList = result.data || [];
    } catch (e) {
      console.warn("Could not load penceramah for kuliah:", e);
    }
  }
  if (currentFileName === "jadual-petugas") {
    try {
      const result = await fetchData("petugas");
      petugasList = result.data || [];
    } catch (e) {
      console.warn("Could not load petugas for jadual:", e);
    }
  }

  const dialog = document.getElementById("edit-dialog");
  const form = document.getElementById("edit-form");
  const title = document.getElementById("dialog-title");
  if (currentFileName === "announcements") {
    title.textContent = "Edit Pengumuman";
  } else if (currentFileName === "countdowns") {
    title.textContent = "Edit Countdown";
  } else if (currentFileName === "hebahan") {
    title.textContent = "Edit Hebahan";
  } else {
    title.textContent = `Edit Baris #${rowId}`;
  }
  form.innerHTML = "";

  createFormFields(form, row, false, { imagesList, penceramahList, petugasList });

  dialog.style.display = "flex";
  dialog.classList.remove("hidden");
}

/**
 * Close dialog
 */
export function closeDialog() {
  const dialog = document.getElementById("edit-dialog");
  dialog.style.display = "none";
  dialog.classList.add("hidden");
  setEditingRowId(null);
  setAddMode(false);
}

// Export untuk browser environment
if (typeof window !== "undefined") {
  window.DialogUtils = {
    openAddDialog,
    openEditDialog,
    closeDialog,
  };
}
