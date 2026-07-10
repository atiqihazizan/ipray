/**
 * Table & UI Functions
 * Function untuk table operations dan UI management
 */

import { setCurrentFileName, setCurrentData, setCurrentColumns, getCurrentData, getCurrentColumns, getLastEditedRowId, setLastEditedRowId, getScrollPosition, setScrollPosition } from './state.js';
import { showNotification } from './notification.js';
import { openEditDialog } from './dialog.js';
import { deleteRow } from './api.js';

// Framework-like SVG Icons
const Icons = {
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>`
};

/**
 * Check if announcement is expired
 * @param {string} datetimeStr - DateTime string
 * @returns {boolean}
 */
function isAnnouncementExpired(datetimeStr) {
    if (!datetimeStr) return false;
    return DateUtils.isDateExpired(datetimeStr);
}

/**
 * Load today's takwim with configuration layout
 */
async function loadTodayTakwim() {
    const container = document.getElementById('takwim-table-container');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-8 text-gray-500">Loading today\'s prayer schedule...</div>';
    
    try {
        const API_URL = window.Config.API_URL;
        const response = await fetch(`${API_URL}/data/takwim/today`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.data) {
            // No data for today
            const today = new Date();
            const gregorianDate = today.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            }).replace(/\//g, '-');
            
                    container.innerHTML = `
                <div class="today-takwim-container">
                    <header class="today-takwim-header">
                        <h2 class="today-takwim-title">Jadual Solat Hari Ini</h2>
                        <div class="today-takwim-dates">
                            <div>Tarikh Masihi: ${gregorianDate}</div>
                            <div>Tarikh Hijri: Tiada data</div>
                        </div>
                    </header>
                    <div class="today-takwim-empty">
                        <p class="text-lg mb-2">Tiada data jadual solat untuk hari ini.</p>
                        <p class="text-sm">Sila pastikan fail takwim mengandungi data untuk tarikh hari ini.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const data = result.data;
        let formData = {
            imsak: data.imsak || '',
            subuh: data.subuh || '',
            syuruk: data.syuruk || '',
            zohor: data.zohor || '',
            asar: data.asar || '',
            maghrib: data.maghrib || '',
            isyak: data.isyak || ''
        };
        
        const formatTimeForInput = (timeStr) => {
            if (!timeStr) return '';
            const trimmed = timeStr.trim();
            if (!trimmed) return '';
            const timeRegex = /^(\d{1,2}):(\d{2})$/;
            const match = trimmed.match(timeRegex);
            if (match) {
                const hours = match[1].padStart(2, '0');
                const minutes = match[2];
                return `${hours}:${minutes}`;
            }
            return trimmed;
        };
        
        // Function to save individual field
        const saveField = async (fieldName, inputElement, saveButton) => {
            const newValue = inputElement.value;
            
            // Update formData
            formData[fieldName] = newValue;
            
            try {
                saveButton.disabled = true;
                saveButton.textContent = 'Saving...';
                
                // Get all data to find today's row ID
                const allDataResponse = await fetch(`${API_URL}/data/takwim`);
                const allData = await allDataResponse.json();
                const todayRow = allData.data?.find(row => row.date === data.date);
                
                if (!todayRow) {
                    throw new Error('Today\'s row not found');
                }
                
                // Reconstruct raw line with updated field
                const rawLine = `${data.date} ${data.hijri}\t${formData.imsak}\t${formData.subuh}\t${formData.syuruk}\t${formData.zohor}\t${formData.asar}\t${formData.maghrib}\t${formData.isyak}`;
                
                // Update row
                const updateResponse = await fetch(`${API_URL}/data/takwim/${todayRow.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row: { raw: rawLine } })
                });
                
                if (!updateResponse.ok) {
                    throw new Error('Failed to save');
                }
                
                // Update local data
                data[fieldName] = newValue;
                
                if (window.NotificationUtils) {
                    window.NotificationUtils.showNotification(`Waktu ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} berjaya disimpan`, 'success');
                }
            } catch (err) {
                console.error('Error saving:', err);
                if (window.NotificationUtils) {
                    window.NotificationUtils.showNotification('Gagal menyimpan waktu ' + fieldName + ': ' + err.message, 'error');
                }
                // Revert input value on error
                inputElement.value = formatTimeForInput(data[fieldName] || '');
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save';
            }
        };
        
        const renderUI = () => {
            const prayerTimes = [
                { key: 'imsak', label: 'Imsak' },
                { key: 'subuh', label: 'Subuh' },
                { key: 'syuruk', label: 'Syuruk' },
                { key: 'zohor', label: 'Zohor' },
                { key: 'asar', label: 'Asar' },
                { key: 'maghrib', label: 'Maghrib' },
                { key: 'isyak', label: 'Isyak' }
            ];
            
            container.innerHTML = `
                <div class="today-takwim-container">
                    <header class="today-takwim-header">
                        <h2 class="today-takwim-title">Jadual Solat Hari Ini</h2>
                        <div class="today-takwim-dates">
                            <div>Tarikh Masihi: ${data.date}</div>
                            <div>Tarikh Hijri: ${data.hijri}</div>
                        </div>
                    </header>
                    <div class="today-takwim-fields">
                        ${prayerTimes.map(prayer => `
                            <div class="today-takwim-field">
                                <label class="today-takwim-label">${prayer.label}</label>
                                <input type="time" class="today-takwim-input" value="${formatTimeForInput(formData[prayer.key])}" 
                                    data-field="${prayer.key}" />
                                <button class="today-takwim-btn-field-save" data-field="${prayer.key}">Simpan</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="today-takwim-actions">
                        <button class="today-takwim-btn today-takwim-btn-reload" data-action="reload">Reload</button>
                    </div>
                </div>
            `;
            
            // Attach event listeners for save buttons
            container.querySelectorAll('.today-takwim-btn-field-save').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fieldName = e.target.dataset.field;
                    const inputElement = container.querySelector(`input[data-field="${fieldName}"]`);
                    if (inputElement) {
                        await saveField(fieldName, inputElement, e.target);
                    }
                });
            });
            
            // Attach event listener for reload button
            const reloadBtn = container.querySelector('[data-action="reload"]');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    loadTodayTakwim();
                });
            }
        };
        
        renderUI();
        
        if (window.NotificationUtils) {
            window.NotificationUtils.showNotification(`Today's prayer schedule loaded`, 'success');
        }
    } catch (error) {
        console.error('Error loading today takwim:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                Error: ${error.message}
            </div>
        `;
        if (window.NotificationUtils) {
            window.NotificationUtils.showNotification('Failed to load today\'s data', 'error');
        }
    }
}

/**
 * Load table data
 * @param {string} fileName - Nama fail untuk dimuat
 * @param {number} scrollToRowId - Optional: ID row untuk scroll selepas load
 */
export async function loadTable(fileName, scrollToRowId = null) {
    // Special handling for takwim - use configuration layout
    if (fileName === 'takwim') {
        return loadTodayTakwim();
    }
    
    setCurrentFileName(fileName);
    
    // Handle kuliah-batal table IDs
    const theadId = fileName === 'kuliah-batal' ? 'kuliah-batal-thead' : `${fileName}-thead`;
    const tbodyId = fileName === 'kuliah-batal' ? 'kuliah-batal-tbody' : `${fileName}-tbody`;
    const thead = document.getElementById(theadId);
    const tbody = document.getElementById(tbodyId);
    const tableContainer = tbody?.closest('.table-container');
    
    // Simpan scroll position sebelum reload
    if (tableContainer) {
        setScrollPosition(tableContainer.scrollTop);
    }
    
    // Gunakan lastEditedRowId jika tidak ada scrollToRowId
    const targetRowId = scrollToRowId || getLastEditedRowId();
    
    thead.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="100" class="text-center py-8 text-gray-500">Memuat data...</td></tr>';
    
    try {
        const API_URL = window.Config.API_URL;
        const BASE_URL = window.Config.BASE_URL || API_URL.replace(/\/api\/?$/, '');
        // Untuk slides dan kuliah, muat images sekali gus untuk resolve image code → path
        let imagesList = [];
        if (fileName === 'slides' || fileName === 'kuliah') {
            try {
                const imgRes = await fetch(`${API_URL}/data/images`);
                if (imgRes.ok) {
                    const imgResult = await imgRes.json();
                    imagesList = imgResult.data || [];
                }
            } catch (e) {
                console.warn(`Could not load images for ${fileName} column:`, e);
            }
        }

        const response = await fetch(`${API_URL}/data/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        // Untuk slides: papar duration dalam saat (s) di UI, tetapi simpan dalam ms di fail
        if (fileName === 'slides' && Array.isArray(result.data)) {
            result.data = result.data.map(row => {
                const newRow = { ...row };
                if (newRow.duration != null && newRow.duration !== '') {
                    const ms = parseFloat(newRow.duration);
                    if (!isNaN(ms)) {
                        newRow.duration = String(ms / 1000);
                    }
                }
                return newRow;
            });
        }

        setCurrentData(result.data);
        setCurrentColumns(result.columns);
        
        const currentData = getCurrentData();
        const currentColumns = getCurrentColumns();
        
        // Build table header
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th class="w-20">ID</th>';
        currentColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.charAt(0).toUpperCase() + col.slice(1);
            headerRow.appendChild(th);
        });
        headerRow.innerHTML += '<th class="w-32" style="width:114px">Tindakan</th>';
        thead.appendChild(headerRow);
        
        // Build table body
        tbody.innerHTML = '';
        if (currentData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100">Tiada data</td></tr>';
        } else {
            currentData.forEach(row => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-row-id', row.id);
                
                // Highlight row jika ia baru dikemaskini
                if (targetRowId && row.id === targetRowId) {
                    tr.classList.add('row-highlight');
                    tr.style.backgroundColor = '#fef3c7'; // Yellow highlight
                }
                
                const idTd = document.createElement('td');
                idTd.textContent = row.id;
                tr.appendChild(idTd);
                
                currentColumns.forEach(col => {
                    const td = document.createElement('td');
                    const value = row[col] || '';
                    
                    // Special handling untuk speakerId dalam kuliah table: papar image thumbnail
                    if (fileName === 'kuliah' && col === 'speakerId') {
                        td.style.padding = '8px';
                        td.style.verticalAlign = 'middle';
                        
                        const imgContainer = document.createElement('div');
                        imgContainer.style.display = 'flex';
                        imgContainer.style.alignItems = 'center';
                        imgContainer.style.gap = '12px';
                        
                        const img = document.createElement('img');
                        img.style.width = '60px';
                        img.style.height = '60px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '6px';
                        img.style.border = '1px solid #e5e7eb';
                        img.style.backgroundColor = '#f9fafb';
                        img.style.flexShrink = '0';
                        img.loading = 'lazy';
                        
                        // Resolve image code ke image path
                        const resolvePath = (code) => {
                            if (!code || !code.trim()) return null;
                            const found = imagesList.find(r => (r.imageCode || '').trim() === code.trim());
                            return found ? (found.imagePath || '') : null;
                        };
                        const path = resolvePath(value);
                        let imageUrl;
                        if (path) {
                            imageUrl = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
                        } else {
                            // Default image jika tiada code atau code tidak dijumpai
                            imageUrl = `${BASE_URL}/images/penceramah/Random_user.svg`;
                        }
                        img.src = imageUrl;
                        
                        // Default placeholder jika image gagal load
                        const defaultImage = `${BASE_URL}/images/penceramah/Random_user.svg`;
                        let errorCount = 0;
                        img.onerror = function() {
                            errorCount++;
                            if (errorCount === 1) {
                                // Try default image
                                this.src = defaultImage;
                            } else {
                                // Jika default image pun gagal, paparkan placeholder SVG
                                this.onerror = null; // Prevent infinite loop
                                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAyMEMyNS41ODIyIDIwIDIyIDIzLjU4MjIgMjIgMjhDMjIgMzIuNDE3OCAyNS41ODIyIDM2IDMwIDM2QzM0LjQxNzggMzYgMzggMzIuNDE3OCAzOCAyOEMzOCAyMy41ODIyIDM0LjQxNzggMjAgMzAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNiA0NEMxNiA0MC42ODYzIDE4LjY4NjMgMzggMjIgMzhIMzguMDAwMUM0MS4zMTM3IDM4IDQ0IDQwLjY4NjMgNDQgNDRWMjZIMTZWMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                                this.style.opacity = '0.4';
                            }
                        };
                        
                        imgContainer.appendChild(img);
                        
                        // Text image code di sebelah image
                        const codeText = document.createElement('span');
                        codeText.textContent = value || '—';
                        codeText.title = value || '';
                        codeText.style.fontSize = '13px';
                        codeText.style.color = '#374151';
                        codeText.style.flex = '1';
                        codeText.style.wordBreak = 'break-all';
                        codeText.style.lineHeight = '1.4';
                        
                        imgContainer.appendChild(codeText);
                        td.appendChild(imgContainer);
                    } else if (fileName === 'slides' && col === 'image') {
                        td.style.padding = '8px';
                        td.style.verticalAlign = 'middle';
                        const imgContainer = document.createElement('div');
                        imgContainer.style.display = 'flex';
                        imgContainer.style.alignItems = 'center';
                        imgContainer.style.gap = '12px';
                        const img = document.createElement('img');
                        img.style.width = '60px';
                        img.style.height = '60px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '6px';
                        img.style.border = '1px solid #e5e7eb';
                        img.style.backgroundColor = '#f9fafb';
                        img.style.flexShrink = '0';
                        img.loading = 'lazy';
                        const resolvePath = (code) => {
                            const found = imagesList.find(r => (r.imageCode || '').trim() === (code || '').trim());
                            return found ? (found.imagePath || '') : (value && value.startsWith('/') ? value : '');
                        };
                        const path = resolvePath(value);
                        let imageUrl;
                        if (path) {
                            if (path.startsWith('/')) imageUrl = `${BASE_URL}${path}`;
                            else imageUrl = `${BASE_URL}/images/${path}`;
                        } else {
                            imageUrl = `${BASE_URL}/images/noimage.png`;
                        }
                        img.src = imageUrl;
                        img.onerror = function() {
                            this.src = `${BASE_URL}/images/noimage.png`;
                            this.onerror = null;
                        };
                        imgContainer.appendChild(img);
                        const codeText = document.createElement('span');
                        codeText.style.fontSize = '13px';
                        codeText.style.color = '#374151';
                        codeText.textContent = value || '—';
                        imgContainer.appendChild(codeText);
                        td.appendChild(imgContainer);
                    } else if (fileName === 'slideshow' && col === 'image') {
                        td.style.padding = '8px';
                        td.style.verticalAlign = 'middle';
                        const imgContainer = document.createElement('div');
                        imgContainer.style.display = 'flex';
                        imgContainer.style.alignItems = 'center';
                        imgContainer.style.gap = '12px';
                        const img = document.createElement('img');
                        img.style.width = '60px';
                        img.style.height = '60px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '6px';
                        img.style.border = '1px solid #e5e7eb';
                        img.style.flexShrink = '0';
                        img.loading = 'lazy';
                        // const imageUrl = value.startsWith('/') ? `${BASE_URL}${value}` : `${BASE_URL}${value}`;

                        const resolvePath = (code) => {
                            const found = imagesList.find(r => (r.imageCode || '').trim() === (code || '').trim());
                            return found ? (found.imagePath || '') : (value && value.startsWith('/') ? value : '');
                        };
                        const path = resolvePath(value);
                        let imageUrl;
                        if (path) {
                            if (path.startsWith('/')) imageUrl = `${BASE_URL}${path}`;
                            else imageUrl = `${BASE_URL}/images/${path}`;
                        } else {
                            imageUrl = `${BASE_URL}/images/noimage.png`;
                        }

                        img.src = imageUrl;
                        img.onerror = function() {
                            this.src = `${BASE_URL}/images/noimage.png`;
                            this.onerror = null;
                        };
                        imgContainer.appendChild(img);
                        const pathText = document.createElement('span');
                        pathText.textContent = value.length > 40 ? value.substring(0, 40) + '...' : value;
                        pathText.title = value;
                        pathText.style.fontSize = '13px';
                        pathText.style.color = '#374151';
                        pathText.style.flex = '1';
                        pathText.style.wordBreak = 'break-all';
                        // imgContainer.appendChild(pathText);
                        td.appendChild(imgContainer);
                    } else if (fileName === 'images' && col === 'imagePath') {
                        td.style.padding = '8px';
                        td.style.verticalAlign = 'middle';
                        
                        const imgContainer = document.createElement('div');
                        imgContainer.style.display = 'flex';
                        imgContainer.style.alignItems = 'center';
                        imgContainer.style.gap = '12px';
                        
                        const img = document.createElement('img');
                        img.style.width = '60px';
                        img.style.height = '60px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '6px';
                        img.style.border = '1px solid #e5e7eb';
                        img.style.backgroundColor = '#f9fafb';
                        img.style.flexShrink = '0';
                        img.loading = 'lazy';
                        
                        // Build image URL - images di-serve dari BASE_URL/images/
                        let imageUrl;
                        if (value.startsWith('/')) {
                            imageUrl = `${BASE_URL}${value}`;
                        } else {
                            imageUrl = `${BASE_URL}/images/${value}`;
                        }
                        img.src = imageUrl;
                        
                        // Default placeholder jika image gagal load
                        const defaultImage = `${BASE_URL}/images/penceramah/Random_user.svg`;
                        let errorCount = 0;
                        img.onerror = function() {
                            errorCount++;
                            if (errorCount === 1) {
                                // Try default image
                                this.src = defaultImage;
                            } else {
                                // Jika default image pun gagal, paparkan placeholder SVG
                                this.onerror = null; // Prevent infinite loop
                                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAyMEMyNS41ODIyIDIwIDIyIDIzLjU4MjIgMjIgMjhDMjIgMzIuNDE3OCAyNS41ODIyIDM2IDMwIDM2QzM0LjQxNzggMzYgMzggMzIuNDE3OCAzOCAyOEMzOCAyMy41ODIyIDM0LjQxNzggMjAgMzAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNiA0NEMxNiA0MC42ODYzIDE4LjY4NjMgMzggMjIgMzhIMzguMDAwMUM0MS4zMTM3IDM4IDQ0IDQwLjY4NjMgNDQgNDRWMjZIMTZWMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                                this.style.opacity = '0.4';
                            }
                        };
                        
                        imgContainer.appendChild(img);
                        
                        // Text path di sebelah image
                        const pathText = document.createElement('span');
                        pathText.textContent = value.length > 40 ? value.substring(0, 40) + '...' : value;
                        pathText.title = value;
                        pathText.style.fontSize = '13px';
                        pathText.style.color = '#374151';
                        pathText.style.flex = '1';
                        pathText.style.wordBreak = 'break-all';
                        pathText.style.lineHeight = '1.4';
                        
                        imgContainer.appendChild(pathText);
                        td.appendChild(imgContainer);
                    } else if (fileName === 'slides' && col === 'duration') {
                        // Papar duration dalam saat dengan unit (UI: s, storage: ms)
                        const displayVal = value !== null && value !== undefined ? String(value).trim() : '';
                        if (displayVal) {
                            td.textContent = `${displayVal} s`;
                            td.title = `${displayVal} saat`;
                        } else {
                            td.textContent = '';
                            td.title = '';
                        }
                    } else {
                        // Normal text display untuk column lain
                        td.textContent = value.length > 50 ? value.substring(0, 50) + '...' : value;
                        td.title = value;
                    }
                    
                    tr.appendChild(td);
                });
                
                const actionTd = document.createElement('td');
                actionTd.className = 'action-buttons';
                actionTd.style.width = '114px';
                
                if (fileName === 'announcements') {
                    // Pengumuman: Edit + Delete (Edit hidden jika expired)
                    let isExpired = false;
                    if (row.datetime) {
                        isExpired = isAnnouncementExpired(row.datetime);
                    }
                    
                    // Edit button - hide untuk pengumuman yang sudah expired
                    if (!isExpired) {
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn-icon btn-edit';
                        editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
                        editBtn.title = 'Edit';
                        editBtn.onclick = () => openEditDialog(row.id);
                        actionTd.appendChild(editBtn);
                    }
                    
                    // Delete button - sentiasa tampil untuk pengumuman
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon btn-delete';
                    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
                    deleteBtn.title = 'Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else if (fileName === 'images') {
                    // Images: Edit + Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-icon btn-edit';
                    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
                    editBtn.title = 'Edit';
                    editBtn.onclick = () => openEditDialog(row.id);
                    actionTd.appendChild(editBtn);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon btn-delete';
                    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
                    deleteBtn.title = 'Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else if (fileName === 'slideshow') {
                    // Slideshow: Edit + Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-icon btn-edit';
                    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
                    editBtn.title = 'Edit';
                    editBtn.onclick = () => openEditDialog(row.id);
                    actionTd.appendChild(editBtn);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon btn-delete';
                    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
                    deleteBtn.title = 'Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else if (fileName === 'kuliah-batal') {
                    // Kuliah Batal: Edit + Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-icon btn-edit';
                    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
                    editBtn.title = 'Edit';
                    editBtn.onclick = () => openEditDialog(row.id);
                    actionTd.appendChild(editBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon btn-delete';
                    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
                    deleteBtn.title = 'Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else {
                    // Table lain (kuliah, slides): Edit sahaja, tiada Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-icon btn-edit';
                    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
                    editBtn.title = 'Edit';
                    editBtn.onclick = () => openEditDialog(row.id);
                    actionTd.appendChild(editBtn);
                }
                
                tr.appendChild(actionTd);
                
                tbody.appendChild(tr);
            });
        }
        
        // Scroll ke row yang baru dikemaskini selepas render
        if (targetRowId && tableContainer) {
            setTimeout(() => {
                const targetRow = tbody.querySelector(`tr[data-row-id="${targetRowId}"]`);
                if (targetRow) {
                    // Calculate position relative to container
                    const containerRect = tableContainer.getBoundingClientRect();
                    const rowRect = targetRow.getBoundingClientRect();
                    const scrollTop = tableContainer.scrollTop;
                    const rowOffset = rowRect.top - containerRect.top + scrollTop;
                    
                    // Scroll ke row tersebut (center dalam container)
                    const targetScroll = rowOffset - (containerRect.height / 2) + (rowRect.height / 2);
                    tableContainer.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                    
                    // Remove highlight selepas beberapa saat
                    setTimeout(() => {
                        targetRow.classList.remove('row-highlight');
                        targetRow.style.backgroundColor = '';
                    }, 3000);
                } else {
                    // Jika row tidak ditemui, restore scroll position
                    const savedPosition = getScrollPosition();
                    if (savedPosition !== null) {
                        tableContainer.scrollTop = savedPosition;
                    }
                }
                
                // Clear lastEditedRowId selepas scroll
                setLastEditedRowId(null);
                setScrollPosition(null);
            }, 100);
        } else {
            // Restore scroll position jika tiada target row
            const savedPosition = getScrollPosition();
            if (savedPosition !== null && tableContainer) {
                setTimeout(() => {
                    tableContainer.scrollTop = savedPosition;
                    setScrollPosition(null);
                }, 100);
            }
        }
        
        showNotification(`✓ Data berjaya dimuat (${currentData.length} baris)`, 'success');
    } catch (error) {
        console.error('Error loading table:', error);
        const errorRow = document.createElement('tr');
        const errorTd = document.createElement('td');
        errorTd.setAttribute('colspan', '100');
        errorTd.textContent = `Ralat memuat data: ${error.message}`;
        errorTd.style.textAlign = 'center';
        errorTd.style.padding = '48px 20px';
        errorTd.style.color = '#ef4444';
        errorRow.appendChild(errorTd);
        tbody.innerHTML = '';
        tbody.appendChild(errorRow);
        showNotification(`✗ Gagal memuat data`, 'error');
    }
}

