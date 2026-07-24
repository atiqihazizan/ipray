/**
 * Komponen kad untuk tab Template (slides).
 * Fail ini hanya bina DOM; fetch data & state kekal di table.js.
 */

/**
 * Render semua kad slides ke dalam grid.
 * @param {Object} opts
 * @param {HTMLElement} opts.gridEl - Elemen grid sasaran
 * @param {Array<object>} opts.data - Senarai row slides (duration dalam saat)
 * @param {Array<object>} opts.imagesList - Senarai images untuk resolve kod imej
 * @param {string} opts.BASE_URL - Base URL untuk imej fallback
 * @param {Object} opts.Icons - Peta ikon SVG
 * @param {Function} opts.resolveSlideImagePath - Helper resolve imej
 * @param {Function} opts.toggleSlideHide - Fungsi untuk hide/show slide
 * @param {Function} opts.openEditDialog - Fungsi buka dialog edit
 * @param {Function} opts.showTab - Fungsi tukar tab setting
 */
export function renderSlidesCards({
  gridEl,
  data,
  imagesList,
  BASE_URL,
  Icons,
  resolveSlideImagePath,
  toggleSlideHide,
  openEditDialog,
  showTab,
}) {
  if (!gridEl) return;

  const paparanLabels = {
    date: "Tarikh",
    "solat-time": "Waktu solat",
    "solat-time-small": "Masa kecil",
  };

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

  const navTitles = {
    announcements: "Pengumuman",
    countdowns: "Undur Detik",
    kuliah: "Kuliah",
    slideshow: "Slideshow",
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
      const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : (BASE_URL || "") + "/storage/clientA/images"; this.src = `${base}/noimage.png`;
      this.onerror = null;
    };
    imgWrap.appendChild(img);

    const header = document.createElement("div");
    header.className = "slides-card-header";
    const headerTitle = document.createElement("span");
    headerTitle.className = "slides-card-header-title";
    headerTitle.textContent = row.type || "Template";
    header.appendChild(headerTitle);
    const headerMore = document.createElement("span");
    headerMore.className = "slides-card-header-more";
    headerMore.textContent = "Tindakan";
    headerMore.title = "Edit atau navigasi";
    // header.appendChild(headerMore);

    const footer = document.createElement("div");
    footer.className = "gallery-footer slides-card-footer";

    const metaWrap = document.createElement("div");
    metaWrap.className = "slides-card-meta";

    const typeLabel = document.createElement("span");
    typeLabel.className = "slides-card-type";
    typeLabel.textContent = row.type || "—";
    typeLabel.title = "Jenis";
    metaWrap.appendChild(typeLabel);

    const durationLabel = document.createElement("span");
    durationLabel.className = "slides-card-duration";
    const durVal = row.duration != null ? String(row.duration).trim() : "";
    durationLabel.textContent = durVal ? `${durVal} s` : "—";
    durationLabel.title = "Tempoh";
    metaWrap.appendChild(durationLabel);

    const checkboxVal = (row.checkbox || "").trim();
    const paparanSet = checkboxVal
      ? new Set(
          checkboxVal
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : new Set();
    const paparanRow = document.createElement("div");
    paparanRow.className = "slides-card-paparan";
    paparanRow.title = "Paparan overlay";
    const paparanParts = [];
    if (paparanSet.has("date")) paparanParts.push(paparanLabels.date);
    if (paparanSet.has("solat-time"))
      paparanParts.push(paparanLabels["solat-time"]);
    if (paparanSet.has("solat-time-small"))
      paparanParts.push(paparanLabels["solat-time-small"]);
    paparanRow.textContent = paparanParts.length
      ? `Paparan: ${paparanParts.join(", ")}`
      : "Paparan: —";
    metaWrap.appendChild(paparanRow);

    footer.appendChild(metaWrap);

    const actions = document.createElement("ul");
    actions.className = "ant-card-actions semantic-mark-actions";

    const slideType = (row.type || "").trim();
    const targetTab =
      SLIDE_TYPE_TO_TAB[slideType] ||
      SLIDE_TYPE_TO_TAB[slideType.toLowerCase()];

    const liStyle = "width: 33.3333%;";

    const liSetting = document.createElement("li");
    const eyeState = row.hide === "1" ? Icons.eyeOff : Icons.eye;
    liSetting.setAttribute("style", liStyle);
    liSetting.title =
      row.hide === "1" ? "Klik untuk paparkan" : "Klik untuk sembunyikan";
    liSetting.innerHTML = `<span><span role="img" aria-label="setting" class="anticon anticon-setting">${eyeState}</span></span>`;
    liSetting.style.cursor = "pointer";
    liSetting.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof toggleSlideHide === "function") toggleSlideHide(row.id);
    });
    actions.appendChild(liSetting);

    const liEdit = document.createElement("li");
    liEdit.setAttribute("style", liStyle);
    liEdit.title = "Edit";
    liEdit.innerHTML = `<span><span role="img" aria-label="edit" class="anticon anticon-edit">${Icons.editAnt}</span></span>`;
    liEdit.style.cursor = "pointer";
    liEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof openEditDialog === "function") openEditDialog(row.id);
    });
    actions.appendChild(liEdit);

    const liEllipsis = document.createElement("li");
    liEllipsis.setAttribute("style", liStyle);
    liEllipsis.title = targetTab
      ? `Pergi ke ${navTitles[targetTab] || targetTab}`
      : "Lain-lain";
    liEllipsis.innerHTML = `<span><span role="img" aria-label="ellipsis" class="anticon anticon-ellipsis">${Icons.ellipsis}</span></span>`;
    liEllipsis.style.cursor = "pointer";
    liEllipsis.addEventListener("click", (e) => {
      e.stopPropagation();
      if (targetTab && typeof showTab === "function") showTab(targetTab);
    });
    actions.appendChild(liEllipsis);

    footer.appendChild(actions);
    card.appendChild(header);
    card.appendChild(imgWrap);
    card.appendChild(footer);
    gridEl.appendChild(card);
  });
}

