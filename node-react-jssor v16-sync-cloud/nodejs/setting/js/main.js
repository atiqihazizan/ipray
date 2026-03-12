/**
 * Main Application Entry Point
 * Initialize dan setup event listeners
 */

import "./tab-loader.js";
import { loadSidebar } from "./sidebar-loader.js";
import { initSocket } from "./socket.js";
import { loadTable, showTab } from "./table.js";
import { closeDialog } from "./dialog.js";
import { saveRow, reorderSlideshow } from "./api.js";
import { loadGallery } from "./gallery.js";

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Close dialog on overlay click
  const editDialog = document.getElementById("edit-dialog");
  if (editDialog) {
    editDialog.addEventListener("click", (e) => {
      if (e.target.id === "edit-dialog") {
        closeDialog();
      }
    });
  }

  // Close dialog on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDialog();
    }
  });
}

/** Tab-tab yang sah */
const VALID_TABS = [
  "config",
  "slides",
  "slideshow",
  "kuliah",
  "kuliah-override",
  "penceramah",
  // "images",
  "announcements",
  "hebahan",
  "countdowns",
  "takwim",
  "kematian",
  "livestream",
  "petugas",
  "jadual-petugas",
  "imam-bilal",
];

/**
 * Tukar tab dalaman panel Imam & Bilal dan muatkan table berkaitan
 * @param {"jadual-petugas"|"petugas"} tabId
 */
function showImamBilalTab(tabId) {
  const panels = ["jadual-petugas", "petugas"];
  panels.forEach((id) => {
    const panel = document.getElementById(`imam-bilal-panel-${id}`);
    if (panel) {
      panel.style.display = id === tabId ? "flex" : "none";
      panel.style.flexDirection = id === tabId ? "column" : "";
    }
    const btn = document.querySelector(`[data-imam-bilal-tab="${id}"]`);
    if (btn) btn.classList.toggle("active", id === tabId);
  });
  if (window.TableUtils?.loadTable) {
    window.TableUtils.loadTable(tabId);
  }
}

/**
 * Baca URL hash dan buka tab berkenaan (untuk restore selepas reload)
 */
function restoreTabFromHash() {
  const hash = window.location.hash.replace("#", "").trim();
  const tab = VALID_TABS.includes(hash) ? hash : "config";
  // updateHash = false supaya tidak overwrite hash semasa restore
  showTab(tab, false);
}

/**
 * Initialize aplikasi
 */
async function initApp() {
  await loadSidebar();
  initSocket();
  setupEventListeners();
  restoreTabFromHash();
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  initApp();
});

// Export global functions untuk digunakan dalam HTML
if (typeof window !== "undefined") {
  window.showTab = showTab;
  window.loadTable = loadTable;
  window.saveRow = saveRow;
  window.closeDialog = closeDialog;
  window.openAddDialog = window.DialogUtils.openAddDialog;
  window.openEditDialog = window.DialogUtils.openEditDialog;
  window.deleteRow = window.ApiUtils.deleteRow;
  window.reorderSlideshow = reorderSlideshow;
  window.loadGallery = loadGallery;
  window.showImamBilalTab = showImamBilalTab;
}
