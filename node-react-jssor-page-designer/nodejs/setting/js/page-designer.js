/**
 * Page Designer — Logic utama
 * Drag-drop layout editor untuk page-layouts.json
 *
 * Bergantung kepada:
 *   - interact.js (global window.interact dari interact.min.js)
 *   - window.Config.API_URL dari config.js
 *
 * Scale: Canvas 960×540 = 50% dari base 1920×1080
 */

// ── Konstant ──────────────────────────────────────────────────────────────────
const CANVAS_SCALE = 0.5;        // 960/1920
const BASE_W = 1920;
const BASE_H = 1080;
const GRID_PX = 5;               // 10px base ÷ 2 untuk 50% scale
const SNAP_THRESHOLD = 5;        // snap radius dalam canvas px

// DataField mengikut page type
const DATA_FIELDS = {
  announce:     ['kategori', 'tajuk', 'penceramah', 'tema', 'tarikh', 'masa', 'lokasi', 'sasaran', 'countdown'],
  countDown:    ['event', 'countdownText'],
  home:         ['namaMasjidBlock'],
  kuliahHari:   ['kategoriKuliah', 'penceramah', 'kitab', 'masa', 'imagePenceramah'],
  kuliahWeekly: ['kategoriKuliah', 'penceramah', 'hari', 'imagePenceramah'],
  kuliahBulanan:['tarikhHari', 'jenis', 'penceramah', 'kuliahBulananList'],
  slideshow:    ['slideshowImages'],
};

// ── State ──────────────────────────────────────────────────────────────────────
let allLayouts = null;       // Data penuh dari /api/page-layouts
let currentPage = null;      // Page schema yang sedang diedit (reference ke allLayouts.pages[i])
let selectedBlock = null;    // Block yang sedang dipilih
let isDirty = false;         // Ada perubahan belum disimpan
let gridOn = true;
let snapOn = true;
let undoStack = [];          // Array state JSON untuk undo
let redoStack = [];

const API = () => window.Config?.API_URL || '/api';

// ── Init ───────────────────────────────────────────────────────────────────────

export async function pdInit() {
  pdSetupKeyboardShortcuts();
  await pdLoadLayouts();
  // Jika ada page yang dipilih sebelum ini, render semula
  if (currentPage) {
    pdRenderCanvas();
    pdRenderPagesList();
    pdUpdateToolbar();
    pdUpdateStatus();
  }
}

// ── Load data dari API ────────────────────────────────────────────────────────

async function pdLoadLayouts() {
  try {
    const res = await fetch(`${API()}/page-layouts?t=${Date.now()}`);
    if (!res.ok) throw new Error('Gagal load page-layouts');
    allLayouts = await res.json();
    pdRenderPagesList();
  } catch (err) {
    const list = document.getElementById('pd-pages-list');
    if (list) list.innerHTML = `<div style="padding:12px;color:#f87171;font-size:12px;">Ralat: ${err.message}</div>`;
  }
}

// ── Render senarai pages di sidebar ──────────────────────────────────────────

function pdRenderPagesList() {
  const container = document.getElementById('pd-pages-list');
  if (!container || !allLayouts?.pages) return;

  if (allLayouts.pages.length === 0) {
    container.innerHTML = '<div style="padding:12px;color:#6b7280;font-size:12px;">Tiada page. Tambah page baru dahulu.</div>';
    return;
  }

  container.innerHTML = allLayouts.pages
    .map(page => `
      <div class="pd-page-item ${currentPage?.id === page.id ? 'active' : ''}"
           onclick="pdSelectPage('${page.id}')"
           data-page-id="${page.id}">
        <span class="pd-page-item-label">${escHtml(page.label || page.type)}</span>
        <span class="pd-page-item-badge">${page.blocks?.length || 0}</span>
        <button class="pd-page-toggle" onclick="event.stopPropagation(); pdTogglePageEnabled('${page.id}')"
                title="${page.enabled !== false ? 'Aktif — klik untuk nyahaktif' : 'Nyahaktif — klik untuk aktifkan'}">
          ${page.enabled !== false ? '✓' : '✗'}
        </button>
      </div>
    `).join('');
}

// ── Pilih page untuk diedit ───────────────────────────────────────────────────

function pdSelectPage(pageId) {
  if (isDirty) {
    const ok = confirm('Ada perubahan belum disimpan. Teruskan tanpa simpan?');
    if (!ok) return;
    isDirty = false;
  }

  currentPage = allLayouts.pages.find(p => p.id === pageId);
  if (!currentPage) return;

  selectedBlock = null;
  undoStack = [];
  redoStack = [];

  pdRenderPagesList();
  pdRenderCanvas();
  pdUpdateToolbar();
  pdHideProperties();
}

