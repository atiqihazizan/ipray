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
 * @param {{ imagesList?: Array<{imageCode:string, imagePath:string}> }} options - Optional; imagesList untuk dropdown slides
 */
function createFormFields(form, row, isAdd, options = {}) {
    const currentFileName = getCurrentFileName();
    const currentColumns = getCurrentColumns();
    const imagesList = options.imagesList || [];
    const API_URL = typeof window !== 'undefined' && window.Config ? window.Config.API_URL : '';
    const BASE_URL = typeof window !== 'undefined' && window.Config ? window.Config.BASE_URL : (API_URL ? API_URL.replace(/\/api\/?$/, '') : '');

    currentColumns.forEach(col => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = col.charAt(0).toUpperCase() + col.slice(1);
        label.setAttribute('for', `field-${col}`);

        // Slides: tunjuk unit saat untuk duration supaya jelas (UI dalam saat, storage dalam ms)
        if (currentFileName === 'slides' && col === 'duration') {
            label.textContent = 'Duration (s)';
        }

        // Kuliah: label mesra pengguna
        if (currentFileName === 'kuliah' && col === 'speaker') {
            label.textContent = 'Penceramah';
        }
        if (currentFileName === 'kuliah' && col === 'speakerId') {
            label.textContent = 'Gambar Penceramah';
        }
        if (currentFileName === 'kuliah' && col === 'title') {
            label.textContent = 'Nama Kitab / Tajuk Kuliah';
        }
        // Kuliah-override: label kolom
        if (currentFileName === 'kuliah-override') {
            const kbLabels = { format: 'Format', date: 'Tarikh (DD-MM-YYYY)', tahun: 'Tahun (pilihan)', bulan: 'Bulan (1-12)', type: 'Type', hari: 'Hari (cth: 1-30 atau 1,2,3)', replace: 'Ganti paparan (1=ya)', notes: 'Catatan', showAnnounce: 'Paparkan di announcement (1=ya)', title: 'Tajuk (announcement)', tempat: 'Tempat', jemputan: 'Jemputan' };
            if (kbLabels[col]) label.textContent = kbLabels[col];
        }
        // Countdown: label kolom
        if (currentFileName === 'countdowns') {
            const cdLabels = { format: 'Format', date: 'Tarikh', tahun: 'Tahun (kosong = setiap tahun)', bulan: 'Bulan', hari: 'Hari', event: 'Event', windowDays: 'Papar bila tinggal ___ hari (0 = selalu)' };
            if (cdLabels[col]) label.textContent = cdLabels[col];
        }
        
        // Kuliah-batal: format dropdown (Tarikh tunggal / Range)
        if (currentFileName === 'kuliah-override' && col === 'format') {
            const select = document.createElement('select');
            select.id = 'field-format';
            select.name = 'format';
            select.className = 'form-control';
            const fmt = !isAdd && row[col] ? (row[col] || 'single').toLowerCase() : 'single';
            // [{ value: 'single', label: 'Tarikh tunggal (DD-MM-YYYY|type|notes)' }, { value: 'range', label: 'Range bulan/hari Masihi (tahun?|bulan|type|hari|flag|catatan)' }, { value: 'hijri', label: 'Tarikh Hijri (bulan|hari|type|flag|catatan)' }].forEach(opt => {
            [{ value: 'single', label: 'Tarikh tunggal' }, { value: 'range', label: 'Range bulan/hari Masihi' }, { value: 'hijri', label: 'Tarikh Hijri' }].forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (fmt === opt.value) o.selected = true;
                select.appendChild(o);
            });
            group.appendChild(label);
            group.appendChild(select);
            form.appendChild(group);
            select.addEventListener('change', () => {
                const v = select.value;
                form.querySelectorAll('[data-kb-single]').forEach(el => { el.style.display = v === 'single' ? '' : 'none'; });
                form.querySelectorAll('[data-kb-range]').forEach(el => { el.style.display = (v === 'range' || v === 'hijri') ? '' : 'none'; });
                form.querySelectorAll('[data-kb-hijri]').forEach(el => { el.style.display = v === 'hijri' ? '' : 'none'; });
            });
            return;
        }
        // Kuliah-batal: date (format single) - toggle by format
        if (currentFileName === 'kuliah-override' && col === 'date') {
            group.setAttribute('data-kb-single', '1');
            const fmt = !isAdd && row.format ? (row.format || 'single').toLowerCase() : 'single';
            if (fmt === 'range' || fmt === 'hijri') group.style.display = 'none';
        }
        // Kuliah-override: tahun, bulan, hari, replace (format range atau hijri) - toggle by format
        if (currentFileName === 'kuliah-override' && (col === 'tahun' || col === 'bulan' || col === 'hari' || col === 'replace')) {
            group.setAttribute('data-kb-range', '1');
            const fmt = !isAdd && row.format ? (row.format || 'single').toLowerCase() : 'single';
            if (fmt === 'single') group.style.display = 'none';
        }
        // Kuliah-override: showAnnounce, title, tempat, jemputan (format hijri sahaja - untuk announcement)
        if (currentFileName === 'kuliah-override' && (col === 'showAnnounce' || col === 'title' || col === 'tempat' || col === 'jemputan')) {
            group.setAttribute('data-kb-hijri', '1');
            const fmt = !isAdd && row.format ? (row.format || 'single').toLowerCase() : 'single';
            if (fmt !== 'hijri') group.style.display = 'none';
        }
        
        // Slides: type adalah key, tidak boleh diubah (disabled)
        if (currentFileName === 'slides' && col === 'type') {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `field-${col}`;
            input.name = col;
            input.value = isAdd ? '' : (row[col] || '');
            input.disabled = true;
            input.className = 'form-control';
            input.style.opacity = '0.85';
            input.style.cursor = 'not-allowed';
            input.title = 'Type adalah key dan tidak boleh diubah';
            group.appendChild(label);
            group.appendChild(input);
            form.appendChild(group);
            return;
        }
        
        // Special handling untuk speakerId dalam kuliah table: dropdown pilih image code + preview
        if (currentFileName === 'kuliah' && col === 'speakerId') {
            const wrap = document.createElement('div');
            const previewContainer = document.createElement('div');
            previewContainer.className = 'image-preview-container';
            previewContainer.style.marginBottom = '12px';
            const previewImg = document.createElement('img');
            previewImg.id = `speakerId-image-preview-${col}`;
            previewImg.className = 'image-preview';
            previewImg.style.maxWidth = '200px';
            previewImg.style.maxHeight = '200px';
            previewImg.style.borderRadius = '8px';
            previewImg.style.border = '1px solid #e5e7eb';
            previewImg.style.objectFit = 'cover';
            previewImg.style.display = 'none';
            previewImg.alt = 'Preview';
            previewContainer.appendChild(previewImg);

            const select = document.createElement('select');
            select.id = `field-${col}`;
            select.name = col;
            select.className = 'form-control';
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = '-- Pilih image code --';
            select.appendChild(emptyOpt);
            const currentVal = !isAdd && row[col] ? (row[col] || '').trim() : '';
            const codesAdded = new Set(['']);
            imagesList.forEach(im => {
                const code = (im.imageCode || '').trim();
                if (codesAdded.has(code)) return;
                codesAdded.add(code);
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = code;
                if (currentVal === code) opt.selected = true;
                select.appendChild(opt);
            });
            if (currentVal && !codesAdded.has(currentVal)) {
                const opt = document.createElement('option');
                opt.value = currentVal;
                opt.textContent = currentVal + ' (tiada dalam Images)';
                opt.selected = true;
                select.appendChild(opt);
            }
            const updatePreview = () => {
                const code = select.value.trim();
                const found = imagesList.find(r => (r.imageCode || '').trim() === code);
                if (found && found.imagePath) {
                    const path = found.imagePath;
                    const url = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}${path}`;
                    previewImg.src = url;
                    previewImg.style.display = 'block';
                } else {
                    previewImg.removeAttribute('src');
                    previewImg.style.display = 'none';
                }
            };
            select.addEventListener('change', updatePreview);
            updatePreview();

            wrap.appendChild(previewContainer);
            wrap.appendChild(select);
            group.appendChild(label);
            group.appendChild(wrap);
            form.appendChild(group);
            return;
        }

        // Special handling untuk week dalam kuliah table: radio button (w1-w4)
        if (currentFileName === 'kuliah' && col === 'week') {
            label.textContent = 'Minggu';

            const WEEK_OPTIONS = [
                { value: 'w1', label: 'Minggu 1' },
                { value: 'w2', label: 'Minggu 2' },
                { value: 'w3', label: 'Minggu 3' },
                { value: 'w4', label: 'Minggu 4' }
            ];

            const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : '';

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '8px 16px';

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = currentVal || 'w1';

            WEEK_OPTIONS.forEach(opt => {
                const wrap = document.createElement('label');
                wrap.style.display = 'inline-flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '6px';
                wrap.style.cursor = 'pointer';

                const rb = document.createElement('input');
                rb.type = 'radio';
                rb.name = 'kuliah-week';
                rb.value = opt.value;
                rb.checked = (currentVal || 'w1') === opt.value;
                rb.addEventListener('change', () => {
                    if (rb.checked) hiddenInput.value = opt.value;
                });

                const span = document.createElement('span');
                span.textContent = opt.label;

                wrap.appendChild(rb);
                wrap.appendChild(span);
                container.appendChild(wrap);
            });

            group.appendChild(label);
            group.appendChild(container);
            group.appendChild(hiddenInput);
            form.appendChild(group);
            return;
        }

        // Special handling untuk type dalam kuliah table: radio button (ks/km/kd/kk)
        if (currentFileName === 'kuliah' && col === 'type') {
            label.textContent = 'Jenis Kuliah';

            const TYPE_OPTIONS = [
                { value: 'ks', label: 'KS - Kuliah Subuh' },
                { value: 'km', label: 'KM - Kuliah Maghrib' },
                { value: 'kd', label: 'KD - Kuliah Dhuha' },
                { value: 'kk', label: 'KK - Kuliah Khas' }
            ];

            const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : '';

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '8px 16px';

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = currentVal || 'km';

            TYPE_OPTIONS.forEach(opt => {
                const wrap = document.createElement('label');
                wrap.style.display = 'inline-flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '6px';
                wrap.style.cursor = 'pointer';

                const rb = document.createElement('input');
                rb.type = 'radio';
                rb.name = 'kuliah-type';
                rb.value = opt.value;
                rb.checked = (currentVal || 'km') === opt.value;
                rb.addEventListener('change', () => {
                    if (rb.checked) hiddenInput.value = opt.value;
                });

                const span = document.createElement('span');
                span.textContent = opt.label;

                wrap.appendChild(rb);
                wrap.appendChild(span);
                container.appendChild(wrap);
            });

            group.appendChild(label);
            group.appendChild(container);
            group.appendChild(hiddenInput);
            form.appendChild(group);
            return;
        }

        // Special handling untuk day dalam kuliah table: radio button (h0-h6)
        if (currentFileName === 'kuliah' && col === 'day') {
            label.textContent = 'Hari';

            const DAY_OPTIONS = [
                { value: 'h0', label: 'Ahad' },
                { value: 'h1', label: 'Isnin' },
                { value: 'h2', label: 'Selasa' },
                { value: 'h3', label: 'Rabu' },
                { value: 'h4', label: 'Khamis' },
                { value: 'h5', label: 'Jumaat' },
                { value: 'h6', label: 'Sabtu' }
            ];

            const currentVal = !isAdd && row && row[col] ? String(row[col]).trim() : '';

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '8px 16px';

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = currentVal || 'h0';

            DAY_OPTIONS.forEach(opt => {
                const wrap = document.createElement('label');
                wrap.style.display = 'inline-flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '6px';
                wrap.style.cursor = 'pointer';

                const rb = document.createElement('input');
                rb.type = 'radio';
                rb.name = 'kuliah-day';
                rb.value = opt.value;
                rb.checked = (currentVal || 'h0') === opt.value;
                rb.addEventListener('change', () => {
                    if (rb.checked) hiddenInput.value = opt.value;
                });

                const span = document.createElement('span');
                span.textContent = opt.label;

                wrap.appendChild(rb);
                wrap.appendChild(span);
                container.appendChild(wrap);
            });

            group.appendChild(label);
            group.appendChild(container);
            group.appendChild(hiddenInput);
            form.appendChild(group);
            return;
        }
        
        // Special handling untuk column image dalam slides table: dropdown pilih image + preview
        if (currentFileName === 'slides' && col === 'image') {
            const wrap = document.createElement('div');
            const previewContainer = document.createElement('div');
            previewContainer.className = 'image-preview-container';
            previewContainer.style.marginBottom = '12px';
            const previewImg = document.createElement('img');
            previewImg.id = `slides-image-preview-${col}`;
            previewImg.className = 'image-preview';
            previewImg.style.maxWidth = '200px';
            previewImg.style.maxHeight = '160px';
            previewImg.style.borderRadius = '8px';
            previewImg.style.border = '1px solid #e5e7eb';
            previewImg.style.objectFit = 'cover';
            previewImg.style.display = 'none';
            previewImg.alt = 'Preview';
            previewContainer.appendChild(previewImg);

            const select = document.createElement('select');
            select.id = `field-${col}`;
            select.name = col;
            select.className = 'form-control';
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = '-- Pilih image --';
            select.appendChild(emptyOpt);
            const currentVal = !isAdd && row[col] ? (row[col] || '').trim() : '';
            const codesAdded = new Set(['']);
            imagesList.forEach(im => {
                const code = (im.imageCode || '').trim();
                if (codesAdded.has(code)) return;
                codesAdded.add(code);
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = code;
                if (currentVal === code) opt.selected = true;
                select.appendChild(opt);
            });
            if (currentVal && !codesAdded.has(currentVal)) {
                const opt = document.createElement('option');
                opt.value = currentVal;
                opt.textContent = currentVal + ' (tiada dalam Images)';
                opt.selected = true;
                select.appendChild(opt);
            }
            const updatePreview = () => {
                const code = select.value.trim();
                const found = imagesList.find(r => (r.imageCode || '').trim() === code);
                if (found && found.imagePath) {
                    const path = found.imagePath;
                    const url = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/images/${path}`;
                    previewImg.src = url;
                    previewImg.style.display = 'block';
                } else {
                    previewImg.removeAttribute('src');
                    previewImg.style.display = 'none';
                }
            };
            select.addEventListener('change', updatePreview);
            updatePreview();

            wrap.appendChild(previewContainer);
            wrap.appendChild(select);
            group.appendChild(label);
            group.appendChild(wrap);
            form.appendChild(group);
            return;
        }

        // Special handling untuk column checkbox dalam slides: pilihan overlay (date, solat-time, solat-time-small)
        if (currentFileName === 'slides' && col === 'checkbox') {
            const CHECKBOX_OPTIONS = [
                { value: 'date', label: 'Date (Tarikh)' },
                { value: 'solat-time', label: 'Solat + Time (Waktu solat + jam besar)' },
                { value: 'solat-time-small', label: 'Next Solat + Small Time' }
            ];
            const currentVal = !isAdd && row[col] ? String(row[col] || '').trim() : '';
            const selectedSet = new Set(currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : []);

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = currentVal;

            const container = document.createElement('div');
            container.className = 'checkbox-group';
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '12px 16px';

            const updateHidden = (chkContainer) => {
                const checked = chkContainer.querySelectorAll('input[type="checkbox"]:checked');
                const vals = Array.from(checked).map(cb => cb.value).filter(Boolean);
                hiddenInput.value = vals.join(',');
            };

            CHECKBOX_OPTIONS.forEach(opt => {
                const labelWrap = document.createElement('label');
                labelWrap.style.display = 'inline-flex';
                labelWrap.style.alignItems = 'center';
                labelWrap.style.gap = '6px';
                labelWrap.style.cursor = 'pointer';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = opt.value;
                cb.checked = selectedSet.has(opt.value);
                cb.addEventListener('change', () => updateHidden(container));
                const span = document.createElement('span');
                span.textContent = opt.label;
                labelWrap.appendChild(cb);
                labelWrap.appendChild(span);
                container.appendChild(labelWrap);
            });

            group.appendChild(label);
            group.appendChild(container);
            group.appendChild(hiddenInput);
            form.appendChild(group);
            return;
        }

        // Special handling untuk column hide dalam slides: checkbox Sembunyikan slide
        if (currentFileName === 'slides' && col === 'hide') {
            label.textContent = 'Sembunyikan slide';
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            const isHidden = !isAdd && (row[col] === '1' || row[col] === true);
            hiddenInput.value = isHidden ? '1' : '0';
            const labelWrap = document.createElement('label');
            labelWrap.style.display = 'inline-flex';
            labelWrap.style.alignItems = 'center';
            labelWrap.style.gap = '8px';
            labelWrap.style.cursor = 'pointer';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = isHidden;
            cb.addEventListener('change', () => {
                hiddenInput.value = cb.checked ? '1' : '0';
            });
            const span = document.createElement('span');
            span.textContent = 'Sembunyikan slide (tidak papar dalam slider)';
            labelWrap.appendChild(cb);
            labelWrap.appendChild(span);
            group.appendChild(label);
            group.appendChild(labelWrap);
            group.appendChild(hiddenInput);
            form.appendChild(group);
            return;
        }

        // Special handling untuk column image dalam slideshow table: upload sahaja, category slideshow, wajib upload
        if (currentFileName === 'slideshow' && col === 'image') {
            label.textContent = 'Image (wajib upload sebelum simpan)';
            const uploadContainer = document.createElement('div');
            uploadContainer.className = 'image-upload-container';
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
            if (!isAdd && row[col]) {
                const imageUrl = row[col].startsWith('/') ? `${BASE_URL}${row[col]}` : `${BASE_URL}${row[col]}`;
                previewImg.src = imageUrl;
                previewImg.style.display = 'block';
            }
            previewImg.onerror = function() { this.style.display = 'none'; };
            previewContainer.appendChild(previewImg);
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = `file-${col}`;
            fileInput.accept = 'image/*';
            fileInput.className = 'form-control';
            fileInput.style.marginBottom = '8px';
            const uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.className = 'btn-upload';
            uploadBtn.textContent = '📤 Upload Image';
            uploadBtn.style.marginBottom = '8px';
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            hiddenInput.value = isAdd ? '' : (row[col] || '');
            uploadBtn.onclick = async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) {
                    showNotification('✗ Sila pilih fail image', 'error');
                    return;
                }
                try {
                    uploadBtn.disabled = true;
                    uploadBtn.textContent = 'Memuat naik...';
                    const result = await uploadImage(file, 'slideshow');
                    hiddenInput.value = result.path || '';
                    previewImg.src = `${BASE_URL}${result.path}`;
                    previewImg.style.display = 'block';
                    showNotification('✓ Image berjaya dimuat naik', 'success');
                } catch (err) {
                    showNotification('✗ ' + (err.message || 'Upload gagal'), 'error');
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '📤 Upload Image';
                }
            };
            uploadContainer.appendChild(previewContainer);
            uploadContainer.appendChild(fileInput);
            uploadContainer.appendChild(uploadBtn);
            uploadContainer.appendChild(hiddenInput);
            group.appendChild(label);
            group.appendChild(uploadContainer);
            form.appendChild(group);
            return;
        }

        // Special handling untuk validFrom/validTo dalam slideshow: date input (optional) + butang clear
        if (currentFileName === 'slideshow' && (col === 'validFrom' || col === 'validTo')) {
            label.textContent = col === 'validFrom' ? 'Valid From (pilihan, YYYY-MM-DD)' : 'Valid To (pilihan, YYYY-MM-DD)';
            const input = document.createElement('input');
            input.type = 'date';
            input.id = `field-${col}`;
            input.name = col;
            input.value = isAdd ? '' : (row[col] || '');
            input.className = 'form-control';
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '8px';
            wrapper.style.alignItems = 'center';
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.textContent = 'Clear';
            clearBtn.className = 'btn-cancel';
            clearBtn.style.padding = '6px 12px';
            clearBtn.style.flexShrink = '0';
            clearBtn.onclick = () => { input.value = ''; };
            wrapper.appendChild(input);
            wrapper.appendChild(clearBtn);
            group.appendChild(label);
            group.appendChild(wrapper);
            form.appendChild(group);
            return;
        }

        // Special handling untuk imagePath dalam images table (path diset auto via upload/download)
        if (currentFileName === 'images' && col === 'imagePath') {
            label.textContent = 'Image';
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
                const imageUrl = row[col].startsWith('/') ? `${BASE_URL}${row[col]}` : `${BASE_URL}/images/${row[col]}`;
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
            
            // Detect category dari existing path (untuk edit mode)
            let defaultCategory = 'penceramah';
            if (!isAdd && row[col]) {
                if (row[col].includes('/images/slides/') || row[col].includes('images/slides/')) {
                    defaultCategory = 'slides';
                }
            }
            
            categorySelect.innerHTML = `
                <option value="penceramah" ${defaultCategory === 'penceramah' ? 'selected' : ''}>Penceramah</option>
                <option value="slides" ${defaultCategory === 'slides' ? 'selected' : ''}>Slides</option>
            `;
            
            // Update default path bila category berubah (untuk add mode sahaja)
            if (isAdd) {
                categorySelect.addEventListener('change', () => {
                    const defaultPath = categorySelect.value === 'slides' 
                        ? '/images/slides/noimage.png' 
                        : '/images/penceramah/Random_user.svg';
                    hiddenInput.value = defaultPath;
                });
            }
            
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
            
            // Hidden input untuk imagePath value (path diset auto via upload/download, tidak tunjuk kepada user)
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `field-${col}`;
            hiddenInput.name = col;
            
            // Set default value berdasarkan category untuk add mode
            if (isAdd) {
                // Default value berdasarkan defaultCategory (default: penceramah)
                const defaultPath = defaultCategory === 'slides' 
                    ? '/images/slides/noimage.png' 
                    : '/images/penceramah/Random_user.svg';
                hiddenInput.value = defaultPath;
            } else {
                hiddenInput.value = row[col] || '';
            }
            
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
                    previewImg.src = `${BASE_URL}${result.path}`;
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
                    previewImg.src = `${BASE_URL}${result.path}`;
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
                    if (currentFileName === 'announcements') input.value = 'PENGUMUMAN';
                    }

                // Countdowns: format dropdown
                if (currentFileName === 'countdowns' && col === 'format') {
                    const select = document.createElement('select');
                    select.id = 'field-format';
                    select.name = 'format';
                    select.className = 'form-control';
                    const fmt = !isAdd && row[col] ? (row[col] || 'date').toLowerCase() : 'date';
                    [
                        // { value: 'date', label: 'Tarikh tetap (COUNTDOWN|YYYY-MM-DD|event|windowDays)' },
                        // { value: 'masihi', label: 'Masihi ulang tahun (COUNTDOWN_MASIHI|bulan|hari|event|windowDays)' },
                        // { value: 'hijri', label: 'Hijri ulang tahun (COUNTDOWN_HIJRI|tahun|bulan|hari|event|windowDays)' }
                        { value: 'date', label: 'Tarikh tetap' },
                        { value: 'masihi', label: 'Masihi ulang tahun' },
                        { value: 'hijri', label: 'Hijri ulang tahun' }
                    ].forEach(opt => {
                        const o = document.createElement('option');
                        o.value = opt.value;
                        o.textContent = opt.label;
                        if (fmt === opt.value) o.selected = true;
                        select.appendChild(o);
                    });
                    group.appendChild(label);
                    group.appendChild(select);
                    form.appendChild(group);
                    select.addEventListener('change', () => {
                        const v = select.value;
                        form.querySelectorAll('[data-cd-date]').forEach(el => { el.style.display = v === 'date' ? '' : 'none'; });
                        form.querySelectorAll('[data-cd-range]').forEach(el => { el.style.display = (v === 'masihi' || v === 'hijri') ? '' : 'none'; });
                        form.querySelectorAll('[data-cd-hijri]').forEach(el => { el.style.display = v === 'hijri' ? '' : 'none'; });
                    });
                    return;
                }
                if (col === 'date' && currentFileName === 'countdowns') {
                    group.setAttribute('data-cd-date', '1');
                    const fmt = !isAdd && row.format ? (row.format || 'date').toLowerCase() : 'date';
                    if (fmt !== 'date') group.style.display = 'none';
                    input.type = 'date';
                    if (!isAdd && row[col]) {
                        const raw = String(row[col]).trim();
                        const datePart = raw.split(' ')[0];
                        if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) input.value = datePart;
                    }
                }
                if (col === 'tahun' && currentFileName === 'countdowns') {
                    group.setAttribute('data-cd-range', '1');
                    group.setAttribute('data-cd-hijri', '1');
                    const fmt = !isAdd && row.format ? (row.format || 'date').toLowerCase() : 'date';
                    if (fmt !== 'hijri') group.style.display = 'none';
                    input.type = 'number';
                    input.placeholder = 'Kosong = setiap tahun';
                    input.min = '1440';
                    input.max = '1500';
                }
                if (col === 'bulan' && currentFileName === 'countdowns') {
                    group.setAttribute('data-cd-range', '1');
                    const fmt = !isAdd && row.format ? (row.format || 'date').toLowerCase() : 'date';
                    if (fmt === 'date') group.style.display = 'none';
                    input.type = 'number';
                    input.min = '1';
                    input.max = '12';
                    input.placeholder = '1-12 (10=Syawal)';
                }
                if (col === 'hari' && currentFileName === 'countdowns') {
                    group.setAttribute('data-cd-range', '1');
                    const fmt = !isAdd && row.format ? (row.format || 'date').toLowerCase() : 'date';
                    if (fmt === 'date') group.style.display = 'none';
                    input.placeholder = '1-31 (Masihi) atau 1-30 (Hijri)';
                }
                if (col === 'windowDays' && currentFileName === 'countdowns') {
                    input.type = 'number';
                    input.min = '0';
                    input.placeholder = 'Contoh: 0 = selalu, 30 = tunjuk bila tinggal 30 hari atau kurang';
                }
                
                // Tukar kepada datetime-local untuk datetime field
                if (col === 'datetime' && currentFileName === 'announcements') {
                    input.type = 'datetime-local';
                    // Convert "YYYY-MM-DD HH:MM" to "YYYY-MM-DDTHH:MM" untuk datetime-local
                    if (!isAdd && row[col]) {
                        input.value = row[col].replace(' ', 'T');
                    }
                }
                
                // Special handling untuk date field dalam kuliah-override: date input
                if (col === 'date' && currentFileName === 'kuliah-override') {
                    input.type = 'date';
                    // Convert DD-MM-YYYY to YYYY-MM-DD for date input
                    if (!isAdd && row[col]) {
                        const dateParts = row[col].split('-');
                        if (dateParts.length === 3) {
                            input.value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        }
                    }
                }
                // Kuliah-batal: tahun (nombor, pilihan)
                if (col === 'tahun' && currentFileName === 'kuliah-override') {
                    input.type = 'number';
                    input.placeholder = 'Kosong = setiap tahun';
                    input.min = '2020';
                    input.max = '2040';
                }
                // Kuliah-batal: bulan (1-12)
                if (col === 'bulan' && currentFileName === 'kuliah-override') {
                    input.type = 'number';
                    input.min = '1';
                    input.max = '12';
                    input.placeholder = '1-12';
                }
                // Kuliah-batal: hari (range atau senarai)
                if (col === 'hari' && currentFileName === 'kuliah-override') {
                    input.placeholder = 'cth: 1-30 atau 1,2,3,5';
                }
                // Kuliah-batal: replace dropdown (0/1)
                if (col === 'replace' && currentFileName === 'kuliah-override') {
                    const selectReplace = document.createElement('select');
                    selectReplace.id = `field-${col}`;
                    selectReplace.name = col;
                    selectReplace.className = 'form-control';
                    const rv = !isAdd && row[col] != null ? String(row[col]).trim() : '0';
                    [{ value: '0', label: '0 - Papar DITANGGUH' }, { value: '1', label: '1 - Ganti dengan catatan' }].forEach(opt => {
                        const o = document.createElement('option');
                        o.value = opt.value;
                        o.textContent = opt.label;
                        if (rv === opt.value) o.selected = true;
                        selectReplace.appendChild(o);
                    });
                    group.appendChild(label);
                    group.appendChild(selectReplace);
                    form.appendChild(group);
                    return;
                }
                // Kuliah-override: showAnnounce dropdown (0/1) - paparkan di announcement
                if (col === 'showAnnounce' && currentFileName === 'kuliah-override') {
                    const selectShow = document.createElement('select');
                    selectShow.id = `field-${col}`;
                    selectShow.name = col;
                    selectShow.className = 'form-control';
                    const sv = !isAdd && row[col] != null ? String(row[col]).trim() : '0';
                    [{ value: '0', label: '0 - Tidak' }, { value: '1', label: '1 - Ya (paparkan di Pengumuman)' }].forEach(opt => {
                        const o = document.createElement('option');
                        o.value = opt.value;
                        o.textContent = opt.label;
                        if (sv === opt.value) o.selected = true;
                        selectShow.appendChild(o);
                    });
                    group.appendChild(label);
                    group.appendChild(selectShow);
                    form.appendChild(group);
                    return;
                }
                
                // Special handling untuk type field dalam kuliah-override: dropdown
                if (col === 'type' && currentFileName === 'kuliah-override') {
                    const select = document.createElement('select');
                    select.id = `field-${col}`;
                    select.name = col;
                    select.className = 'form-control';
                    const options = [
                        { value: 'ks', label: 'KS - Kuliah Subuh' },
                        { value: 'km', label: 'KM - Kuliah Maghrib' },
                        { value: 'kd', label: 'KD - Kuliah Dhuha' },
                        { value: 'kk', label: 'KK - Kuliah Khas' }
                    ];
                    const currentVal = !isAdd && row[col] ? (row[col] || '').trim() : '';
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        if (currentVal === opt.value) option.selected = true;
                        select.appendChild(option);
                    });
                    
                    group.appendChild(label);
                    group.appendChild(select);
                    form.appendChild(group);
                    return;
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
}

