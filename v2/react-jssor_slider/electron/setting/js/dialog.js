/**
 * Dialog & Form Functions
 * Function untuk dialog operations (Add, Edit, Close)
 */

import { getCurrentFileName, getCurrentColumns, findRowById, setEditingRowId, setAddMode } from './state.js';
import { showNotification } from './notification.js';

/**
 * Upload image file
 * @param {File} file - File object
 * @param {string} category - Category (penceramah atau slides)
 * @returns {Promise<object>} Upload result dengan path
 */
export async function uploadImage(file, category = 'penceramah') {
    if (!file) {
        throw new Error('Tiada fail dipilih');
    }
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);
    
    const API_URL = window.Config.API_URL;
    const url = `${API_URL}/images/upload?category=${encodeURIComponent(category)}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: Upload gagal`);
        }
        
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        if (error.message) {
            throw error;
        }
        throw new Error('Gagal memuat naik image. Sila cuba lagi.');
    }
}

/**
 * Delete image file
 * @param {string} imagePath - Path image untuk dipadam
 * @returns {Promise<object>} Delete result
 */
export async function deleteImageFile(imagePath) {
    const API_URL = window.Config.API_URL;
    const response = await fetch(`${API_URL}/images/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imagePath })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete gagal');
    }
    
    return await response.json();
}

/**
 * Download image from URL
 * @param {string} imageUrl - URL image untuk dimuat turun
 * @param {string} category - Category (penceramah atau slides)
 * @param {string} filename - Optional filename
 * @returns {Promise<object>} Download result dengan path
 */
export async function downloadImageFromUrl(imageUrl, category = 'penceramah', filename = null) {
    const API_URL = window.Config.API_URL;
    const response = await fetch(`${API_URL}/images/download`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl, category, filename })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download gagal');
    }
    
    return await response.json();
}

/**
 * Create form fields untuk dialog
 * @param {HTMLElement} form - Form element
 * @param {object} row - Data row (null untuk add mode)
 * @param {boolean} isAdd - Mode add atau edit
 */
function createFormFields(form, row, isAdd) {
    const currentFileName = getCurrentFileName();
    const currentColumns = getCurrentColumns();
    
    currentColumns.forEach(col => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = col.charAt(0).toUpperCase() + col.slice(1);
        label.setAttribute('for', `field-${col}`);
        
        // Special handling untuk imagePath dalam images table
        if (currentFileName === 'images' && col === 'imagePath') {
            // Image upload section
            const uploadContainer = document.createElement('div');
            uploadContainer.className = 'image-upload-container';
            
            // Image preview
            const previewContainer = document.createElement('div');
            previewContainer.className = 'image-preview-container';
            previewContainer.style.marginBottom = '12px';
            
            const previewImg = document.createElement('img');
            previewImg.id = `image-preview-${col}`;
            previewImg.className = 'image-preview';
            previewImg.style.maxWidth = '200px';
            previewImg.style.maxHeight = '200px';
            previewImg.style.borderRadius = '8px';
            previewImg.style.border = '1px solid #e5e7eb';
            previewImg.style.display = 'none';
            previewImg.style.objectFit = 'cover';
            
            // Set preview image jika ada value
            if (!isAdd && row[col]) {
                const imageUrl = row[col].startsWith('/') ? `http://localhost:3000${row[col]}` : `http://localhost:3000/images/${row[col]}`;
                previewImg.src = imageUrl;
                previewImg.style.display = 'block';
            }
            
            previewImg.onerror = function() {
                this.style.display = 'none';
            };
            
            previewContainer.appendChild(previewImg);
            uploadContainer.appendChild(previewContainer);
            
            // Tabs untuk pilih upload method
            const methodTabs = document.createElement('div');
            methodTabs.style.display = 'flex';
            methodTabs.style.gap = '8px';
            methodTabs.style.marginBottom = '12px';
            methodTabs.style.borderBottom = '2px solid #e5e7eb';
            
            const localTab = document.createElement('button');
            localTab.type = 'button';
            localTab.textContent = '📁 Local File';
            localTab.className = 'method-tab active';
            localTab.style.padding = '8px 16px';
            localTab.style.border = 'none';
            localTab.style.background = 'transparent';
            localTab.style.cursor = 'pointer';
            localTab.style.borderBottom = '2px solid #6366f1';
            localTab.style.marginBottom = '-2px';
            
            const urlTab = document.createElement('button');
            urlTab.type = 'button';
            urlTab.textContent = '🌐 From URL';
            urlTab.className = 'method-tab';
            urlTab.style.padding = '8px 16px';
            urlTab.style.border = 'none';
            urlTab.style.background = 'transparent';
            urlTab.style.cursor = 'pointer';
            urlTab.style.color = '#6b7280';
            
            // Local file upload section
            const localSection = document.createElement('div');
            localSection.id = `local-section-${col}`;
            localSection.style.display = 'block';
            
            // File input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = `file-${col}`;
            fileInput.accept = 'image/*';
            fileInput.className = 'form-control';
            fileInput.style.marginBottom = '8px';
            
            // URL input section
            const urlSection = document.createElement('div');
            urlSection.id = `url-section-${col}`;
            urlSection.style.display = 'none';
            
            const urlInput = document.createElement('input');
            urlInput.type = 'url';
            urlInput.id = `url-${col}`;
            urlInput.className = 'form-control';
            urlInput.placeholder = 'https://example.com/image.jpg';
            urlInput.style.marginBottom = '8px';
            
            // Category selector untuk upload
            const categorySelect = document.createElement('select');
            categorySelect.id = `category-${col}`;
            categorySelect.className = 'form-control';
            categorySelect.style.marginBottom = '8px';
            categorySelect.innerHTML = `
                <option value="penceramah">Penceramah</option>
                <option value="slides">Slides</option>
            `;
            
            // Upload button (untuk local file)
            const uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.className = 'btn-upload';
            uploadBtn.textContent = '📤 Upload Image';
            uploadBtn.style.marginRight = '8px';
            uploadBtn.style.marginBottom = '8px';
            
            // Download button (untuk URL)
            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'btn-upload';
            downloadBtn.textContent = '⬇️ Download from URL';
            downloadBtn.style.marginRight = '8px';
            downloadBtn.style.marginBottom = '8px';
            downloadBtn.style.display = 'none';
            
            // Tab switching
            localTab.onclick = () => {
                localTab.classList.add('active');
                localTab.style.borderBottom = '2px solid #6366f1';
                localTab.style.color = '#111827';
                urlTab.classList.remove('active');
                urlTab.style.borderBottom = 'none';
                urlTab.style.color = '#6b7280';
                localSection.style.display = 'block';
                urlSection.style.display = 'none';
                uploadBtn.style.display = 'inline-block';
                downloadBtn.style.display = 'none';
            };
            
            urlTab.onclick = () => {
                urlTab.classList.add('active');
                urlTab.style.borderBottom = '2px solid #6366f1';
                urlTab.style.color = '#111827';
                localTab.classList.remove('active');
                localTab.style.borderBottom = 'none';
                localTab.style.color = '#6b7280';
                localSection.style.display = 'none';
                urlSection.style.display = 'block';
                uploadBtn.style.display = 'none';
                downloadBtn.style.display = 'inline-block';
            };
            
            localSection.appendChild(fileInput);
            urlSection.appendChild(urlInput);
            
            methodTabs.appendChild(localTab);
            methodTabs.appendChild(urlTab);
            
            // Remove button (hanya jika ada image)
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove';
            removeBtn.textContent = '🗑️ Remove Image';
            removeBtn.style.display = (!isAdd && row[col]) ? 'inline-block' : 'none';
            removeBtn.style.marginBottom = '8px';
            
            // Hidden input untuk imagePath value
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'text';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = isAdd ? '' : (row[col] || '');
            hiddenInput.className = 'form-control';
            hiddenInput.style.marginTop = '8px';
            hiddenInput.placeholder = 'Image path akan diisi selepas upload';
            
            // Upload handler (local file)
            uploadBtn.onclick = async () => {
                const file = fileInput.files[0];
                if (!file) {
                    showNotification('✗ Sila pilih fail image', 'error');
                    return;
                }
                
                uploadBtn.disabled = true;
                uploadBtn.textContent = '⏳ Uploading...';
                
                try {
                    const result = await uploadImage(file, categorySelect.value);
                    hiddenInput.value = result.path;
                    
                    // Update preview
                    previewImg.src = `http://localhost:3000${result.path}`;
                    previewImg.style.display = 'block';
                    removeBtn.style.display = 'inline-block';
                    
                    showNotification('✓ Image berjaya dimuat naik', 'success');
                } catch (error) {
                    console.error('Upload error:', error);
                    showNotification(`✗ ${error.message || 'Gagal memuat naik image'}`, 'error');
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '📤 Upload Image';
                    fileInput.value = '';
                }
            };
            
            // Download handler (from URL)
            downloadBtn.onclick = async () => {
                const imageUrl = urlInput.value.trim();
                if (!imageUrl) {
                    showNotification('✗ Sila masukkan URL image', 'error');
                    return;
                }
                
                // Validate URL format
                try {
                    new URL(imageUrl);
                } catch (error) {
                    showNotification('✗ Format URL tidak sah', 'error');
                    return;
                }
                
                downloadBtn.disabled = true;
                downloadBtn.textContent = '⏳ Downloading...';
                
                try {
                    const result = await downloadImageFromUrl(imageUrl, categorySelect.value);
                    hiddenInput.value = result.path;
                    
                    // Update preview
                    previewImg.src = `http://localhost:3000${result.path}`;
                    previewImg.style.display = 'block';
                    removeBtn.style.display = 'inline-block';
                    
                    showNotification('✓ Image berjaya dimuat turun', 'success');
                } catch (error) {
                    console.error('Download error:', error);
                    showNotification(`✗ ${error.message || 'Gagal memuat turun image'}`, 'error');
                } finally {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '⬇️ Download from URL';
                    urlInput.value = '';
                }
            };
            
            // Remove handler
            removeBtn.onclick = async () => {
                if (!confirm('Adakah anda pasti mahu memadam image ini?')) {
                    return;
                }
                
                const imagePath = hiddenInput.value;
                if (!imagePath) {
                    return;
                }
                
                removeBtn.disabled = true;
                removeBtn.textContent = '⏳ Removing...';
                
                try {
                    await deleteImageFile(imagePath);
                    
                    hiddenInput.value = '';
                    previewImg.src = '';
                    previewImg.style.display = 'none';
                    removeBtn.style.display = 'none';
                    
                    showNotification('✓ Image berjaya dipadam', 'success');
                } catch (error) {
                    console.error('Delete error:', error);
                    showNotification(`✗ ${error.message || 'Gagal memadam image'}`, 'error');
                } finally {
                    removeBtn.disabled = false;
                    removeBtn.textContent = '🗑️ Remove Image';
                }
            };
            
            // File change handler untuk preview sebelum upload
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        previewImg.src = event.target.result;
                        previewImg.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '8px';
            buttonContainer.style.flexWrap = 'wrap';
            buttonContainer.appendChild(categorySelect);
            buttonContainer.appendChild(uploadBtn);
            buttonContainer.appendChild(downloadBtn);
            buttonContainer.appendChild(removeBtn);
            
            uploadContainer.appendChild(methodTabs);
            uploadContainer.appendChild(localSection);
            uploadContainer.appendChild(urlSection);
            uploadContainer.appendChild(buttonContainer);
            uploadContainer.appendChild(hiddenInput);
            
            group.appendChild(label);
            group.appendChild(uploadContainer);
            form.appendChild(group);
        } else {
            // Normal input untuk column lain
            let inputElement = null;
            
            // Special handling for long fields
            if (col === 'image' || col === 'raw' || (!isAdd && row[col] && row[col].length > 100)) {
                const textarea = document.createElement('textarea');
                textarea.id = `field-${col}`;
                textarea.name = col;
                textarea.value = isAdd ? '' : (row[col] || '');
                textarea.className = 'form-control';
                
                // Auto uppercase untuk textarea di pengumuman juga
                if (currentFileName === 'announcements' && col !== 'datetime') {
                    if (textarea.value) {
                        textarea.value = textarea.value.toUpperCase();
                    }
                    
                    textarea.addEventListener('input', (e) => {
                        const cursorPos = e.target.selectionStart;
                        e.target.value = e.target.value.toUpperCase();
                        e.target.setSelectionRange(cursorPos, cursorPos);
                    });
                    
                    textarea.addEventListener('paste', (e) => {
                        setTimeout(() => {
                            const cursorPos = e.target.selectionStart;
                            e.target.value = e.target.value.toUpperCase();
                            e.target.setSelectionRange(cursorPos, cursorPos);
                        }, 0);
                    });
                }
                
                inputElement = textarea;
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `field-${col}`;
                input.name = col;
                input.value = isAdd ? '' : (row[col] || '');
                input.className = 'form-control';
                
                // Set default values untuk type (add mode)
                if (isAdd && col === 'type') {
                    input.value = 'PENGUMUMAN';
                }
                
                // Tukar kepada datetime-local untuk datetime field
                if (col === 'datetime' && currentFileName === 'announcements') {
                    input.type = 'datetime-local';
                    // Convert "YYYY-MM-DD HH:MM" to "YYYY-MM-DDTHH:MM" untuk datetime-local
                    if (!isAdd && row[col]) {
                        input.value = row[col].replace(' ', 'T');
                    }
                }
                
                // Auto uppercase untuk semua text input di pengumuman (kecuali datetime)
                if (currentFileName === 'announcements' && col !== 'datetime') {
                    // Convert existing value kepada uppercase
                    if (input.value) {
                        input.value = input.value.toUpperCase();
                    }
                    
                    // Auto convert semasa user menaip
                    input.addEventListener('input', (e) => {
                        const cursorPos = e.target.selectionStart;
                        e.target.value = e.target.value.toUpperCase();
                        e.target.setSelectionRange(cursorPos, cursorPos);
                    });
                    
                    // Auto convert semasa paste
                    input.addEventListener('paste', (e) => {
                        setTimeout(() => {
                            const cursorPos = e.target.selectionStart;
                            e.target.value = e.target.value.toUpperCase();
                            e.target.setSelectionRange(cursorPos, cursorPos);
                        }, 0);
                    });
                }
                
                inputElement = input;
            }
            
            group.appendChild(label);
            group.appendChild(inputElement);
            form.appendChild(group);
        }
    });
    
    // Add raw field preview untuk edit mode
    if (!isAdd && row) {
        const rawGroup = document.createElement('div');
        rawGroup.className = 'form-group';
        const rawLabel = document.createElement('label');
        rawLabel.textContent = 'Raw Line (Preview)';
        const rawTextarea = document.createElement('textarea');
        rawTextarea.id = 'field-raw-preview';
        rawTextarea.readOnly = true;
        rawTextarea.value = row.raw || '';
        rawTextarea.className = 'form-control';
        rawGroup.appendChild(rawLabel);
        rawGroup.appendChild(rawTextarea);
        form.appendChild(rawGroup);
    }
}