// ── Render kanvas ─────────────────────────────────────────────────────────────

function pdRenderCanvas() {
  const canvas = document.getElementById('pd-canvas');
  if (!canvas || !currentPage) return;

  // Padam blocks lama (kekalkan bg, hud, empty)
  canvas.querySelectorAll('.pd-block').forEach(el => el.remove());

  // Background
  const bg = document.getElementById('pd-canvas-bg');
  const bgSrc = resolveCanvasBg(currentPage.background);
  const empty = document.getElementById('pd-canvas-empty');
  if (bgSrc) {
    bg.src = bgSrc;
    bg.style.display = '';
    if (empty) empty.style.display = 'none';
  } else {
    bg.style.display = 'none';
    if (empty) { empty.style.display = 'flex'; empty.textContent = 'Tiada background'; }
  }

  // Render setiap block
  (currentPage.blocks || []).forEach(block => pdRenderBlock(block));

  pdUpdateStatus();
}

function resolveCanvasBg(background) {
  if (!background?.src) return '';
  const src = background.src;
  if (['', 'none', 'null'].includes(src.toLowerCase())) return '';
  if (src.startsWith('/') || src.startsWith('http')) return src;
  return `/images/slides/${src}.jpg`;
}

// ── Render satu block pada kanvas ─────────────────────────────────────────────

function pdRenderBlock(block) {
  const canvas = document.getElementById('pd-canvas');
  if (!canvas) return;

  const el = document.createElement('div');
  el.className = 'pd-block';
  el.dataset.blockId = block.id;

  // Scale koordinat ke canvas (50%)
  el.style.left   = `${block.x * CANVAS_SCALE}px`;
  el.style.top    = `${block.y * CANVAS_SCALE}px`;
  el.style.width  = `${block.w * CANVAS_SCALE}px`;
  el.style.height = block.h > 0 ? `${block.h * CANVAS_SCALE}px` : '20px';

  if (block.visible === false) el.style.opacity = '0.35';

  // Label
  const label = document.createElement('div');
  label.className = 'pd-block-label';
  label.textContent = block.label || block.dataField || block.id;
  el.appendChild(label);

  // Preview content
  const content = document.createElement('div');
  content.className = 'pd-block-content';
  content.style.fontSize = `${Math.min(block.style?.fontSize || 40, 60) * CANVAS_SCALE}px`;
  content.style.color = block.style?.color || '#fff';
  content.style.textAlign = block.style?.textAlign || 'center';
  content.style.fontWeight = block.style?.fontWeight || 'normal';

  const previewText = block.staticContent || (block.dataField ? `[${block.dataField}]` : block.label || '');
  content.textContent = previewText;
  el.appendChild(content);

  // Resize handles (sudut sahaja untuk ringkas)
  ['nw','ne','sw','se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `pd-resize-handle ${dir}`;
    el.appendChild(h);
  });

  // Klik untuk pilih
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    pdSelectBlock(block.id);
  });

  canvas.appendChild(el);

  // Attach interact.js drag & resize
  pdAttachInteract(el, block);

  // Mark selected jika ini adalah selectedBlock
  if (selectedBlock?.id === block.id) el.classList.add('selected');
}

// ── Attach interact.js drag & resize ─────────────────────────────────────────

