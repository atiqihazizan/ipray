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
        return `${rowData.type || ''}|${rowData.image || ''}|${rowData.duration || ''}|${rowData.checkbox || ''}|${rowData.hide || '0'}`;
    } else if (fileName === 'kuliah') {
        return `${rowData.week || ''}|${rowData.day || ''}|${rowData.type || ''}|${rowData.speaker || ''}|${rowData.speakerId || ''}|${rowData.title || ''}`;
    } else if (fileName === 'kuliah-override') {
        const format = (rowData.format || 'single').toLowerCase();
        if (format === 'single') {
            return `${rowData.date || ''}|${rowData.type || ''}|${rowData.notes || ''}`;
        }
        const tahun = (rowData.tahun || '').trim();
        const bulan = (rowData.bulan || '').trim();
        const type = (rowData.type || '').trim();
        const hari = (rowData.hari || '').trim();
        const replace = (rowData.replace || '').trim();
        const notes = (rowData.notes || '').trim();
        if (format === 'hijri') {
            const showAnnounce = (rowData.showAnnounce || '').toString().trim() === '1' ? '1' : '0';
            const title = (rowData.title || '').trim();
            const tempat = (rowData.tempat || '').trim();
            const jemputan = (rowData.jemputan || '').trim();
            if (showAnnounce === '1' || title || tempat || jemputan) {
                return `hijri|${tahun}|${bulan}|${hari}|${type}|${replace || '0'}|${notes}|${showAnnounce}|${title}|${tempat}|${jemputan}`;
            }
            return `hijri|${tahun}|${bulan}|${hari}|${type}|${replace || '0'}|${notes}`;
        }
        if (tahun) {
            return `${tahun}|${bulan}|${type}|${hari}|${replace || '0'}|${notes}`;
        }
        if (replace) {
            return `${bulan}|${type}|${hari}|${replace}|${notes}`;
        }
        return `${bulan}|${type}|${hari}|${notes}`;
    } else if (fileName === 'images') {
        return `${rowData.imageCode || ''}|${rowData.imagePath || ''}`;
    } else if (fileName === 'announcements') {
        return `${rowData.type || ''}|${rowData.title || ''}|${rowData.speaker || ''}|${rowData.category || ''}|${rowData.datetime || ''}|${rowData.location || ''}|${rowData.audience || ''}`;
    } else if (fileName === 'countdowns') {
        const format = (rowData.format || 'date').toLowerCase();
        const event = (rowData.event || '').trim();
        const windowDays = (rowData.windowDays || '').trim();
        if (format === 'hijri') {
            const tahun = (rowData.tahun || '').trim();
            const bulan = (rowData.bulan || '').trim();
            const hari = (rowData.hari || '').trim();
            return `COUNTDOWN_HIJRI|${tahun}|${bulan}|${hari}|${event}|${windowDays}`;
        }
        if (format === 'masihi') {
            const bulan = (rowData.bulan || '').trim();
            const hari = (rowData.hari || '').trim();
            return `COUNTDOWN_MASIHI|${bulan}|${hari}|${event}|${windowDays}`;
        }
        const date = (rowData.date || '').trim();
        return `COUNTDOWN|${date}|${event}|${windowDays}`;
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
        const caption = (rowData.caption || '').replace(/\t/g, ' ');
        const image = rowData.image || '';
        const validFrom = (rowData.validFrom || '').trim();
        const validTo = (rowData.validTo || '').trim();
        return `${caption}|${image}|${validFrom}|${validTo}`;
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

    // Countdowns: jika format date dan date hanya YYYY-MM-DD (10 char), tambah 00:00 untuk backend
    if (currentFileName === 'countdowns' && (rowData.format || 'date').toLowerCase() === 'date' && rowData.date) {
        const d = String(rowData.date).trim();
        if (d.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            rowData.date = d + ' 00:00';
        }
    }
    
    // Convert date input (YYYY-MM-DD) to storage (DD-MM-YYYY) untuk kuliah-override format single sahaja
    if (currentFileName === 'kuliah-override' && (rowData.format || 'single').toLowerCase() === 'single' && rowData.date) {
        const dateParts = rowData.date.split('-');
        if (dateParts.length === 3) {
            rowData.date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        }
    }
    
    // Convert duration dalam saat (UI) kepada ms untuk disimpan dalam slides.txt
    if (currentFileName === 'slides' && rowData.duration) {
        const seconds = parseFloat(rowData.duration);
        if (!isNaN(seconds)) {
            rowData.duration = String(Math.round(seconds * 1000));
        }
    }

    // Config: untuk key HOLD_DURATION & BLINK_DURATION, UI guna saat (s) tetapi simpan dalam ms
    if (currentFileName === 'config' && rowData.value && rowData.key) {
        const key = String(rowData.key).trim();
        if (key === 'HOLD_DURATION' || key === 'BLINK_DURATION') {
            const seconds = parseFloat(rowData.value);
            if (!isNaN(seconds)) {
                rowData.value = String(Math.round(seconds * 1000));
            }
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

    // Validate countdowns: event wajib; format date = tarikh wajib; format masihi/hijri = bulan + hari wajib
    if (currentFileName === 'countdowns') {
        if (!rowData.event || !rowData.event.trim()) {
            showNotification('✗ Event wajib diisi', 'error');
            return;
        }
        const fmt = (rowData.format || 'date').toLowerCase();
        if (fmt === 'date') {
            if (!rowData.date || !rowData.date.trim()) {
                showNotification('✗ Tarikh wajib diisi (YYYY-MM-DD)', 'error');
                return;
            }
        } else {
            const bulan = parseInt(rowData.bulan, 10);
            const hari = parseInt(rowData.hari, 10);
            if (!rowData.bulan || !rowData.bulan.trim() || isNaN(bulan) || bulan < 1 || bulan > 12) {
                showNotification('✗ Bulan wajib (1-12)', 'error');
                return;
            }
            if (!rowData.hari || !rowData.hari.trim() || isNaN(hari) || hari < 1 || hari > 31) {
                showNotification('✗ Hari wajib (1-31 Masihi, 1-30 Hijri)', 'error');
                return;
            }
        }
    }
    
    // Validate untuk kuliah-override: ikut format (single = date+type; range = bulan+type+hari). Type boleh berbilang: kd,ks
    if (currentFileName === 'kuliah-override') {
        const format = (rowData.format || 'single').toLowerCase();
        const typeStr = (rowData.type || '').trim();
        if (!typeStr) {
            showNotification('✗ Type kuliah wajib dipilih', 'error');
            return;
        }
        const validTypes = ['km', 'kd', 'ks', 'kk'];
        const typeParts = typeStr.split(',').map(t => t.trim()).filter(Boolean);
        const invalid = typeParts.some(t => !validTypes.includes(t));
        if (invalid) {
            showNotification('✗ Type mestilah km, kd, ks, atau kk (boleh guna koma: kd,ks)', 'error');
            return;
        }
        if (format === 'single') {
            if (!rowData.date || !rowData.date.trim()) {
                showNotification('✗ Tarikh wajib diisi (format: DD-MM-YYYY)', 'error');
                return;
            }
            const datePattern = /^\d{2}-\d{2}-\d{4}$/;
            const dateVal = rowData.date.trim();
            if (!datePattern.test(dateVal)) {
                const ymd = dateVal.split('-');
                if (ymd.length === 3) {
                    rowData.date = `${ymd[2]}-${ymd[1]}-${ymd[0]}`;
                } else {
                    showNotification('✗ Format tarikh tidak betul. Gunakan: DD-MM-YYYY atau YYYY-MM-DD', 'error');
                    return;
                }
            }
        } else {
            const bulan = parseInt(rowData.bulan, 10);
            if (!rowData.bulan || !rowData.bulan.trim() || isNaN(bulan) || bulan < 1 || bulan > 12) {
                showNotification('✗ Bulan wajib (1-12)', 'error');
                return;
            }
            if (!rowData.hari || !rowData.hari.trim()) {
                showNotification('✗ Hari wajib (cth: 1-30 atau 1,2,3)', 'error');
                return;
            }
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

/**
 * Toggle hide/show slide (tanpa buka dialog). Hanya untuk fail slides.
 * @param {number} rowId - ID row slide
 */
export async function toggleSlideHide(rowId) {
    const currentFileName = getCurrentFileName();
    if (currentFileName !== 'slides') return;
    try {
        const API_URL = window.Config.API_URL;
        const response = await fetch(`${API_URL}/data/slides/${rowId}/toggle-hide`, { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        showNotification(result.hide ? '✓ Slide disembunyikan' : '✓ Slide dipaparkan', 'success');
        loadTable(currentFileName);
    } catch (error) {
        console.error('Error toggling slide hide:', error);
        showNotification('✗ Gagal kemaskini', 'error');
    }
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.ApiUtils = {
        saveRow,
        deleteRow,
        toggleSlideHide
    };
}
