/**
 * Gallery Functions
 * Paparan grid kad imej dengan lightbox zoom untuk tab Galeri
 */

import {
  setCurrentFileName,
  setCurrentData,
  setCurrentColumns,
} from "./state.js";
import { showNotification } from "./notification.js";
import { fetchData } from "./cloud-socket.js";

const Icons = {
  pencil: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>`,
		trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 7a1 1 0 0 0-1 1v11.191A1.92 1.92 0 0 1 15.99 21H8.01A1.92 1.92 0 0 1 6 19.191V8a1 1 0 0 0-2 0v11.191A3.918 3.918 0 0 0 8.01 23h7.98A3.918 3.918 0 0 0 20 19.191V8a1 1 0 0 0-1-1Zm1-3h-4V2a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2ZM10 4V3h4v1Z"/><path d="M11 17v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Zm4 0v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Z"/></svg>`,
  setting: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z"></path></svg>`,
  editAnt: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"></path></svg>`,
  ellipsis: `<svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M176 511a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0z"></path></svg>`,
};

/**
 * Resolve URL penuh untuk imej (panel cloud: guna CLIENT_ID supaya server serve dari storage)
 */
function resolveImageUrl(imagePath) {
  const base = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : (window.Config.BASE_URL || "") + "/images/clientA";
  if (!imagePath) return `${base}/noimage.png`;
  if (imagePath.startsWith("http")) return imagePath;
  const pathPart = window.Config.resolveImagePathForUrl ? window.Config.resolveImagePathForUrl(imagePath) : imagePath.replace(/^\/images\/?/, "").replace(/^images\//, "");
  return `${base}/${pathPart}`;
}

/**
 * Bina satu kad imej
 */
function buildCard(row) {
  const imageBase = window.Config.getImageBaseUrl ? window.Config.getImageBaseUrl() : (window.Config.BASE_URL || "") + "/images/clientA";
  const imageUrl = resolveImageUrl(row.imagePath);
  const noimage = `${imageBase}/noimage.png`;

  const card = document.createElement("div");
  card.className = "gallery-card gallery-card--template-style";
  card.setAttribute("data-row-id", row.id);

  // -- Image wrapper (clickable → lightbox)
  const imgWrap = document.createElement("div");
  imgWrap.className = "gallery-img-wrap";
  imgWrap.title = "Klik untuk zoom";
  imgWrap.addEventListener("click", () =>
    openLightbox(imageUrl, row.imageCode, row.imagePath),
  );

  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = row.imageCode || "";
  img.loading = "lazy";
  img.onerror = function () {
    this.src = noimage;
    this.onerror = null;
  };
  imgWrap.appendChild(img);

  // -- Footer: meta (2 item) + action bar seperti template
  const footer = document.createElement("div");
  footer.className = "gallery-footer slides-card-footer";

  const metaWrap = document.createElement("div");
  metaWrap.className = "slides-card-meta";

  const codeLabel = document.createElement("span");
  codeLabel.className = "slides-card-type";
  codeLabel.textContent = row.imageCode || "—";
  codeLabel.title = "Kod imej";
  metaWrap.appendChild(codeLabel);

  // const pathLabel = document.createElement("span");
  // pathLabel.className = "slides-card-duration";
  // pathLabel.textContent = row.imagePath || "—";
  // pathLabel.title = "Lokasi / path";
  // metaWrap.appendChild(pathLabel);

  footer.appendChild(metaWrap);

  const actions = document.createElement("ul");
  actions.className = "ant-card-actions semantic-mark-actions";
  // const liStyle = "width: 33.3333%;";
  const liStyle = "width: 50%;";

  // const liPreview = document.createElement("li");
  // liPreview.setAttribute("style", liStyle);
  // liPreview.title = "Pratonton / Zoom";
  // liPreview.innerHTML = `<span><span role="img" aria-label="setting" class="anticon anticon-setting">${Icons.setting}</span></span>`;
  // liPreview.style.cursor = "pointer";
  // liPreview.addEventListener("click", (e) => {
  //   e.stopPropagation();
  //   openLightbox(imageUrl, row.imageCode, row.imagePath);
  // });
  // actions.appendChild(liPreview);

  const liEdit = document.createElement("li");
  liEdit.setAttribute("style", liStyle);
  liEdit.title = "Edit";
  liEdit.innerHTML = `<span><span role="img" aria-label="edit" class="anticon anticon-edit">${Icons.editAnt}</span></span>`;
  liEdit.style.cursor = "pointer";
  liEdit.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof window.openEditDialog === "function")
      window.openEditDialog(row.id);
  });
  actions.appendChild(liEdit);

  const liDelete = document.createElement("li");
  liDelete.setAttribute("style", liStyle);
  liDelete.className = "action-delete";
  liDelete.title = "Padam";
  liDelete.innerHTML = `<span><span role="img" aria-label="delete" class="anticon anticon-delete">${Icons.trash}</span></span>`;
  liDelete.style.cursor = "pointer";
  liDelete.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof window.deleteRow === "function") window.deleteRow(row.id);
  });
  actions.appendChild(liDelete);

  footer.appendChild(actions);

  card.appendChild(imgWrap);
  card.appendChild(footer);

  return card;
}

/**
 * Buka lightbox dengan imej yang dipilih
 */
function openLightbox(url, label, path) {
  let overlay = document.getElementById("gallery-lightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "gallery-lightbox";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" id="lightbox-close-btn" title="Tutup (Esc)">✕</button>
                <img id="lightbox-img" src="" alt="" />
                <div class="lightbox-label" id="lightbox-label"></div>
            </div>
        `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeLightbox();
    });
    document
      .getElementById("lightbox-close-btn")
      .addEventListener("click", closeLightbox);
  }

  document.getElementById("lightbox-img").src = url;
  document.getElementById("lightbox-label").textContent = label
    ? `${label}${path ? "  ·  " + path : ""}`
    : path || "";

  // Paksa reflow supaya animasi berjalan
  overlay.classList.remove("active");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add("active"));
  });

  // Escape key
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}

/**
 * Tutup lightbox
 */
function closeLightbox() {
  const overlay = document.getElementById("gallery-lightbox");
  if (overlay) {
    overlay.classList.remove("active");
    // Kosongkan src selepas animasi tutup
    setTimeout(() => {
      const img = document.getElementById("lightbox-img");
      if (img) img.src = "";
    }, 300);
  }
}

/**
 * Muat dan render galeri imej
 */
export async function loadGallery() {
  setCurrentFileName("images");

  const container = document.getElementById("gallery-grid");
  if (!container) return;

  container.innerHTML = '<div class="gallery-loading">Memuat gambar...</div>';

  try {
    const result = await fetchData('images');
    const data = result.data ?? [];

    setCurrentData(data);
    setCurrentColumns(result.columns ?? []);

    container.innerHTML = "";
    container.className = "gallery-grid gallery-grid--template-style";

    if (data.length === 0) {
      container.innerHTML =
        '<div class="gallery-empty">Tiada gambar dalam galeri. Tambah gambar baharu dengan butang ＋ di atas.</div>';
      return;
    }

    data.forEach((row) => {
      container.appendChild(buildCard(row));
    });
  } catch (error) {
    console.error("Error loading gallery:", error);
    container.innerHTML = `<div class="gallery-error">Ralat memuat galeri: ${error.message}</div>`;
    showNotification("✗ Gagal memuat galeri", "error");
  }
}

// Export untuk browser environment
if (typeof window !== "undefined") {
  window.GalleryUtils = {
    loadGallery,
    closeLightbox,
  };
}
