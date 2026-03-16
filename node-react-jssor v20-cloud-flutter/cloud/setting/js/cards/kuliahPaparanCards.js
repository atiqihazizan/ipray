/**
 * Komponen kad untuk Kuliah → List Paparan.
 * Fail ini hanya bina DOM & inline editor; fetch data & state kekal di table.js.
 */

/**
 * Render kad Kuliah Paparan dengan editor inline.
 * @param {Object} opts
 * @param {HTMLElement} opts.gridEl
 * @param {Array<object>} opts.data - Row slides (kuliahHari/Weekly/Bulanan; duration dalam saat)
 * @param {Array<object>} opts.imagesList
 * @param {string} opts.BASE_URL
 * @param {Function} opts.resolveSlideImagePath
 * @param {Function} opts.updateSlideRow - API inline update
 */
export function renderKuliahPaparanCards({
  gridEl,
  data,
  imagesList,
  BASE_URL,
  resolveSlideImagePath,
  updateSlideRow,
}) {
  if (!gridEl) return;

  const paparanLabels = {
    date: "Tarikh",
    "solat-time": "Waktu solat",
    "solat-time-small": "Masa kecil",
    marquee: "Hebahan bar",
  };

  const editorLabels = {
    date: "Tarikh",
    "solat-time": "Waktu solat penuh",
    "solat-time-small": "Waktu solat seterusnya",
    marquee: "Hebahan bar",
  };

  const slidesOnlyImages = (imagesList || []).filter((im) =>
    String(im.imagePath || "").includes("/slides/"),
  );

  const debouncers = new Map();

  const formatPaparanText = (checkboxVal) => {
    const checkboxStr = (checkboxVal || "").trim();
    const set = checkboxStr
      ? new Set(
          checkboxStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : new Set();
    const parts = [];
    if (set.has("date")) parts.push(paparanLabels.date);
    if (set.has("solat-time")) parts.push(paparanLabels["solat-time"]);
    if (set.has("solat-time-small"))
      parts.push(paparanLabels["solat-time-small"]);
    if (set.has("marquee")) parts.push(paparanLabels.marquee);
    return parts.length ? `Paparan: ${parts.join(", ")}` : "Paparan: —";
  };

  gridEl.innerHTML = "";

  data.forEach((row) => {
    const card = document.createElement("div");
    card.className = "gallery-card slides-card";
    card.setAttribute("data-row-id", row.id);

    const imageUrl = resolveSlideImagePath(row.image, imagesList, BASE_URL);

    const imgWrap = document.createElement("div");
    imgWrap.className = "slides-card-img-wrap";
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = row.image || "";
    img.loading = "lazy";
    img.onerror = function () {
      const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : (BASE_URL || "") + "/images/clientA"; this.src = `${base}/noimage.png`;
      this.onerror = null;
    };
    imgWrap.appendChild(img);

    const header = document.createElement("div");
    header.className = "slides-card-header";
    const headerTitle = document.createElement("span");
    headerTitle.className = "slides-card-header-title";
    headerTitle.textContent = row.type || "Kuliah";
    header.appendChild(headerTitle);

    const footer = document.createElement("div");
    footer.className = "gallery-footer slides-card-footer";

    const metaWrap = document.createElement("div");
    metaWrap.className = "slides-card-meta";

    const durationLabel = document.createElement("span");
    durationLabel.className = "slides-card-duration";
    const durVal = row.duration != null ? String(row.duration).trim() : "";
    durationLabel.textContent = durVal ? `${durVal} s` : "—";
    durationLabel.title = "Tempoh";
    metaWrap.appendChild(durationLabel);

    const paparanRow = document.createElement("div");
    paparanRow.className = "slides-card-paparan";
    paparanRow.title = "Paparan overlay";
    paparanRow.textContent = formatPaparanText(row.checkbox);
    metaWrap.appendChild(paparanRow);

    footer.appendChild(metaWrap);

    // Inline editor (tanpa modal): update serta-merta + auto-save
    const editor = document.createElement("div");
    editor.className = "slides-card-inline-editor";

    const row1 = document.createElement("div");
    row1.className = "slides-card-inline-row";

    const imageField = document.createElement("div");
    imageField.className = "slides-card-inline-field";
    const imageLabel = document.createElement("label");
    imageLabel.className = "slides-card-inline-label";
    imageLabel.textContent = "Imej";
    const imageSelect = document.createElement("select");
    imageSelect.className = "slides-card-inline-select";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-- Pilih imej --";
    imageSelect.appendChild(emptyOpt);
    const curImage = (row.image || "").trim();
    const codesAdded = new Set([""]);
    slidesOnlyImages.forEach((im) => {
      const code = (im.imageCode || "").trim();
      if (!code || codesAdded.has(code)) return;
      codesAdded.add(code);
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      if (curImage === code) opt.selected = true;
      imageSelect.appendChild(opt);
    });
    if (curImage && !codesAdded.has(curImage)) {
      const opt = document.createElement("option");
      opt.value = curImage;
      opt.textContent = `${curImage} (tiada dalam Images)`;
      opt.selected = true;
      imageSelect.appendChild(opt);
    }
    imageField.appendChild(imageLabel);
    imageField.appendChild(imageSelect);

    const durationField = document.createElement("div");
    durationField.className = "slides-card-inline-field";
    const durationLabelEl = document.createElement("label");
    durationLabelEl.className = "slides-card-inline-label";
    durationLabelEl.textContent = "Tempoh (s)";
    const durationInput = document.createElement("input");
    durationInput.className = "slides-card-inline-input";
    durationInput.type = "number";
    durationInput.min = "0";
    durationInput.step = "1";
    durationInput.value = durVal || "";
    durationField.appendChild(durationLabelEl);
    durationField.appendChild(durationInput);

    row1.appendChild(imageField);
    row1.appendChild(durationField);

    const row2 = document.createElement("div");
    row2.className = "slides-card-inline-row";

    const checkboxField = document.createElement("div");
    checkboxField.className =
      "slides-card-inline-field slides-card-inline-field--wide";
    const checkboxLabel = document.createElement("div");
    checkboxLabel.className = "slides-card-inline-label";
    checkboxLabel.textContent = "Paparan";
    const checkboxWrap = document.createElement("div");
    checkboxWrap.className = "slides-card-inline-checkboxes";
    const checkboxStr = (row.checkbox || "").trim();
    const selectedSet = new Set(
      checkboxStr
        ? checkboxStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    ["date", "solat-time", "solat-time-small", "marquee"].forEach((key) => {
      const labelWrap = document.createElement("label");
      labelWrap.className = "slides-card-inline-checkbox";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = key;
      cb.checked = selectedSet.has(key);
      const span = document.createElement("span");
      span.textContent = editorLabels[key] || key;
      labelWrap.appendChild(cb);
      labelWrap.appendChild(span);
      checkboxWrap.appendChild(labelWrap);
    });
    checkboxField.appendChild(checkboxLabel);
    checkboxField.appendChild(checkboxWrap);

    const hideField = document.createElement("div");
    hideField.className = "slides-card-inline-field";
    const hideLabel = document.createElement("div");
    hideLabel.className = "slides-card-inline-label";
    hideLabel.textContent = "Sembunyikan";
    const hideWrap = document.createElement("label");
    hideWrap.className = "slides-card-inline-toggle";
    const hideCb = document.createElement("input");
    hideCb.type = "checkbox";
    hideCb.checked = row.hide === "1";
    const hideSpan = document.createElement("span");
    hideSpan.textContent = "Slide";
    hideWrap.appendChild(hideCb);
    hideWrap.appendChild(hideSpan);
    hideField.appendChild(hideLabel);
    hideField.appendChild(hideWrap);

    row2.appendChild(checkboxField);
    row2.appendChild(hideField);

    const status = document.createElement("div");
    status.className = "slides-card-inline-status";
    status.textContent = "";

    editor.appendChild(row1);
    editor.appendChild(row2);
    editor.appendChild(status);
    footer.appendChild(editor);

    const setStatus = (text, kind) => {
      status.textContent = text || "";
      status.dataset.kind = kind || "";
    };

    const getCheckboxValue = () => {
      const checked = checkboxWrap.querySelectorAll(
        'input[type="checkbox"]:checked',
      );
      return Array.from(checked)
        .map((c) => c.value)
        .filter(Boolean)
        .join(",");
    };

    const optimisticUpdate = () => {
      const nextImage = (imageSelect.value || "").trim();
      const nextDuration = (durationInput.value || "").trim();
      const nextCheckbox = getCheckboxValue();
      const nextHide = hideCb.checked ? "1" : "0";

      const nextImageUrl = resolveSlideImagePath(
        nextImage,
        imagesList,
        BASE_URL,
      );
      img.src = nextImageUrl;
      img.alt = nextImage;

      durationLabel.textContent = nextDuration ? `${nextDuration} s` : "—";
      paparanRow.textContent = formatPaparanText(nextCheckbox);

      return {
        image: nextImage,
        duration: nextDuration,
        checkbox: nextCheckbox,
        hide: nextHide,
      };
    };

    const scheduleSave = () => {
      const id = row.id;
      if (debouncers.has(id)) clearTimeout(debouncers.get(id));
      setStatus("Menyimpan…", "saving");
      const nextPartial = optimisticUpdate();
      debouncers.set(
        id,
        setTimeout(async () => {
          const res =
            typeof updateSlideRow === "function"
              ? await updateSlideRow(id, nextPartial)
              : { ok: false };
          if (res && res.ok) setStatus("Disimpan", "saved");
          else setStatus("Ralat simpan", "error");
        }, 320),
      );
    };

    imageSelect.addEventListener("change", scheduleSave);
    durationInput.addEventListener("input", scheduleSave);
    checkboxWrap.addEventListener("change", scheduleSave);
    hideCb.addEventListener("change", scheduleSave);

    card.appendChild(header);
    card.appendChild(imgWrap);
    card.appendChild(footer);
    gridEl.appendChild(card);
  });
}

