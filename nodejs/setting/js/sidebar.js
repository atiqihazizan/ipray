/**
 * Sidebar & Tab Navigation Controller
 * Mengurus navigasi sidebar + tab utama dalam panel setting.
 */

import { loadTabContent } from "./tab-loader.js";
import { loadTable } from "./table.js";

const VALID_TABS = [
  "config",
  // "slides",
  "slideshow",
  "kuliah",
  "announcements",
  // "hebahan",
  "countdowns",
  "background",
  // "takwim",
  "kematian",
  "livestream",
  "imam-bilal",
];

const pageTitles = {
  config: { icon: "⚙️", name: "Tetapan" },
  // slides: { icon: "🖼️", name: "Template" },
  slideshow: { icon: "🎬", name: "Slideshow" },
  kuliah: { icon: "📚", name: "Kuliah" },
  // images: { icon: "🖼️", name: "Galeri" },
  announcements: { icon: "📢", name: "Pengumuman" },
  // hebahan: { icon: "📰", name: "Hebahan" },
  countdowns: { icon: "⏳", name: "Countdown" },
  // takwim: { icon: "📅", name: "Takwim" },
  background: { icon: "🖼️", name: "Background" },
  kematian: { icon: "🕌", name: "Kematian" },
  livestream: { icon: "📹", name: "Siaran Langsung" },
  // penceramah: { icon: "🎤", name: "Penceramah" },
  // petugas: { icon: "👥", name: "Petugas" },
  // "jadual-petugas": { icon: "📅", name: "Jadual Petugas" },
  "imam-bilal": { icon: "👥", name: "Imam & Bilal" },
};

/**
 * Tukar tab utama (public API – bound ke window.showTab untuk HTML onclick).
 * @param {string} tabName
 * @param {boolean} [updateHash=true]
 */
export async function navigateToTab(tabName, updateHash = true) {
  // Keserasian: tab lama `kuliah-override` kini berada dalam Kuliah → Ganti Kuliah
  const kuliahSubTab = tabName === "kuliah-override" ? "ganti" : "jadual";
  if (tabName === "kuliah-override") {
    tabName = "kuliah";
  }

  if (updateHash) {
    history.replaceState(null, "", `#${tabName}`);
  }

  // Remove active class from semua item sidebar
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Load HTML tab ke dalam container
  await loadTabContent(tabName);

  // Config: load sub-tab jika perlu
  if (
    tabName === "config" &&
    typeof window.loadConfigSubTabIfNeeded === "function"
  ) {
    window.loadConfigSubTabIfNeeded();
  }

  // Aktifkan item menu yang berkaitan
  const activeMenuItem = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeMenuItem) {
    activeMenuItem.classList.add("active");
  }

  // Update tajuk halaman
  const pageInfo = pageTitles[tabName];
  if (pageInfo) {
    const pageIcon = document.getElementById("page-icon");
    const pageName = document.getElementById("page-name");
    if (pageIcon) pageIcon.textContent = pageInfo.icon;
    if (pageName) pageName.textContent = pageInfo.name;
  }

  // Tutup sidebar pada mobile
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      sidebar.classList.remove("open");
    }
  }

  // Load data mengikut jenis tab (salin logik lama dari table.js)
  if (tabName === "config") {
    if (typeof window.loadConfigData === "function") {
      window.loadConfigData();
    }
  } else if (tabName === "images") {
    if (typeof window.GalleryUtils?.loadGallery === "function") {
      window.GalleryUtils.loadGallery();
    }
  } else if (tabName === "kematian") {
    const now = new Date();
    const dateEl = document.getElementById("kematian-tarikh");
    const timeEl = document.getElementById("kematian-masa");
    if (dateEl && !dateEl.value) {
      dateEl.value = now.toISOString().slice(0, 10);
    }
    if (timeEl && !timeEl.value) {
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      timeEl.value = `${hh}:${mm}`;
    }
    if (typeof window.loadConfigData === "function") {
      await window.loadConfigData();
    }
    if (typeof window.loadKematianOverlayConfig === "function") {
      window.loadKematianOverlayConfig();
    }
  } else if (tabName === "livestream") {
    if (typeof window.loadConfigData === "function") {
      await window.loadConfigData();
    }
    if (typeof window.loadLivestreamOverlayConfig === "function") {
      window.loadLivestreamOverlayConfig();
    }
    loadTable("livestream");
  } else if (tabName === "imam-bilal") {
    if (typeof window.showImamBilalTab === "function") {
      window.showImamBilalTab("jadual-petugas");
    }
  } else if (tabName === "background") {
    if (typeof window.loadBackgroundTable === "function") {
      window.loadBackgroundTable();
    }
  } else if (tabName === "kuliah") {
    if (typeof window.showKuliahTab === "function") {
      window.showKuliahTab(kuliahSubTab);
    } else {
      loadTable("kuliah");
    }
  } else if (tabName === "countdowns") {
    if (typeof window.showCountdownsTab === "function") {
      window.showCountdownsTab("senarai");
    } else {
      loadTable("countdowns");
    }
  } else {
    loadTable(tabName);
  }
}

/**
 * Kawal tab dalaman panel Imam & Bilal dan muatkan table berkaitan.
 * Dipindahkan dari main.js.
 * @param {"jadual-petugas"|"petugas"} tabId
 */
export function showImamBilalTab(tabId) {
  const panels = ["jadual-petugas", "petugas"];
  panels.forEach((id) => {
    const panel = document.getElementById(`imam-bilal-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(
      `[data-imam-bilal-tab="${id}"]`,
    );
    if (btn) btn.classList.toggle("active", id === tabId);
  });
  if (typeof window.loadTable === "function") {
    window.loadTable(tabId);
  }
}

/**
 * Inisialisasi event navigasi sidebar (dipanggil selepas sidebar HTML dimuat).
 */
export function initSidebarNavigation() {
  const sidebarMenu = document.querySelector(".sidebar-menu");
  if (!sidebarMenu) return;

  sidebarMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".menu-item[data-tab]");
    if (!item) return;
    const tab = item.getAttribute("data-tab");
    if (!tab) return;
    e.preventDefault();
    navigateToTab(tab, true);
  });
}

/**
 * Baca URL hash dan buka tab berkenaan (untuk restore selepas reload).
 */
export function restoreTabFromHash() {
  const hash = window.location.hash.replace("#", "").trim();
  const tab = VALID_TABS.includes(hash) ? hash : "config";
  navigateToTab(tab, false);
}

// Eksport ke global untuk keserasian HTML inline (onclick="showTab('...')")
if (typeof window !== "undefined") {
  window.showTab = navigateToTab;
  window.showImamBilalTab = showImamBilalTab;
}