function pdAttachInteract(el, block) {
  if (!window.interact) return;

  // Drag
  window.interact(el).draggable({
    listeners: {
      move(event) {
        const snapSize = snapOn ? GRID_PX : 1;
        let newX = (block.x * CANVAS_SCALE) + event.dx;
        let newY = (block.y * CANVAS_SCALE) + event.dy;

        if (snapOn) {
          newX = Math.round(newX / snapSize) * snapSize;
          newY = Math.round(newY / snapSize) * snapSize;
        }

        newX = Math.max(0, Math.min(newX, 960 - el.offsetWidth));
        newY = Math.max(0, Math.min(newY, 540 - el.offsetHeight));

        el.style.left = `${newX}px`;
        el.style.top  = `${newY}px`;

        // Update schema (base coords)
        block.x = Math.round(newX / CANVAS_SCALE);
        block.y = Math.round(newY / CANVAS_SCALE);

        // Update properties panel jika ini selectedBlock
        if (selectedBlock?.id === block.id) {
          pdSetPropInputValue('pd-prop-x', block.x);
          pdSetPropInputValue('pd-prop-y', block.y);
        }

        // HUD
        pdShowHud(`x:${block.x} y:${block.y} w:${block.w} h:${block.h}`);
        pdMarkDirty();
      }
    }
  });

  // Resize
  window.interact(el).resizable({
    edges: { left: false, right: true, bottom: true, top: false },
    listeners: {
      move(event) {
        const snapSize = snapOn ? GRID_PX : 1;

        let newW = event.rect.width;
        let newH = event.rect.height;

        if (snapOn) {
          newW = Math.round(newW / snapSize) * snapSize;
          newH = Math.round(newH / snapSize) * snapSize;
        }

        el.style.width  = `${newW}px`;
        el.style.height = `${newH}px`;

        block.w = Math.max(10, Math.round(newW / CANVAS_SCALE));
        block.h = Math.max(0, Math.round(newH / CANVAS_SCALE));

        if (selectedBlock?.id === block.id) {
          pdSetPropInputValue('pd-prop-w', block.w);
          pdSetPropInputValue('pd-prop-h', block.h);
        }

        pdShowHud(`x:${block.x} y:${block.y} w:${block.w} h:${block.h}`);
        pdMarkDirty();
      }
    }
  });
}

// ── Pilih block ───────────────────────────────────────────────────────────────

function pdSelectBlock(blockId) {
  document.querySelectorAll('.pd-block').forEach(el => el.classList.remove('selected'));
  selectedBlock = (currentPage?.blocks || []).find(b => b.id === blockId);
  if (!selectedBlock) return;

  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (el) el.classList.add('selected');
  pdShowProperties(selectedBlock);
}

// Klik luar block — deselect
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pd-block') && !e.target.closest('.pd-sidebar')) {
    document.querySelectorAll('.pd-block').forEach(el => el.classList.remove('selected'));
    selectedBlock = null;
    pdHideProperties();
  }
});

// ── Properties panel ──────────────────────────────────────────────────────────

function pdShowProperties(block) {
  const empty = document.getElementById('pd-prop-empty');
  const fields = document.getElementById('pd-prop-fields');
  if (empty) empty.style.display = 'none';
  if (fields) fields.style.display = '';

  // Populate fields
  pdSetPropInputValue('pd-prop-label', block.label || '');
  pdSetPropInputValue('pd-prop-x', block.x);
  pdSetPropInputValue('pd-prop-y', block.y);
  pdSetPropInputValue('pd-prop-w', block.w);
  pdSetPropInputValue('pd-prop-h', block.h);
  pdSetPropInputValue('pd-prop-static', block.staticContent || '');
  pdSetPropInputValue('pd-prop-fontsize', block.style?.fontSize || 40);
  pdSetPropInputValue('pd-prop-transdur', block.transitionDuration ?? 800);
  pdSetPropInputValue('pd-prop-transdelay', block.transitionDelay ?? 0);

  // Color
  const color = block.style?.color || '#FFFFFF';
  const colorInput = document.getElementById('pd-prop-color');
  const colorText = document.getElementById('pd-prop-color-text');
  if (colorInput) colorInput.value = colorToHex(color);
  if (colorText) colorText.value = color;

  // Font family
  pdSetSelectValue('pd-prop-fontfamily', block.style?.fontFamily || 'system-ui');

  // DataField dropdown
  pdPopulateDataFields(currentPage?.type);
  pdSetSelectValue('pd-prop-datafield', block.dataField || '');

  // Bold
  const boldBtn = document.getElementById('pd-prop-bold-btn');
  if (boldBtn) boldBtn.classList.toggle('active', block.style?.fontWeight === 'bold');

  // Text align
  ['left','center','right'].forEach(a => {
    const btn = document.getElementById(`pd-align-${a}`);
    if (btn) btn.classList.toggle('active', block.style?.textAlign === a);
  });

  // Transition
  pdSetSelectValue('pd-prop-transition', block.transition || '');

  // Visible
  const visCheckbox = document.getElementById('pd-prop-visible');
  if (visCheckbox) visCheckbox.checked = block.visible !== false;
}

function pdHideProperties() {
  const empty = document.getElementById('pd-prop-empty');
  const fields = document.getElementById('pd-prop-fields');
  if (empty) empty.style.display = '';
  if (fields) fields.style.display = 'none';
}

function pdPopulateDataFields(pageType) {
  const select = document.getElementById('pd-prop-datafield');
  if (!select) return;
  const fields = DATA_FIELDS[pageType] || [];
  const currentVal = select.value;
  select.innerHTML = '<option value="">— Tiada (guna Statik) —</option>';
  fields.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
  });
  select.value = currentVal;
}

