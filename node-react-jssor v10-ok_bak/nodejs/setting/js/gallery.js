/**
 * Gallery Functions
 * Paparan grid kad imej dengan lightbox zoom untuk tab Galeri
 */

import { setCurrentFileName, setCurrentData, setCurrentColumns } from './state.js';
import { showNotification } from './notification.js';

const Icons = {
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>`,
};

/**
 * Resolve URL penuh untuk imej
 */
function resolveImageUrl(imagePath) {
    const BASE_URL = window.Config.BASE_URL || window.Config.API_URL.replace(/\/api\/?$/, '');
    if (!imagePath) return `${BASE_URL}/images/noimage.png`;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/images/${imagePath}`;
}

/**
 * Bina satu kad imej
 */
function buildCard(row) {
    const BASE_URL = window.Config.BASE_URL || window.Config.API_URL.replace(/\/api\/?$/, '');
    const imageUrl = resolveImageUrl(row.imagePath);
    const noimage = `${BASE_URL}/images/noimage.png`;

    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('data-row-id', row.id);

    // -- Image wrapper (clickable → lightbox)
    const imgWrap = document.createElement('div');
    imgWrap.className = 'gallery-img-wrap';
    imgWrap.title = 'Klik untuk zoom';
    imgWrap.addEventListener('click', () => openLightbox(imageUrl, row.imageCode, row.imagePath));

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = row.imageCode || '';
    img.loading = 'lazy';
    img.onerror = function () {
        this.src = noimage;
        this.onerror = null;
    };
    imgWrap.appendChild(img);

    // -- Footer: kod + tindakan
    const footer = document.createElement('div');
    footer.className = 'gallery-footer';

    const code = document.createElement('span');
    code.className = 'gallery-code';
    code.textContent = row.imageCode || '—';
    code.title = row.imagePath || '';

    const actions = document.createElement('div');
    actions.className = 'gallery-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon btn-edit';
    editBtn.title = 'Edit';
    editBtn.innerHTML = `<span>${Icons.pencil}</span>`;
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.openEditDialog === 'function') window.openEditDialog(row.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `<span>${Icons.trash}</span>`;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.deleteRow === 'function') window.deleteRow(row.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    footer.appendChild(code);
    footer.appendChild(actions);

    card.appendChild(imgWrap);
    card.appendChild(footer);

    return card;
}

/**
 * Buka lightbox dengan imej yang dipilih
 */
function openLightbox(url, label, path) {
    let overlay = document.getElementById('gallery-lightbox');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gallery-lightbox';
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" id="lightbox-close-btn" title="Tutup (Esc)">✕</button>
                <img id="lightbox-img" src="" alt="" />
                <div class="lightbox-label" id="lightbox-label"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeLightbox();
        });
        document.getElementById('lightbox-close-btn').addEventListener('click', closeLightbox);
    }

    document.getElementById('lightbox-img').src = url;
    document.getElementById('lightbox-label').textContent = label
        ? `${label}${path ? '  ·  ' + path : ''}`
        : (path || '');

    // Paksa reflow supaya animasi berjalan
    overlay.classList.remove('active');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('active'));
    });

    // Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Tutup lightbox
 */
function closeLightbox() {
    const overlay = document.getElementById('gallery-lightbox');
    if (overlay) {
        overlay.classList.remove('active');
        // Kosongkan src selepas animasi tutup
        setTimeout(() => {
            const img = document.getElementById('lightbox-img');
            if (img) img.src = '';
        }, 300);
    }
}

/**
 * Muat dan render galeri imej
 */
export async function loadGallery() {
    setCurrentFileName('images');

    const container = document.getElementById('gallery-grid');
    if (!container) return;

    container.innerHTML = '<div class="gallery-loading">Memuat gambar...</div>';

    try {
        const API_URL = window.Config.API_URL;
        const response = await fetch(`${API_URL}/data/images`);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        const data = result.data ?? [];

        setCurrentData(data);
        setCurrentColumns(result.columns ?? []);

        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<div class="gallery-empty">Tiada gambar dalam galeri. Tambah gambar baharu dengan butang ＋ di atas.</div>';
            return;
        }

        data.forEach((row) => {
            container.appendChild(buildCard(row));
        });

    } catch (error) {
        console.error('Error loading gallery:', error);
        container.innerHTML = `<div class="gallery-error">Ralat memuat galeri: ${error.message}</div>`;
        showNotification('✗ Gagal memuat galeri', 'error');
    }
}

// Export untuk browser environment
if (typeof window !== 'undefined') {
    window.GalleryUtils = {
        loadGallery,
        closeLightbox,
    };
}
