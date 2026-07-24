/**
 * Main Application Entry Point (Cloud Setting Panel)
 * Initialize dan setup event listeners
 */

import "./tab-loader.js";
import { loadSidebar } from "./sidebar-loader.js";
import { initSocket } from "./cloud-socket.js";
import { initSidebarNavigation, restoreTabFromHash } from "./sidebar.js";
import { loadTable } from "./table.js";
import { closeDialog } from "./dialog.js";
import { saveRow, reorderSlideshow } from "./cloud-api.js";
import { loadGallery } from "./gallery.js";

function setupEventListeners() {
  const editDialog = document.getElementById("edit-dialog");
  if (editDialog) {
    editDialog.addEventListener("click", (e) => {
      if (e.target.id === "edit-dialog") {
        closeDialog();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDialog();
    }
  });
}

async function initApp() {
  await loadSidebar();
  initSidebarNavigation();
  initSocket();
  setupEventListeners();
  restoreTabFromHash();
}

window.addEventListener("DOMContentLoaded", () => {
  initApp();
});

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
