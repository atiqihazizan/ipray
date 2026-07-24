/**
 * Main Application Entry Point
 * Initialize dan setup event listeners
 */

import "./tab-loader.js";
import { loadSidebar } from "./sidebar-loader.js";
import { initSocket } from "./socket.js";
import { initSidebarNavigation, restoreTabFromHash } from "./sidebar.js";
import { loadTable } from "./table.js";
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

/**
 * Initialize aplikasi
 */
async function initApp() {
  await loadSidebar();
  initSidebarNavigation();
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
  window.loadTable = loadTable;
  window.saveRow = saveRow;
  window.closeDialog = closeDialog;
  window.openAddDialog = window.DialogUtils.openAddDialog;
  window.openEditDialog = window.DialogUtils.openEditDialog;
  window.deleteRow = window.ApiUtils.deleteRow;
  window.reorderSlideshow = reorderSlideshow;
  window.loadGallery = loadGallery;
}
