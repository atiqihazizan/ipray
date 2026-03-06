/**
 * Config sub-tabs: load partial HTML for each card in Config page
 */
const CONFIG_SUB_TABS = [
	{ id: 'waktu-solat', label: 'Waktu Solat', file: 'config-tabs/waktu-solat.html' },
	{ id: 'hebahan', label: 'Hebahan', file: 'config-tabs/hebahan.html' },
	{ id: 'takwim', label: 'Takwim', file: 'config-tabs/takwim.html' },
	{ id: 'title-home', label: 'Title Home', file: 'config-tabs/title-home.html' },
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
export async function showConfigSubTab(tabId) {
	const panel = document.getElementById('config-tab-panel');
	const subnav = document.getElementById('config-subnav');
	if (!panel || !subnav) return;

	const tab = CONFIG_SUB_TABS.find(t => t.id === tabId);
	if (!tab) return;

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
		if (tabId === 'hebahan' && typeof window.loadTable === 'function') {
			window.loadTable('hebahan');
		}
		if (tabId === 'takwim' && window.TableUtils && typeof window.TableUtils.loadTodayTakwim === 'function') {
			if (typeof window.loadZoneDropdown === 'function') {
				window.loadZoneDropdown();
			}
			window.TableUtils.loadTodayTakwim();
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
 * Load first config sub-tab if panel is empty (e.g. when switching to Config tab)
 */
export function loadConfigSubTabIfNeeded() {
	const panel = document.getElementById('config-tab-panel');
	if (!panel || panel.innerHTML.trim() !== '') return;
	showConfigSubTab(CONFIG_SUB_TABS[0].id);
}

if (typeof window !== 'undefined') {
	window.showConfigSubTab = showConfigSubTab;
	window.loadConfigSubTabIfNeeded = loadConfigSubTabIfNeeded;
	window.CONFIG_SUB_TABS = CONFIG_SUB_TABS;
}