/**
 * Open add dialog (untuk tambah entry baru)
 */
export function openAddDialog() {
    const currentFileName = getCurrentFileName();
    
    // Allow add untuk announcements dan images sahaja
    if (currentFileName !== 'announcements' && currentFileName !== 'images') {
        showNotification('✗ Fungsi tambah hanya untuk Pengumuman dan Images', 'error');
        return;
    }
    
    setAddMode(true);
    setEditingRowId(null);
    
    const dialog = document.getElementById('edit-dialog');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('dialog-title');
    
    // Set title berdasarkan file type
    if (currentFileName === 'announcements') {
        title.textContent = 'Tambah Pengumuman Baru';
    } else if (currentFileName === 'images') {
        title.textContent = 'Tambah Image Baru';
    }
    
    form.innerHTML = '';
    
    createFormFields(form, null, true);
    
    dialog.style.display = 'flex';
    dialog.classList.remove('hidden');
}

/**
 * Open edit dialog
 * @param {number} rowId - ID row untuk diedit
 */
export function openEditDialog(rowId) {
    setAddMode(false);
    setEditingRowId(rowId);
    
    const row = findRowById(rowId);
    
    if (!row) {
        showNotification('✗ Baris tidak dijumpai', 'error');
        return;
    }
    
    const dialog = document.getElementById('edit-dialog');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('dialog-title');
    
    title.textContent = `Edit Baris #${rowId}`;
    form.innerHTML = '';
    
    createFormFields(form, row, false);
    
    dialog.style.display = 'flex';
    dialog.classList.remove('hidden');
}

/**
 * Close dialog
 */
export function closeDialog() {
    const dialog = document.getElementById('edit-dialog');
    dialog.style.display = 'none';
    dialog.classList.add('hidden');
    setEditingRowId(null);
    setAddMode(false);
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.DialogUtils = {
        openAddDialog,
        openEditDialog,
        closeDialog,
        uploadImage,
        deleteImageFile,
        downloadImageFromUrl
    };
}
