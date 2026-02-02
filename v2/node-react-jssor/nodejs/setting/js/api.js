/**
 * API Functions
 * Function untuk CRUD operations dengan backend API
 */

import { getCurrentFileName, getEditingRowId, isAddMode, getCurrentColumns, setLastEditedRowId } from './state.js';
import { showNotification } from './notification.js';
import { loadTable } from './table.js';
import { closeDialog } from './dialog.js';

/**
 * Reconstruct raw line based on file type
 * @param {string} fileName - Nama fail
 * @param {object} rowData - Data row
 * @returns {string} Raw line string
 */
function reconstructRawLine(fileName, rowData) {
    if (fileName === 'slides') {
        return `${rowData.type || ''}|${rowData.image || ''}|${rowData.duration || ''}|${rowData.checkbox || ''}`;
    } else if (fileName === 'kuliah') {
        return `${rowData.week || ''}|${rowData.day || ''}|${rowData.type || ''}|${rowData.speaker || ''}|${rowData.speakerId || ''}|${rowData.title || ''}`;
    } else if (fileName === 'kuliah-batal') {
        return `${rowData.date || ''}|${rowData.type || ''}|${rowData.notes || ''}`;
    } else if (fileName === 'images') {
        return `${rowData.imageCode || ''}|${rowData.imagePath || ''}`;
    } else if (fileName === 'announcements') {
        return `${rowData.type || ''}|${rowData.title || ''}|${rowData.speaker || ''}|${rowData.category || ''}|${rowData.datetime || ''}|${rowData.location || ''}|${rowData.audience || ''}`;
    } else if (fileName === 'config') {
        return `${rowData.key || ''}|${rowData.value || ''}`;
    } else if (fileName === 'takwim') {
        // Format: DD-MM-YYYY DD-MM-HHHH\tImsak\tSubuh\tSyuruk\tZohor\tAsar\tMaghrib\tIsyak
        const dateHijri = `${rowData.date || ''} ${rowData.hijri || ''}`.trim();
        const times = [
            rowData.imsak || '',
            rowData.subuh || '',
            rowData.syuruk || '',
            rowData.zohor || '',
            rowData.asar || '',
            rowData.maghrib || '',
            rowData.isyak || ''
        ];
        return [dateHijri, ...times].join('\t');
    } else if (fileName === 'slideshow') {
        return `${(rowData.caption || '').replace(/\t/g, ' ')}|${rowData.image || ''}`;
    }
    return '';
}

/**
 * Validate row data untuk announcements
 * @param {object} rowData - Data row
 * @returns {object} { valid: boolean, error: string }
 */