/**
 * Open add dialog (untuk tambah entry baru)
 */
export function openAddDialog() {
    const currentFileName = getCurrentFileName();
    const currentColumns = getCurrentColumns();
    
    // Allow add untuk announcements, countdowns, images, slideshow, dan kuliah-override
    if (currentFileName !== 'announcements' && currentFileName !== 'countdowns' && currentFileName !== 'images' && currentFileName !== 'slideshow' && currentFileName !== 'kuliah-override') {
        showNotification('✗ Fungsi tambah hanya untuk Pengumuman, Countdown, Images, Slideshow, dan Override Kuliah', 'error');
        return;
    }
    
    // Check jika columns sudah loaded (untuk pastikan table sudah dimuat)
    if (!currentColumns || currentColumns.length === 0) {
        showNotification('✗ Sila tunggu data dimuat terlebih dahulu', 'error');
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
    } else if (currentFileName === 'countdowns') {
        title.textContent = 'Tambah Countdown Baru';
    } else if (currentFileName === 'images') {
        title.textContent = 'Tambah Image Baru';
    } else if (currentFileName === 'slideshow') {
        title.textContent = 'Tambah Slideshow Baru';
    } else if (currentFileName === 'kuliah-override') {
        title.textContent = 'Tambah Rekod Override Kuliah';
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
export async function openEditDialog(rowId) {
    setAddMode(false);
    setEditingRowId(rowId);
    
    const row = findRowById(rowId);
    
    if (!row) {
        showNotification('✗ Baris tidak dijumpai', 'error');
        return;
    }

    const currentFileName = getCurrentFileName();
    let imagesList = [];
    if (currentFileName === 'slides' || currentFileName === 'kuliah') {
        try {
            const API_URL = window.Config.API_URL;
            const res = await fetch(`${API_URL}/data/images`);
            if (res.ok) {
                const data = await res.json();
                let list = data.data || [];
                if (currentFileName === 'slides') {
                    list = list.filter(im => (im.imagePath || '').includes('/slides/'));
                } else if (currentFileName === 'kuliah') {
                    list = list.filter(im => (im.imagePath || '').includes('/penceramah/'));
                }
                imagesList = list;
            }
        } catch (e) {
            console.warn(`Could not load images for ${currentFileName} dropdown:`, e);
        }
    }
    
    const dialog = document.getElementById('edit-dialog');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('dialog-title');
    if (currentFileName === 'announcements') {
        title.textContent = 'Edit Pengumuman';
    } else if (currentFileName === 'countdowns') {
        title.textContent = 'Edit Countdown';
    } else {
        title.textContent = `Edit Baris #${rowId}`;
    }
    form.innerHTML = '';
    
    createFormFields(form, row, false, { imagesList });
    
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