// ── Update block properties ───────────────────────────────────────────────────

window.pdUpdateBlockProp = function(key, value) {
  if (!selectedBlock) return;
  pdSaveUndoState();
  selectedBlock[key] = value;

  // Re-render block di kanvas untuk refleks perubahan posisi/saiz
  if (['x','y','w','h','visible'].includes(key)) {
    const el = document.querySelector(`[data-block-id="${selectedBlock.id}"]`);
    if (el) {
      if (key === 'x') el.style.left = `${value * CANVAS_SCALE}px`;
      if (key === 'y') el.style.top  = `${value * CANVAS_SCALE}px`;
      if (key === 'w') el.style.width = `${value * CANVAS_SCALE}px`;
      if (key === 'h') el.style.height = value > 0 ? `${value * CANVAS_SCALE}px` : '20px';
      if (key === 'visible') el.style.opacity = value === false ? '0.35' : '1';
    }
  }

  pdMarkDirty();
};

window.pdUpdateBlockStyle = function(key, value) {
  if (!selectedBlock) return;
  pdSaveUndoState();
  if (!selectedBlock.style) selectedBlock.style = {};
  selectedBlock.style[key] = value;

  // Update preview di kanvas
  const el = document.querySelector(`[data-block-id="${selectedBlock.id}"]`);
  const contentEl = el?.querySelector('.pd-block-content');
  if (contentEl) {
    if (key === 'color') contentEl.style.color = value;
    if (key === 'textAlign') contentEl.style.textAlign = value;
    if (key === 'fontSize') contentEl.style.fontSize = `${Math.min(value, 60) * CANVAS_SCALE}px`;
    if (key === 'fontWeight') contentEl.style.fontWeight = value;
  }

  // Update align button states
  if (key === 'textAlign') {
    ['left','center','right'].forEach(a => {
      const btn = document.getElementById(`pd-align-${a}`);
      if (btn) btn.classList.toggle('active', a === value);
    });
  }

  pdMarkDirty();
};

window.pdUpdateBlockColorFromText = function(value) {
  const colorInput = document.getElementById('pd-prop-color');
  if (colorInput) colorInput.value = colorToHex(value);
  pdUpdateBlockStyle('color', value);
};

window.pdToggleBold = function() {
  if (!selectedBlock) return;
  const isBold = selectedBlock.style?.fontWeight === 'bold';
  pdUpdateBlockStyle('fontWeight', isBold ? 'normal' : 'bold');
  const btn = document.getElementById('pd-prop-bold-btn');
  if (btn) btn.classList.toggle('active', !isBold);
};

window.pdTogglePageEnabled = function(pageId) {
  const page = allLayouts.pages.find(p => p.id === pageId);
  if (!page) return;
  pdSaveUndoState();
  page.enabled = page.enabled === false ? true : false;
  pdRenderPagesList();
  pdMarkDirty();
};

// ── Tambah block baru ─────────────────────────────────────────────────────────

window.pdAddBlock = function(kind) {
  if (!currentPage) { alert('Pilih page dahulu'); return; }
  pdSaveUndoState();

  const newBlock = {
    id: `blk-${Date.now()}`,
    kind,
    label: kind === 'static' ? 'Teks Statik' : kind === 'divider' ? 'Garis' : 'Block Baru',
    dataField: null,
    staticContent: kind === 'static' ? 'Teks di sini' : kind === 'divider' ? '' : '',
    x: 100, y: 100, w: 400, h: 60,
    style: {
      fontSize: 40,
      color: '#FFFFFF',
      fontFamily: 'system-ui',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    transition: 'CLIP|LR',
    transitionDuration: 800,
    transitionDelay: 0,
    visible: true,
  };

  currentPage.blocks = currentPage.blocks || [];
  currentPage.blocks.push(newBlock);
  pdRenderBlock(newBlock);
  pdSelectBlock(newBlock.id);
  pdMarkDirty();
  pdUpdateStatus();
};

// ── Padam block ───────────────────────────────────────────────────────────────

window.pdDeleteSelectedBlock = function() {
  if (!selectedBlock || !currentPage) return;
  if (!confirm(`Padam block "${selectedBlock.label || selectedBlock.id}"?`)) return;
  pdSaveUndoState();

  const el = document.querySelector(`[data-block-id="${selectedBlock.id}"]`);
  if (el) el.remove();

  currentPage.blocks = currentPage.blocks.filter(b => b.id !== selectedBlock.id);
  selectedBlock = null;
  pdHideProperties();
  pdMarkDirty();
  pdUpdateStatus();
};

// ── Simpan ke API ─────────────────────────────────────────────────────────────

window.pdSave = async function() {
  if (!currentPage) return;

  const btn = document.getElementById('pd-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  try {
    const res = await fetch(`${API()}/page-layouts/${currentPage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPage),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    isDirty = false;
    pdUpdateStatus();
    pdShowToast('Layout disimpan!', 'success');
  } catch (err) {
    pdShowToast(`Gagal simpan: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan'; }
  }
};

// ── Undo / Redo ───────────────────────────────────────────────────────────────

function pdSaveUndoState() {
  if (!currentPage) return;
  undoStack.push(JSON.stringify(currentPage));
  if (undoStack.length > 30) undoStack.shift();
  redoStack = [];
}

window.pdUndo = function() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(currentPage));
  const prev = JSON.parse(undoStack.pop());
  Object.assign(currentPage, prev);
  pdRenderCanvas();
  pdHideProperties();
  selectedBlock = null;
  pdMarkDirty();
};