/**
 * Switch tabs
 * @param {string} tabName - Nama tab untuk ditukar
 */
export function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all menu items (sidebar)
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked menu item
    const activeMenuItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Update page title
    const pageTitles = {
        'config': { icon: '⚙️', name: 'Config' },
        'slides': { icon: '🖼️', name: 'Slides' },
        'slideshow': { icon: '🎬', name: 'Slideshow' },
        'kuliah': { icon: '📚', name: 'Kuliah' },
        'kuliah-batal': { icon: '❌', name: 'Kuliah Batal' },
        'images': { icon: '🖼️', name: 'Galery' },
        'announcements': { icon: '📢', name: 'Pengumuman' },
        'takwim': { icon: '📅', name: 'Takwim' }
    };
    
    const pageInfo = pageTitles[tabName];
    if (pageInfo) {
        const pageIcon = document.getElementById('page-icon');
        const pageName = document.getElementById('page-name');
        if (pageIcon) pageIcon.textContent = pageInfo.icon;
        if (pageName) pageName.textContent = pageInfo.name;
    }
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }
    
    // Load data based on tab type
    if (tabName === 'config') {
        // Config tab uses form-based layout
        if (typeof window.loadConfigData === 'function') {
            window.loadConfigData();
        }
    } else {
        // Other tabs use table layout
        loadTable(tabName);
    }
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.TableUtils = {
        loadTable,
        showTab,
        loadTodayTakwim
    };
}
