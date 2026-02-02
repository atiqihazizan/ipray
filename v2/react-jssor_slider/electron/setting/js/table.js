/**
 * Table & UI Functions
 * Function untuk table operations dan UI management
 */

import { setCurrentFileName, setCurrentData, setCurrentColumns, getCurrentData, getCurrentColumns, getLastEditedRowId, setLastEditedRowId, getScrollPosition, setScrollPosition } from './state.js';
import { showNotification } from './notification.js';
import { openEditDialog } from './dialog.js';
import { deleteRow } from './api.js';

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
 * Load table data
 * @param {string} fileName - Nama fail untuk dimuat
 * @param {number} scrollToRowId - Optional: ID row untuk scroll selepas load
 */
export async function loadTable(fileName, scrollToRowId = null) {
    setCurrentFileName(fileName);
    
    const thead = document.getElementById(`${fileName}-thead`);
    const tbody = document.getElementById(`${fileName}-tbody`);
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
        const response = await fetch(`${API_URL}/data/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
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
        headerRow.innerHTML += '<th class="w-32">Tindakan</th>';
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
                    
                    // Special handling untuk imagePath dalam images table
                    if (fileName === 'images' && col === 'imagePath') {
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
                        
                        // Build image URL - images di-serve dari http://localhost:3000/images/
                        // Path sudah termasuk /images/ jadi hanya perlu tambah http://localhost:3000
                        let imageUrl;
                        if (value.startsWith('/images/')) {
                            imageUrl = `http://localhost:3000${value}`;
                        } else if (value.startsWith('/')) {
                            imageUrl = `http://localhost:3000${value}`;
                        } else {
                            imageUrl = `http://localhost:3000/images/${value}`;
                        }
                        
                        img.src = imageUrl;
                        
                        // Default placeholder jika image gagal load
                        const defaultImage = 'http://localhost:3000/img/Random_user.svg';
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
                    } else {
                        // Normal text display untuk column lain
                        td.textContent = value.length > 50 ? value.substring(0, 50) + '...' : value;
                        td.title = value;
                    }
                    
                    tr.appendChild(td);
                });
                
                const actionTd = document.createElement('td');
                actionTd.className = 'action-buttons';
                
                if (fileName === 'announcements') {
                    // Pengumuman: Edit + Delete (Edit hidden jika expired)
                    let isExpired = false;
                    if (row.datetime) {
                        isExpired = isAnnouncementExpired(row.datetime);
                    }
                    
                    // Edit button - hide untuk pengumuman yang sudah expired
                    if (!isExpired) {
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn-edit';
                        editBtn.innerHTML = '<span>✏️</span> Edit';
                        editBtn.onclick = () => openEditDialog(row.id);
                        actionTd.appendChild(editBtn);
                    }
                    
                    // Delete button - sentiasa tampil untuk pengumuman
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete';
                    deleteBtn.innerHTML = '<span>🗑️</span> Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else if (fileName === 'images') {
                    // Images: Edit + Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-edit';
                    editBtn.innerHTML = '<span>✏️</span> Edit';
                    editBtn.onclick = () => openEditDialog(row.id);
                    actionTd.appendChild(editBtn);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete';
                    deleteBtn.innerHTML = '<span>🗑️</span> Delete';
                    deleteBtn.onclick = () => deleteRow(row.id);
                    actionTd.appendChild(deleteBtn);
                } else {
                    // Table lain (kuliah, slides): Edit sahaja, tiada Delete
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-edit';
                    editBtn.innerHTML = '<span>✏️</span> Edit';
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
        'kuliah': { icon: '📚', name: 'Kuliah' },
        'images': { icon: '🖼️', name: 'Images' },
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
    
    // Load table data
    loadTable(tabName);
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.TableUtils = {
        loadTable,
        showTab
    };
}
