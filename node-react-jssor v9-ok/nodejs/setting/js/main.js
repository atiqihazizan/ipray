/**
 * Main Application Entry Point
 * Initialize dan setup event listeners
 */

import { initSocket } from './socket.js';
import { loadTable, showTab } from './table.js';
import { closeDialog } from './dialog.js';
import { saveRow } from './api.js';

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Close dialog on overlay click
    const editDialog = document.getElementById('edit-dialog');
    if (editDialog) {
        editDialog.addEventListener('click', (e) => {
            if (e.target.id === 'edit-dialog') {
                closeDialog();
            }
        });
    }
    
    // Close dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDialog();
        }
    });
}

/**
 * Initialize aplikasi
 */
function initApp() {
    initSocket();
    setupEventListeners();
    // Jika Config tab default aktif, muat panel Waktu Solat
    const configTab = document.getElementById('config-tab');
    if (configTab && configTab.classList.contains('active') && typeof window.loadConfigSubTabIfNeeded === 'function') {
        window.loadConfigSubTabIfNeeded();
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Export global functions untuk digunakan dalam HTML
if (typeof window !== 'undefined') {
    window.showTab = showTab;
    window.loadTable = loadTable;
    window.saveRow = saveRow;
    window.closeDialog = closeDialog;
    window.openAddDialog = window.DialogUtils.openAddDialog;
    window.openEditDialog = window.DialogUtils.openEditDialog;
    window.deleteRow = window.ApiUtils.deleteRow;
}
