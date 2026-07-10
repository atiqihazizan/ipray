/**
 * Config sub-tabs: load partial HTML for each card in Config page
 */
const CONFIG_SUB_TABS = [
	{ id: 'title-home', label: 'Title Home', file: 'config-tabs/title-home.html' },
	{ id: 'slides', label: 'Slides', file: 'config-tabs/slides.html' },
	{ id: 'hebahan', label: 'Hebahan', file: 'config-tabs/hebahan.html' },
	{ id: 'waktu-solat', label: 'Waktu Solat', file: 'config-tabs/waktu-solat.html' },
	{ id: 'takwim', label: 'Takwim', file: 'config-tabs/takwim.html' },
	{ id: 'masa-sistem', label: 'Masa Sistem', file: 'config-tabs/masa-sistem.html' },
	{ id: 'wifi', label: 'WiFi', file: 'config-tabs/wifi.html' },
	{ id: 'hotspot', label: 'Hotspot', file: 'config-tabs/hotspot.html' },
	{ id: 'system', label: 'System', file: 'config-tabs/system.html' }
];

let currentConfigSubTab = null;

/**
 * Load a config sub-tab by id
 * @param {string} tabId - id from CONFIG_SUB_TABS
 */
/**
 * Tunjuk senarai config (subnav), sembunyikan form. Dipanggil oleh butang Kembali.
 */
export function configFormBack() {
	const subnav = document.getElementById('config-subnav');
	const form = document.getElementById('config-form');
	if (subnav) subnav.style.display = '';
	if (form) {
		form.style.display = 'none';
		form.classList.add('config-form-hidden');
	}
}

export async function showConfigSubTab(tabId) {
	const panel = document.getElementById('config-tab-panel');
	const subnav = document.getElementById('config-subnav');
	const form = document.getElementById('config-form');
	if (!panel || !subnav) return;

	const tab = CONFIG_SUB_TABS.find(t => t.id === tabId);
	if (!tab) return;

	subnav.style.display = 'none';
	if (form) {
		form.style.display = 'flex';
		form.classList.remove('config-form-hidden');
	}

	panel.innerHTML = '<div class="text-center py-8 text-gray-500">Memuat...</div>';
	subnav.querySelectorAll('.config-subtab').forEach(btn => {
		btn.classList.toggle('active', btn.getAttribute('data-config-tab') === tabId);
	});

	try {
		const base = window.location.pathname.replace(/\/?index\.html$/, '').replace(/\/?$/, '') || '.';
		const url = base + '/' + tab.file;
		const resp = await fetch(url);
		if (!resp.ok) throw new Error(resp.statusText);
		const html = await resp.text();
		panel.innerHTML = html;
		currentConfigSubTab = tabId;
		if (typeof window.initColorPickerSync === 'function') {
			window.initColorPickerSync();
		}
		if (typeof window.loadConfigData === 'function') {
			window.loadConfigData();
		}
		if (tabId === 'slides') {
			if (typeof window.initSlidesOrderBtns === 'function') window.initSlidesOrderBtns();
			if (typeof window.initSlidesVisibleCheckboxes === 'function') window.initSlidesVisibleCheckboxes();
		}
		if (tabId === 'hebahan' && typeof window.loadTable === 'function') {
			window.loadTable('hebahan');
		}
		if (tabId === 'takwim') {
			if (typeof window.loadZoneDropdown === 'function') {
				window.loadZoneDropdown();
			}
			if (typeof window.loadTodayTakwim === 'function') {
				window.loadTodayTakwim();
			}
		}
		// Re-run WiFi/Hotspot init if those tabs
		if (tabId === 'wifi' && typeof window.refreshWiFiStatus === 'function') {
			window.refreshWiFiStatus();
		}
		if (tabId === 'hotspot' && typeof window.refreshHotspotStatus === 'function') {
			window.refreshHotspotStatus();
		}
		if (tabId === 'masa-sistem' && document.getElementById('system-datetime')) {
			const now = new Date();
			const pad = n => String(n).padStart(2, '0');
			document.getElementById('system-datetime').value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
		}
	} catch (err) {
		console.error('Ralat memuat config tab:', err);
		panel.innerHTML = '<div class="text-center py-8 text-red-600">Gagal memuat: ' + (err.message || 'Unknown error') + '</div>';
	}
}

/**
 * Pastikan view config: tunjuk subnav (senarai), sembunyikan form (bila buka tab Config)
 */
export function loadConfigSubTabIfNeeded() {
	const subnav = document.getElementById('config-subnav');
	const form = document.getElementById('config-form');
	if (subnav) subnav.style.display = '';
	if (form) {
		form.style.display = 'none';
		form.classList.add('config-form-hidden');
	}
}

if (typeof window !== 'undefined') {
	window.showConfigSubTab = showConfigSubTab;
	window.loadConfigSubTabIfNeeded = loadConfigSubTabIfNeeded;
	window.configFormBack = configFormBack;
	window.CONFIG_SUB_TABS = CONFIG_SUB_TABS;
}
