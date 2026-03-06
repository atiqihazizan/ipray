/**
 * Inline functions moved from index.html - config, kematian, livestream, WiFi, etc.
 */
(function () {
	'use strict';

	const Icons = {
		plus: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>`,
		refresh: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>`,
		refreshPage: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>`,
		pencil: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>`,
		trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>`
	};

	function toggleSidebar() {
		const sidebar = document.getElementById('sidebar');
		if (sidebar) sidebar.classList.toggle('open');
	}

	let configData = {};
	const getApiUrl = () => window.Config?.API_URL || 'http://localhost:3001/api';

	async function loadConfigData() {
		try {
			const response = await fetch(`${getApiUrl()}/data/config`);
			const result = await response.json();
			if (result.data && Array.isArray(result.data)) {
				configData = {};
				result.data.forEach(row => {
					if (row.key && row.value) configData[row.key] = row.value;
				});
				if (configData.MARQUEE_ENABLED === undefined) configData.MARQUEE_ENABLED = 'true';
				if (configData.MARQUEE_DURATION === undefined) configData.MARQUEE_DURATION = '25';
				Object.keys(configData).forEach(key => {
					const input = document.getElementById(key);
					if (input) {
						let displayValue = configData[key];
						if (key === 'HOLD_DURATION' || key === 'BLINK_DURATION') {
							const ms = parseFloat(configData[key]);
							if (!isNaN(ms)) displayValue = String(ms / 1000);
						}
						if (input.type === 'checkbox') {
							input.checked = displayValue === 'true' || displayValue === '1';
						} else {
							input.value = displayValue;
						}
						if (input.type === 'color') {
							const textInput = document.getElementById(key + '_text');
							if (textInput) textInput.value = displayValue;
						}
					}
				});
			}
		} catch (error) {
			console.error('Ralat memuat konfigurasi:', error);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Ralat memuat konfigurasi: ' + error.message, 'error');
		}
	}

	async function saveConfigItem(key) {
		try {
			const input = document.getElementById(key);
			if (!input) return;
			const value = input.type === 'checkbox' ? (input.checked ? 'true' : 'false') : input.value;
			let saveValue = value;
			if (key === 'HOLD_DURATION' || key === 'BLINK_DURATION') {
				const seconds = parseFloat(value);
				if (!isNaN(seconds)) saveValue = String(Math.round(seconds * 1000));
			}
			if (key === 'MARQUEE_DURATION') {
				const n = parseInt(value, 10);
				if (!isNaN(n)) saveValue = String(Math.max(5, Math.min(120, n)));
			}
			const response = await fetch(`${getApiUrl()}/data/config`);
			const result = await response.json();
			if (result.data && Array.isArray(result.data)) {
				const rowData = result.data.find(r => r.key === key);
				const formattedRow = `${key}|${saveValue}`;
				if (rowData && rowData.id) {
					const updateResponse = await fetch(`${getApiUrl()}/data/config/${rowData.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ row: formattedRow })
					});
					if (updateResponse.ok) {
						configData[key] = saveValue;
						if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				} else {
					const insertResponse = await fetch(`${getApiUrl()}/data/config/insert`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ row: formattedRow })
					});
					if (insertResponse.ok) {
						configData[key] = saveValue;
						if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				}
			}
		} catch (error) {
			console.error('Error saving config:', error);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Gagal menyimpan: ' + error.message, 'error');
		}
	}

	async function setSystemTime() {
		const input = document.getElementById('system-datetime');
		const value = input && input.value ? input.value.trim() : '';
		const statusEl = document.getElementById('time-set-status');
		if (!value) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Sila pilih tarikh dan masa', 'error');
			return;
		}
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Format tarikh/masa tidak sah', 'error');
			return;
		}
		const dateTimeStr = d.getFullYear() + '-' +
			String(d.getMonth() + 1).padStart(2, '0') + '-' +
			String(d.getDate()).padStart(2, '0') + ' ' +
			String(d.getHours()).padStart(2, '0') + ':' +
			String(d.getMinutes()).padStart(2, '0') + ':' +
			String(d.getSeconds()).padStart(2, '0');
		const apiBase = (getApiUrl() || '').replace(/\/api\/?$/, '');
		try {
			if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = '#64748b'; statusEl.textContent = 'Sedang set masa mesin...'; }
			const response = await fetch(apiBase + '/api/time/set', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dateTime: dateTimeStr })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Gagal set masa mesin');
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Masa mesin berjaya dikemas kini. Paparan akan dimuat semula.', 'success');
			if (input) input.value = '';
			if (statusEl) { statusEl.style.color = '#10b981'; statusEl.textContent = '✓ Berjaya. Paparan akan dimuat semula.'; }
		} catch (err) {
			console.error('Error setting system time:', err);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Gagal set masa mesin: ' + err.message, 'error');
			if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = '#dc2626'; statusEl.textContent = '✗ ' + err.message; }
		}
	}

	async function syncTimeWithInternet() {
		const statusEl = document.getElementById('time-set-status');
		const apiBase = (getApiUrl() || '').replace(/\/api\/?$/, '');
		try {
			if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = '#64748b'; statusEl.textContent = 'Sedang sync dengan internet (NTP)...'; }
			const response = await fetch(apiBase + '/api/time/sync');
			if (!response.ok) throw new Error('Sync gagal');
			await response.json();
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Sync berjaya! Masa kini menggunakan Internet (NTP).', 'success');
			if (statusEl) { statusEl.style.color = '#10b981'; statusEl.textContent = '✓ Sync berjaya.'; }
		} catch (err) {
			console.error('Error syncing time:', err);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Sync gagal. Pastikan ada sambungan internet.', 'error');
			if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = '#dc2626'; statusEl.textContent = '✗ ' + (err.message || 'Sync gagal'); }
		}
	}

	function handleRebootKiosk() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila tunggu dan cuba semula.', 'error');
			return;
		}
		socket.emit('reboot');
	}

	function handleTestSound() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila tunggu dan cuba semula.', 'error');
			return;
		}
		socket.emit('test-sound');
		if (window.NotificationUtils) window.NotificationUtils.showNotification('Bunyi ujian dihantar ke paparan kiosk.', 'success');
	}

	function updateKematianStatus(active) {
		const el = document.getElementById('kematian-status');
		if (!el) return;
		if (active) {
			el.style.background = '#dcfce7';
			el.style.color = '#15803d';
			el.textContent = 'Aktif — Sedang Dipaparkan';
		} else {
			el.style.background = '#f1f5f9';
			el.style.color = '#64748b';
			el.textContent = 'Tidak Aktif';
		}
	}

	function handleKematianPublish() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		const nama = document.getElementById('kematian-nama')?.value?.trim();
		if (!nama) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Sila masukkan nama simati.', 'error');
			return;
		}
		const durasiMinit = parseInt(document.getElementById('kematian-durasi')?.value, 10);
		const durasiSaat = (!isNaN(durasiMinit) && durasiMinit > 0) ? durasiMinit * 60 : 0;
		const data = {
			nama,
			tarikhMeninggal: document.getElementById('kematian-tarikh')?.value || '',
			masaMeninggal: document.getElementById('kematian-masa')?.value || '',
			tempatJenazah: document.getElementById('kematian-tempat')?.value?.trim() || '',
			masaSolat: document.getElementById('kematian-solat')?.value?.trim() || '',
			maklumatTambahan: document.getElementById('kematian-info')?.value?.trim() || '',
			durasiSaat,
			overlayConfig: {
				showDate: document.getElementById('kematian-show-date')?.checked ?? true,
				showSmallTime: document.getElementById('kematian-show-smalltime')?.checked ?? true,
				showMarquee: document.getElementById('kematian-show-marquee')?.checked ?? true,
			},
		};
		socket.emit('kematian:update', data);
		updateKematianStatus(true);
		if (window.NotificationUtils) window.NotificationUtils.showNotification('Pengumuman kematian dipaparkan.', 'success');
	}

	function handleKematianClear() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		socket.emit('kematian:clear');
		updateKematianStatus(false);
		if (window.NotificationUtils) window.NotificationUtils.showNotification('Pengumuman kematian dipadam.', 'success');
	}

	function updateLivestreamStatus(active) {
		const el = document.getElementById('livestream-status');
		if (!el) return;
		if (active) {
			el.style.background = '#fef2f2';
			el.style.color = '#dc2626';
			el.textContent = 'Siaran Aktif';
		} else {
			el.style.background = '#f1f5f9';
			el.style.color = '#64748b';
			el.textContent = 'Tidak Aktif';
		}
	}

	function handleLiveStartFromTable(row) {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		const url = (row.url || '').trim();
		if (!url) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('URL kosong. Sila kemaskini baris ini terlebih dahulu.', 'error');
			return;
		}
		const title = (row.tajuk || '').trim();
		const overlayConfig = {
			showDate: document.getElementById('livestream-show-date')?.checked ?? true,
			showSmallTime: document.getElementById('livestream-show-smalltime')?.checked ?? true,
			showMarquee: document.getElementById('livestream-show-marquee')?.checked ?? true,
		};
		socket.emit('live:start', { url, title, overlayConfig });
		updateLivestreamStatus(true);
		if (window.NotificationUtils) window.NotificationUtils.showNotification('Siaran langsung dimulakan.', 'success');
	}

	function handleLiveStop() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		socket.emit('live:stop');
		updateLivestreamStatus(false);
		if (window.NotificationUtils) window.NotificationUtils.showNotification('Siaran langsung ditamatkan.', 'success');
	}

	function initColorPickerSync() {
		['COLOR_DEFAULT', 'COLOR_NEXT_PRAYER', 'COLOR_WARNING_PRAYER'].forEach(key => {
			const colorInput = document.getElementById(key);
			const textInput = document.getElementById(key + '_text');
			if (colorInput && textInput) {
				colorInput.addEventListener('input', (e) => { textInput.value = e.target.value; });
				textInput.addEventListener('input', (e) => {
					if (/^#[0-9A-F]{6}$/i.test(e.target.value)) colorInput.value = e.target.value;
				});
			}
		});
	}

	function initSystemDatetimeDefault() {
		const systemDatetimeInput = document.getElementById('system-datetime');
		if (systemDatetimeInput) {
			const now = new Date();
			const pad = (n) => String(n).padStart(2, '0');
			systemDatetimeInput.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
		}
	}

	document.addEventListener('DOMContentLoaded', function () {
		initColorPickerSync();
	});

	window.Icons = Icons;
	window.loadConfigData = loadConfigData;
	window.saveConfigItem = saveConfigItem;
	window.handleRebootKiosk = handleRebootKiosk;
	window.toggleSidebar = toggleSidebar;
	window.handleKematianPublish = handleKematianPublish;
	window.handleKematianClear = handleKematianClear;
	window.handleLiveStartFromTable = handleLiveStartFromTable;
	window.handleLiveStop = handleLiveStop;
	window.setSystemTime = setSystemTime;
	window.syncTimeWithInternet = syncTimeWithInternet;
	window.handleTestSound = handleTestSound;
	window.initSystemDatetimeDefault = initSystemDatetimeDefault;
	window.initColorPickerSync = initColorPickerSync;

	window.scanWiFi = () => window.WiFiUtils?.scanWiFi();
	window.configureWiFi = () => window.WiFiUtils?.configureWiFi();
	window.refreshWiFiStatus = () => window.WiFiUtils?.refreshWiFiStatus();
	window.enableHotspot = () => window.WiFiUtils?.enableHotspot();
	window.disableHotspot = () => window.WiFiUtils?.disableHotspot();
	window.refreshHotspotStatus = () => window.WiFiUtils?.refreshHotspotStatus();
})();