window.pdRedo = function() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(currentPage));
  const next = JSON.parse(redoStack.pop());
  Object.assign(currentPage, next);
  pdRenderCanvas();
  pdHideProperties();
  selectedBlock = null;
  pdMarkDirty();
};

// ── Grid toggle ───────────────────────────────────────────────────────────────

window.pdToggleGrid = function() {
  gridOn = !gridOn;
  const canvas = document.getElementById('pd-canvas');
  const btn = document.getElementById('pd-grid-btn');
  if (canvas) canvas.classList.toggle('grid-on', gridOn);
  if (btn) btn.classList.toggle('active', gridOn);
};

// ── HUD ───────────────────────────────────────────────────────────────────────

function pdShowHud(text) {
  const hud = document.getElementById('pd-hud');
  if (!hud) return;
  hud.style.display = '';
  hud.textContent = text;
}

// ── Status bar ────────────────────────────────────────────────────────────────

function pdUpdateStatus() {
  const pageName = document.getElementById('pd-status-page');
  const blocks   = document.getElementById('pd-status-blocks');
  const badge    = document.getElementById('pd-status-badge');
  if (pageName) pageName.textContent = currentPage ? `Page: ${currentPage.label || currentPage.id}` : '—';
  if (blocks)   blocks.textContent = currentPage ? `${currentPage.blocks?.length || 0} blocks` : '—';
  if (badge) {
    badge.textContent = isDirty ? 'Belum Simpan' : 'Terkini';
    badge.className = `pd-statusbar-badge ${isDirty ? 'unsaved' : 'saved'}`;
  }
}

function pdUpdateToolbar() {
  const name = document.getElementById('pd-toolbar-page-name');
  if (name) name.textContent = currentPage ? `${currentPage.label || currentPage.id}` : 'Pilih Page';
}

function pdMarkDirty() {
  isDirty = true;
  pdUpdateStatus();
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

let _keyboardSetup = false;
function pdSetupKeyboardShortcuts() {
  if (_keyboardSetup) return;
  _keyboardSetup = true;
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); pdUndo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); pdRedo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); pdSave(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedBlock) pdDeleteSelectedBlock();
    }
  });
}

// ── Toast notification ────────────────────────────────────────────────────────

function pdShowToast(message, type = 'info') {
  const toast = document.getElementById('notification');
  if (!toast) return;
  toast.style.backgroundColor = type === 'error' ? '#b91c1c' : type === 'success' ? '#065f46' : '#1e3a5f';
  toast.style.color = '#fff';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '13px';
  toast.textContent = message;
  toast.style.transform = 'translateX(0)';
  setTimeout(() => { toast.style.transform = 'translateX(500px)'; }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pdSetPropInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function pdSetSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
  if (el.value !== String(value)) {
    // Tambah option jika tidak dijumpai
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    el.appendChild(opt);
    el.value = value;
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function colorToHex(color) {
  if (!color) return '#ffffff';
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return color;
  const div = document.createElement('div');
  div.style.color = color;
  document.body.appendChild(div);
  const c = getComputedStyle(div).color;
  document.body.removeChild(div);
  const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!m) return '#ffffff';
  return '#' + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('');
}

// Expose untuk onclick dalam HTML
window.pdSelectPage = pdSelectPage;
window.pdRenderPagesList = pdRenderPagesList;