function validateAnnouncementData(rowData) {
    if (!rowData.type || !rowData.title || !rowData.datetime) {
        return { valid: false, error: 'Type, Title, dan Datetime wajib diisi' };
    }
    
    // Validate datetime format
    const parsedDate = DateUtils.parseDateTime(rowData.datetime);
    if (!parsedDate) {
        return { valid: false, error: 'Format datetime tidak sah. Guna: YYYY-MM-DD HH:MM' };
    }
    
    return { valid: true };
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
    currentColumns.forEach(col => {
        const field = document.getElementById(`field-${col}`);
        rowData[col] = field ? field.value.trim() : '';
    });
    
    // Convert datetime-local format (YYYY-MM-DDTHH:MM) to storage format (YYYY-MM-DD HH:MM)
    if (currentFileName === 'announcements' && rowData.datetime) {
        rowData.datetime = rowData.datetime.replace('T', ' ');
    }
    
    // Convert date input format (YYYY-MM-DD) to storage format (DD-MM-YYYY) untuk kuliah-batal
    if (currentFileName === 'kuliah-batal' && rowData.date) {
        const dateParts = rowData.date.split('-');
        if (dateParts.length === 3) {
            rowData.date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        }
    }
    
    // Convert semua text field kepada uppercase untuk announcements (kecuali datetime)
    if (currentFileName === 'announcements') {
        Object.keys(rowData).forEach(key => {
            if (key !== 'datetime' && key !== 'id' && typeof rowData[key] === 'string') {
                rowData[key] = rowData[key].toUpperCase();
            }
        });
    }
    
    // Validate untuk announcements
    if (currentFileName === 'announcements') {
        const validation = validateAnnouncementData(rowData);
        if (!validation.valid) {
            showNotification(`✗ ${validation.error}`, 'error');
            return;
        }
    }
    
    // Validate untuk images
    if (currentFileName === 'images') {
        if (!rowData.imageCode || !rowData.imagePath) {
            showNotification('✗ Image Code dan Image Path wajib diisi', 'error');
            return;
        }
    }

    // Validate untuk slideshow: image wajib (mesti upload sebelum save)
    if (currentFileName === 'slideshow') {
        if (!rowData.image || !rowData.image.trim()) {
            showNotification('✗ Image wajib. Sila upload image sebelum simpan.', 'error');
            return;
        }
    }
    
    // Validate untuk kuliah-batal: date dan type wajib
    if (currentFileName === 'kuliah-batal') {
        if (!rowData.date || !rowData.date.trim()) {
            showNotification('✗ Tarikh wajib diisi (format: DD-MM-YYYY)', 'error');
            return;
        }
        // Validate date format (basic check)
        const datePattern = /^\d{2}-\d{2}-\d{4}$/;
        if (!datePattern.test(rowData.date.trim())) {
            showNotification('✗ Format tarikh tidak betul. Gunakan format: DD-MM-YYYY (cth: 15-01-2025)', 'error');
            return;
        }
        if (!rowData.type || !rowData.type.trim()) {
            showNotification('✗ Type kuliah wajib dipilih', 'error');
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
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ row: rowData, position: 'end' }),
            });
        } else {
            // Update existing row - PUT request
            if (!editingRowId) return;
            
            response = await fetch(`${API_URL}/data/${currentFileName}/${editingRowId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ row: rowData }),
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showNotification(addMode ? '✓ Berjaya ditambah' : '✓ Berjaya dikemaskini', 'success');
        closeDialog();
        
        // Simpan row ID yang baru dikemaskini untuk scroll selepas reload
        if (addMode) {
            // Untuk add mode, row baru akan berada di akhir
            // Kita akan scroll ke akhir selepas reload
            setLastEditedRowId(null);
            setTimeout(() => {
                loadTable(currentFileName);
                // Scroll ke akhir selepas table reload
                setTimeout(() => {
                    const tbody = document.getElementById(`${currentFileName}-tbody`);
                    const tableContainer = tbody?.closest('.table-container');
                    if (tableContainer && tbody) {
                        const rows = tbody.querySelectorAll('tr[data-row-id]');
                        if (rows.length > 0) {
                            const lastRow = rows[rows.length - 1];
                            const lastRowId = lastRow.getAttribute('data-row-id');
                            
                            // Scroll ke row terakhir
                            const containerRect = tableContainer.getBoundingClientRect();
                            const rowRect = lastRow.getBoundingClientRect();
                            const scrollTop = tableContainer.scrollTop;
                            const rowOffset = rowRect.top - containerRect.top + scrollTop;
                            const targetScroll = rowOffset - (containerRect.height / 2) + (rowRect.height / 2);
                            
                            tableContainer.scrollTo({
                                top: targetScroll,
                                behavior: 'smooth'
                            });
                            
                            // Highlight row terakhir
                            lastRow.classList.add('row-highlight');
                            lastRow.style.backgroundColor = '#fef3c7';
                            setTimeout(() => {
                                lastRow.classList.remove('row-highlight');
                                lastRow.style.backgroundColor = '';
                            }, 3000);
                        }
                    }
                }, 200);
            }, 500);
        } else {
            // Edit mode - scroll ke row yang dikemaskini
            if (editingRowId) {
                setLastEditedRowId(editingRowId);
                setTimeout(() => {
                    loadTable(currentFileName, editingRowId);
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error saving row:', error);
        showNotification(`✗ Gagal menyimpan`, 'error');
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
        const response = await fetch(`${API_URL}/data/${currentFileName}/${rowId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showNotification(`✓ Berjaya dipadam`, 'success');
        
        // Reload table (tiada scroll ke row kerana sudah dipadam)
        setTimeout(() => {
            loadTable(currentFileName);
        }, 500);
    } catch (error) {
        console.error('Error deleting row:', error);
        showNotification(`✗ Gagal memadam`, 'error');
    }
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.ApiUtils = {
        saveRow,
        deleteRow
    };
}
