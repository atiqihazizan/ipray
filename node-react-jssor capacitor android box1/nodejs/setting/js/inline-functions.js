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
	const getApiUrl = () => window.Config?.API_URL || 'http://localhost:4101/api';

	async function loadConfigData() {
		try {
			const response = await fetch(`${getApiUrl()}/data/config`);
			const result = await response.json();
			if (result.data && Array.isArray(result.data)) {
				configData = {};
				result.data.forEach(row => {
					if (row.key && row.value) configData[row.key] = row.value;
				});
			if (configData.MARQUEE_DURATION === undefined) configData.MARQUEE_DURATION = '25';
			if (configData.MARQUEE_SEPARATOR === undefined) configData.MARQUEE_SEPARATOR = '•';
			if (configData.MARQUEE_SHOW_MOSQUE_NAME === undefined) configData.MARQUEE_SHOW_MOSQUE_NAME = 'true';
			if (configData.HOME_TITLE_VISIBLE === undefined) configData.HOME_TITLE_VISIBLE = 'true';
			if (configData.HOME_TITLE_DURATION_SEC === undefined) configData.HOME_TITLE_DURATION_SEC = '10';
			if (configData.COLOR_CURRENT_TIME === undefined) configData.COLOR_CURRENT_TIME = '#FFFF00';
			if (configData.COLOR_DEFAULT === undefined) configData.COLOR_DEFAULT = '#FFFF00';
			if (configData.WARNING_START_MINUTES === undefined && configData.WARNING_START_SECONDS !== undefined) {
				configData.WARNING_START_MINUTES = (parseInt(configData.WARNING_START_SECONDS, 10) || 30) / 60;
			}
			if (configData.WARNING_START_MINUTES === undefined) configData.WARNING_START_MINUTES = '5';
			if (configData.IQAMAH_DURATION_MIN === undefined) configData.IQAMAH_DURATION_MIN = '10';
			if (configData.SOLAT_DURATION_MIN === undefined) configData.SOLAT_DURATION_MIN = '10';
			const sepBtn = document.getElementById('MARQUEE_SEPARATOR_btn');
			if (sepBtn) sepBtn.textContent = configData.MARQUEE_SEPARATOR;
			Object.keys(configData).forEach(key => {
				const toggleBtn = document.getElementById(key + '_toggle');
				if (toggleBtn) {
					updateToggleButton(toggleBtn, configData[key] === 'true' || configData[key] === '1');
					return;
				}
				const input = document.getElementById(key);
				if (input) {
					const displayValue = configData[key];
					if (input.type === 'checkbox') {
						input.checked = displayValue === 'true' || displayValue === '1';
					} else {
						input.value = displayValue;
					}
					if (input.type === 'color') {
						const textInput = document.getElementById(key + '_text');
						if (textInput) textInput.value = displayValue;
					}
				} else {
					const radio = document.querySelector(`input[name="${key}"][value="${configData[key]}"]`);
					if (radio) radio.checked = true;
				}
			});
			if (typeof window.syncWaktuSolatMins === 'function') {
				window.syncWaktuSolatMins();
			}
			}
		} catch (error) {
			console.error('Ralat memuat konfigurasi:', error);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Ralat memuat konfigurasi: ' + error.message, 'error');
		}
	}

	async function saveConfigItem(key, valueOverride = null) {
		try {
			let saveValue;
			if (valueOverride !== null) {
				saveValue = valueOverride;
			} else {
				const input = document.getElementById(key) || document.querySelector(`input[name="${key}"]:checked`);
				if (!input) return;
				const value = input.type === 'checkbox' ? (input.checked ? 'true' : 'false') : input.value;
				saveValue = value;
				if (key === 'MARQUEE_DURATION') {
					const n = parseInt(value, 10);
					if (!isNaN(n)) saveValue = String(Math.max(5, Math.min(120, n)));
				}
				if (key === 'WARNING_START_MINUTES') {
					const n = parseFloat(value);
					if (!isNaN(n)) saveValue = String(Math.max(1, n));
				}
				if (key === 'IQAMAH_DURATION_MIN') {
					const n = parseFloat(value);
					const azan = parseFloat(document.getElementById('WARNING_START_MINUTES')?.value) || 1;
					if (!isNaN(n)) saveValue = String(Math.max(azan, n));
				}
				if (key === 'SOLAT_DURATION_MIN') {
					const n = parseFloat(value);
					const iqamah = parseFloat(document.getElementById('IQAMAH_DURATION_MIN')?.value) || 1;
					if (!isNaN(n)) saveValue = String(Math.max(iqamah, n));
				}
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
						// if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				} else {
					const insertResponse = await fetch(`${getApiUrl()}/data/config/insert`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ row: formattedRow })
					});
					if (insertResponse.ok) {
						configData[key] = saveValue;
						// if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				}
			}
		} catch (error) {
			console.error('Error saving config:', error);
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Gagal menyimpan: ' + error.message, 'error');
		}
	}

	function updateToggleButton(btn, isActive) {
		if (isActive) {
			if (!btn.classList.contains('switch')) btn.textContent = 'Aktif';
			btn.classList.add('btn-toggle--on');
			btn.classList.remove('btn-toggle--off');
		} else {
			if (!btn.classList.contains('switch')) btn.textContent = 'Tidak Aktif';
			btn.classList.add('btn-toggle--off');
			btn.classList.remove('btn-toggle--on');
		}
	}

	async function toggleConfigBool(key) {
		try {
			const btn = document.getElementById(key + '_toggle');
			const current = configData[key] === 'true' || configData[key] === '1';
			const newValue = current ? 'false' : 'true';
			const response = await fetch(`${getApiUrl()}/data/config`);
			const result = await response.json();
			if (result.data && Array.isArray(result.data)) {
				const rowData = result.data.find(r => r.key === key);
				const formattedRow = `${key}|${newValue}`;
				if (rowData && rowData.id) {
					const updateResponse = await fetch(`${getApiUrl()}/data/config/${rowData.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ row: formattedRow })
					});
					if (updateResponse.ok) {
						configData[key] = newValue;
						if (btn) updateToggleButton(btn, newValue === 'true');
						// if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				} else {
					const insertResponse = await fetch(`${getApiUrl()}/data/config/insert`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ row: formattedRow })
					});
					if (insertResponse.ok) {
						configData[key] = newValue;
						if (btn) updateToggleButton(btn, newValue === 'true');
						// if (window.NotificationUtils) window.NotificationUtils.showNotification(`${key} disimpan`, 'success');
					}
				}
			}
		} catch (error) {
			console.error('Error toggling config:', error);
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
			// if (window.NotificationUtils) window.NotificationUtils.showNotification('Masa mesin berjaya dikemas kini. Paparan akan dimuat semula.', 'success');
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
			// if (window.NotificationUtils) window.NotificationUtils.showNotification('Sync berjaya! Masa kini menggunakan Internet (NTP).', 'success');
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
		// if (window.NotificationUtils) window.NotificationUtils.showNotification('Bunyi ujian dihantar ke paparan kiosk.', 'success');
	}

	let kematianCountdownTimer = null;

	function formatRemaining(sec) {
		const s = Math.max(0, sec | 0);
		const m = Math.floor(s / 60);
		const r = s % 60;
		return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
	}

	function stopKematianCountdown() {
		if (kematianCountdownTimer) clearInterval(kematianCountdownTimer);
		kematianCountdownTimer = null;
		const el = document.getElementById('kematian-countdown');
		if (el) el.style.display = 'none';
	}

	function startKematianCountdownFromData(data) {
		stopKematianCountdown();
		const durasiRaw = data && data.durasiSaat;
		const durasi = (typeof durasiRaw === 'number') ? durasiRaw : parseInt(durasiRaw || '0', 10);
		if (!durasi || durasi <= 0) return;
		const tsRaw = data && data.timestamp;
		const ts = (typeof tsRaw === 'number') ? tsRaw : parseInt(tsRaw || String(Date.now()), 10);
		const endMs = ts + durasi * 1000;
		const el = document.getElementById('kematian-countdown');
		if (!el) return;
		function tick() {
			const remain = Math.ceil((endMs - Date.now()) / 1000);
			if (remain <= 0) {
				el.textContent = '00:00';
				stopKematianCountdown();
				return;
			}
			el.textContent = `Baki: ${formatRemaining(remain)}`;
			el.style.display = 'block';
		}
		tick();
		kematianCountdownTimer = setInterval(tick, 1000);
	}

	function setKematianInputsDisabled(disabled) {
		['kematian-nama', 'kematian-tempat', 'kematian-solat', 'kematian-info', 'kematian-durasi'].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.disabled = !!disabled;
		});
	}

	function updateKematianStatus(active, data = null) {
		const el = document.getElementById('kematian-status');
		if (el) {
			el.setAttribute('data-active', active ? '1' : '0');
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
		const btn = document.getElementById('kematian-toggle-btn');
		if (btn) {
			if (active) {
				btn.textContent = 'Padam Pengumuman';
				btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
			} else {
				btn.textContent = 'Papar Pengumuman';
				btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
			}
		}

		setKematianInputsDisabled(active);
		if (active) {
			startKematianCountdownFromData(data);
		} else {
			stopKematianCountdown();
			const durasiEl = document.getElementById('kematian-durasi');
			if (durasiEl) durasiEl.value = '0';
		}
	}

	function handleKematianToggle() {
		const statusEl = document.getElementById('kematian-status');
		const active = statusEl && statusEl.getAttribute('data-active') === '1';
		if (active) {
			if (typeof handleKematianClear === 'function') handleKematianClear();
		} else {
			if (typeof handleKematianPublish === 'function') handleKematianPublish();
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
			tempatJenazah: document.getElementById('kematian-tempat')?.value?.trim() || '',
			masaSolat: document.getElementById('kematian-solat')?.value?.trim() || '',
			maklumatTambahan: document.getElementById('kematian-info')?.value?.trim() || '',
			durasiSaat,
			overlayConfig: getOverlayFromConfigBit(KEMATIAN_SHOW_KEY),
		};
		socket.emit('kematian:update', data);
		updateKematianStatus(true, { ...data, timestamp: Date.now() });
		// if (window.NotificationUtils) window.NotificationUtils.showNotification('Pengumuman kematian dipaparkan.', 'success');
	}

	function handleKematianClear() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		socket.emit('kematian:clear');
		updateKematianStatus(false);
		// if (window.NotificationUtils) window.NotificationUtils.showNotification('Pengumuman kematian dipadam.', 'success');
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

	function updateLivestreamPlayState(active) {
		document.querySelectorAll('.btn-live-play').forEach(el => { el.style.display = active ? 'none' : ''; });
		const stopBtn = document.getElementById('livestream-stop-btn');
		if (stopBtn) stopBtn.style.display = active ? 'inline-flex' : 'none';
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
		const overlayConfig = getOverlayFromConfigBit(LIVESTREAM_SHOW_KEY);
		socket.emit('live:start', { url, title, overlayConfig });
		updateLivestreamStatus(true);
		if (typeof window.updateLivestreamPlayState === 'function') window.updateLivestreamPlayState(true);
		// if (window.NotificationUtils) window.NotificationUtils.showNotification('Siaran langsung dimulakan.', 'success');
	}

	function handleLiveStop() {
		const socket = window.AppState?.getSocket();
		if (!socket || !socket.connected) {
			if (window.NotificationUtils) window.NotificationUtils.showNotification('Socket tidak disambung. Sila pastikan sambungan aktif.', 'error');
			return;
		}
		socket.emit('live:stop');
		updateLivestreamStatus(false);
		if (typeof window.updateLivestreamPlayState === 'function') window.updateLivestreamPlayState(false);
	}

	const KEMATIAN_SHOW_KEY = 'KEMATIAN_SHOW';
	const LIVESTREAM_SHOW_KEY = 'LIVESTREAM_SHOW';
	const OVERLAY_BIT = { DATE: 1, SMALLTIME: 2, MARQUEE: 4 };
	const OVERLAY_DEFAULT_BITS = 7;

	function parseOverlayBits(configKey) {
		const raw = configData[configKey];
		if (raw !== undefined && raw !== '') {
			const n = parseInt(raw, 10);
			if (!isNaN(n) && n >= 0 && n <= 7) return n;
		}
		// Legacy: baca dari key lama (KEMATIAN_SHOW_DATE dll / LIVESTREAM_SHOW_xxx)
		if (configKey === KEMATIAN_SHOW_KEY) {
			let bits = 0;
			if (configData['KEMATIAN_SHOW_DATE'] === 'true' || configData['KEMATIAN_SHOW_DATE'] === '1') bits |= OVERLAY_BIT.DATE;
			if (configData['KEMATIAN_SHOW_SMALLTIME'] === 'true' || configData['KEMATIAN_SHOW_SMALLTIME'] === '1') bits |= OVERLAY_BIT.SMALLTIME;
			if (configData['KEMATIAN_SHOW_MARQUEE'] === 'true' || configData['KEMATIAN_SHOW_MARQUEE'] === '1') bits |= OVERLAY_BIT.MARQUEE;
			return bits || OVERLAY_DEFAULT_BITS;
		}
		if (configKey === LIVESTREAM_SHOW_KEY) {
			let bits = 0;
			if (configData['LIVESTREAM_SHOW_DATE'] === 'true' || configData['LIVESTREAM_SHOW_DATE'] === '1') bits |= OVERLAY_BIT.DATE;
			if (configData['LIVESTREAM_SHOW_SMALLTIME'] === 'true' || configData['LIVESTREAM_SHOW_SMALLTIME'] === '1') bits |= OVERLAY_BIT.SMALLTIME;
			if (configData['LIVESTREAM_SHOW_MARQUEE'] === 'true' || configData['LIVESTREAM_SHOW_MARQUEE'] === '1') bits |= OVERLAY_BIT.MARQUEE;
			return bits || OVERLAY_DEFAULT_BITS;
		}
		return OVERLAY_DEFAULT_BITS;
	}

	function getOverlayFromConfigBit(configKey) {
		const bits = parseOverlayBits(configKey);
		return {
			showDate: (bits & OVERLAY_BIT.DATE) !== 0,
			showSmallTime: (bits & OVERLAY_BIT.SMALLTIME) !== 0,
			showMarquee: (bits & OVERLAY_BIT.MARQUEE) !== 0,
		};
	}

	function saveKematianShowBits() {
		const date = document.getElementById('kematian-show-date');
		const smalltime = document.getElementById('kematian-show-smalltime');
		const marquee = document.getElementById('kematian-show-marquee');
		let bits = 0;
		if (date && date.checked) bits |= OVERLAY_BIT.DATE;
		if (smalltime && smalltime.checked) bits |= OVERLAY_BIT.SMALLTIME;
		if (marquee && marquee.checked) bits |= OVERLAY_BIT.MARQUEE;
		saveConfigItem(KEMATIAN_SHOW_KEY, String(bits));
	}

	function saveLivestreamShowBits() {
		const date = document.getElementById('livestream-show-date');
		const smalltime = document.getElementById('livestream-show-smalltime');
		const marquee = document.getElementById('livestream-show-marquee');
		let bits = 0;
		if (date && date.checked) bits |= OVERLAY_BIT.DATE;
		if (smalltime && smalltime.checked) bits |= OVERLAY_BIT.SMALLTIME;
		if (marquee && marquee.checked) bits |= OVERLAY_BIT.MARQUEE;
		saveConfigItem(LIVESTREAM_SHOW_KEY, String(bits));
	}

	function loadKematianOverlayConfig() {
		const bits = parseOverlayBits(KEMATIAN_SHOW_KEY);
		const ids = ['kematian-show-date', 'kematian-show-smalltime', 'kematian-show-marquee'];
		const mask = [OVERLAY_BIT.DATE, OVERLAY_BIT.SMALLTIME, OVERLAY_BIT.MARQUEE];
		ids.forEach((id, i) => {
			const el = document.getElementById(id);
			if (el) {
				el.checked = (bits & mask[i]) !== 0;
				if (!el._overlayChangeBound) {
					el._overlayChangeBound = true;
					el.addEventListener('change', saveKematianShowBits);
				}
			}
		});
	}

	function loadLivestreamOverlayConfig() {
		const bits = parseOverlayBits(LIVESTREAM_SHOW_KEY);
		const ids = ['livestream-show-date', 'livestream-show-smalltime', 'livestream-show-marquee'];
		const mask = [OVERLAY_BIT.DATE, OVERLAY_BIT.SMALLTIME, OVERLAY_BIT.MARQUEE];
		ids.forEach((id, i) => {
			const el = document.getElementById(id);
			if (el) {
				el.checked = (bits & mask[i]) !== 0;
				if (!el._overlayChangeBound) {
					el._overlayChangeBound = true;
					el.addEventListener('change', saveLivestreamShowBits);
				}
			}
		});
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

	function initSlidesOrderBtns() {
		const val = (configData && configData['SLIDES_ORDER']) ? configData['SLIDES_ORDER'] : 'A';
		const hidden = document.getElementById('SLIDES_ORDER');
		if (hidden) hidden.value = val;
		['A', 'B', 'C'].forEach(v => {
			const btn = document.getElementById('slides-order-btn-' + v);
			if (btn) btn.classList.toggle('active', v === val);
		});
	}

	async function selectSlidesOrder(val) {
		const hidden = document.getElementById('SLIDES_ORDER');
		if (hidden) hidden.value = val;
		['A', 'B', 'C'].forEach(v => {
			const btn = document.getElementById('slides-order-btn-' + v);
			if (btn) btn.classList.toggle('active', v === val);
		});
		await saveConfigItem('SLIDES_ORDER');
	}

	let slidesVisibleDebounceTimer = null;
	const SLIDES_VISIBLE_DEBOUNCE_MS = 800;

	async function saveSlidesVisible() {
		const container = document.getElementById('slides-visible-container');
		if (!container) return;
		const items = container.querySelectorAll('.slides-visible-item');
		const arr = [];
		items.forEach((item, i) => {
			const cb = item.querySelector('input[type="checkbox"]');
			arr.push((i === 0 || (cb && cb.checked)) ? 1 : 0);
		});
		const value = '[' + arr.join(',') + ']';
		await saveConfigItem('SLIDES_VISIBLE', value);
	}

	function scheduleSlidesVisibleSave() {
		if (slidesVisibleDebounceTimer) clearTimeout(slidesVisibleDebounceTimer);
		slidesVisibleDebounceTimer = setTimeout(() => {
			slidesVisibleDebounceTimer = null;
			saveSlidesVisible();
		}, SLIDES_VISIBLE_DEBOUNCE_MS);
	}

	async function initSlidesVisibleCheckboxes() {
		const container = document.getElementById('slides-visible-container');
		if (!container) return;
		try {
			const response = await fetch(`${getApiUrl()}/data/slides`);
			const result = await response.json();
			const rows = result.data || [];
			if (rows.length === 0) {
				container.innerHTML = '<span style="color:#9ca3af;font-size:13px;">Tiada baris slides.</span>';
				return;
			}
			let visibleArray = [];
			try {
				const raw = configData.SLIDES_VISIBLE;
				if (raw && typeof raw === 'string') {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed) && parsed.length === rows.length) {
						visibleArray = parsed.map((v) => (v === 1 || v === '1' ? 1 : 0));
					}
				}
			} catch (_) {}
			if (visibleArray.length !== rows.length) {
				visibleArray = rows.map(() => 1);
			}
			visibleArray[0] = 1;
			container.innerHTML = '';
			rows.forEach((row, i) => {
				// if(i === 0) return;
				const type = (row.type || '').trim() || 'slide' + (i + 1);
				const isHome = i === 0;
				const div = document.createElement('div');
				div.className = 'slides-visible-item';
				const label = document.createElement('label');
				const cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = visibleArray[i] === 1;
				cb.dataset.slidesVisibleIndex = String(i);
				if (isHome) {
					cb.disabled = true;
					cb.style.display = 'none';
					label.style.display = 'none';
					div.style.display = 'none';
				} else {
					cb.addEventListener('change', scheduleSlidesVisibleSave);
				}
				label.appendChild(cb);
				label.appendChild(document.createTextNode(type));
				div.appendChild(label);
				container.appendChild(div);
			});
		} catch (err) {
			console.error('initSlidesVisibleCheckboxes:', err);
			container.innerHTML = '<span style="color:#ef4444;font-size:13px;">Ralat memuat paparan.</span>';
		}
	}

	/** Minimum berperingkat: Sebelum Azan >= 1, Sebelum Iqamah >= Azan, Durasi Solat >= Iqamah */
	function syncWaktuSolatMins() {
		const azanEl = document.getElementById('WARNING_START_MINUTES');
		const iqamahEl = document.getElementById('IQAMAH_DURATION_MIN');
		const solatEl = document.getElementById('SOLAT_DURATION_MIN');
		if (!azanEl || !iqamahEl || !solatEl) return;
		azanEl.min = '1';
		const azanVal = Math.max(1, parseFloat(azanEl.value) || 1);
		iqamahEl.min = String(azanVal);
		const iqamahVal = Math.max(azanVal, parseFloat(iqamahEl.value) || azanVal);
		if (parseFloat(iqamahEl.value) < azanVal) iqamahEl.value = String(iqamahVal);
		solatEl.min = String(iqamahVal);
		const solatVal = Math.max(iqamahVal, parseFloat(solatEl.value) || iqamahVal);
		if (parseFloat(solatEl.value) < iqamahVal) solatEl.value = String(solatVal);
		azanEl.removeEventListener('input', syncWaktuSolatMins);
		azanEl.addEventListener('input', syncWaktuSolatMins);
		iqamahEl.removeEventListener('input', syncWaktuSolatMins);
		iqamahEl.addEventListener('input', syncWaktuSolatMins);
	}

	async function initHomeOverlayCheckboxes() {
		const container = document.getElementById('home-overlay-checkboxes');
		if (!container) return;
		try {
			const response = await fetch(`${getApiUrl()}/data/slides`);
			const result = await response.json();
			const rows = result.data || [];
			const homeRow = rows.find(r => (r.type || '').toLowerCase() === 'home');
			if (!homeRow) {
				container.innerHTML = '<span style="color:#9ca3af;font-size:13px;">Row home tidak dijumpai.</span>';
				return;
			}
			const checkboxStr = (homeRow.checkbox || '').trim();
			const selectedSet = new Set(checkboxStr ? checkboxStr.split(',').map(s => s.trim()).filter(Boolean) : []);
			const options = [
				{ value: 'date', label: 'Tarikh' },
				{ value: 'solat-time', label: 'Waktu Solat Penuh' },
				{ value: 'solat-time-small', label: 'Waktu Solat Seterusnya' },
				{ value: 'marquee', label: 'Hebahan Bar' }
			];
			container.innerHTML = '';
			let debounceTimer = null;
			const scheduleSave = async () => {
				if (debounceTimer) clearTimeout(debounceTimer);
				debounceTimer = setTimeout(async () => {
					debounceTimer = null;
					const checked = container.querySelectorAll('input[type="checkbox"]:checked');
					const vals = Array.from(checked).map(cb => cb.value).filter(Boolean);
					const newCheckbox = vals.join(',');
					try {
						const payload = { ...homeRow, checkbox: newCheckbox };
						payload.raw = `${payload.type || ''}|${payload.image || ''}|${payload.duration || ''}|${payload.checkbox || ''}|${payload.hide || '0'}`;
						await fetch(`${getApiUrl()}/data/slides/${homeRow.id}`, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ row: payload })
						});
					} catch (err) {
						console.error('Ralat menyimpan overlay home:', err);
					}
				}, 800);
			};
			options.forEach(opt => {
				const div = document.createElement('div');
				div.className = 'slides-visible-item';
				const label = document.createElement('label');
				label.style.display = 'flex';
				label.style.alignItems = 'center';
				label.style.gap = '8px';
				const cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.value = opt.value;
				cb.checked = selectedSet.has(opt.value);
				cb.addEventListener('change', scheduleSave);
				label.appendChild(cb);
				label.appendChild(document.createTextNode(opt.label));
				div.appendChild(label);
				container.appendChild(div);
			});
		} catch (err) {
			console.error('initHomeOverlayCheckboxes:', err);
			container.innerHTML = '<span style="color:#ef4444;font-size:13px;">Ralat memuat paparan.</span>';
		}
	}

	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 16, g: 16, b: 16 };
	}

	function rgbaToHexAndOpacity(rgba) {
		const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		if (!match) return { hex: '#101010', opacity: 0.1 };
		const r = parseInt(match[1]);
		const g = parseInt(match[2]);
		const b = parseInt(match[3]);
		const a = match[4] ? parseFloat(match[4]) : 1;
		const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
		return { hex, opacity: a };
	}

	async function initOverlayBgColorPicker() {
		const colorInput = document.getElementById('OVERLAY_BG_COLOR');
		const opacityInput = document.getElementById('OVERLAY_BG_OPACITY');
		const opacityDisplay = document.getElementById('OVERLAY_BG_OPACITY_value');
		const textInput = document.getElementById('OVERLAY_BG_COLOR_text');
		
		if (!colorInput || !opacityInput || !opacityDisplay || !textInput) return;

		try {
			const response = await fetch(`${getApiUrl()}/data/config`);
			const result = await response.json();
			const rows = result.data || [];
			const overlayBgRow = rows.find(r => {
				const parts = (r.raw || '').split('|');
				return parts[0] === 'OVERLAY_BG_COLOR';
			});

			if (overlayBgRow) {
				const parts = overlayBgRow.raw.split('|');
				const rgba = parts[1] || 'rgba(16, 16, 16, 0.1)';
				const { hex, opacity } = rgbaToHexAndOpacity(rgba);
				colorInput.value = hex;
				opacityInput.value = opacity;
				opacityDisplay.textContent = opacity;
				textInput.value = rgba;
			}
		} catch (err) {
			console.error('Error loading OVERLAY_BG_COLOR:', err);
		}

		let debounceTimer = null;

		const updateAndSave = () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(async () => {
				const hex = colorInput.value;
				const opacity = parseFloat(opacityInput.value);
				const rgb = hexToRgb(hex);
				const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
				textInput.value = rgba;
				await saveConfigItem('OVERLAY_BG_COLOR', rgba);
			}, 300);
		};

		colorInput.addEventListener('change', updateAndSave);
		opacityInput.addEventListener('input', (e) => {
			opacityDisplay.textContent = e.target.value;
			updateAndSave();
		});
	}

	window.Icons = Icons;
	window.syncWaktuSolatMins = syncWaktuSolatMins;
	window.loadConfigData = loadConfigData;
	window.saveConfigItem = saveConfigItem;
	window.toggleConfigBool = toggleConfigBool;
	window.initSlidesOrderBtns = initSlidesOrderBtns;
	window.selectSlidesOrder = selectSlidesOrder;
	window.saveSlidesVisible = saveSlidesVisible;
	window.initSlidesVisibleCheckboxes = initSlidesVisibleCheckboxes;
	window.initHomeOverlayCheckboxes = initHomeOverlayCheckboxes;
	window.initOverlayBgColorPicker = initOverlayBgColorPicker;
	window.handleRebootKiosk = handleRebootKiosk;
	window.toggleSidebar = toggleSidebar;
	window.loadKematianOverlayConfig = loadKematianOverlayConfig;
	window.loadLivestreamOverlayConfig = loadLivestreamOverlayConfig;
	window.handleKematianToggle = handleKematianToggle;
	window.handleKematianPublish = handleKematianPublish;
	window.handleKematianClear = handleKematianClear;
	window.handleLiveStartFromTable = handleLiveStartFromTable;
	window.handleLiveStop = handleLiveStop;
	window.updateLivestreamPlayState = updateLivestreamPlayState;
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

	function openSeparatorPicker() {
		const dialog = document.getElementById('sep-picker-dialog');
		if (dialog) dialog.showModal();
	}

	function pickSeparator(val) {
		const input = document.getElementById('MARQUEE_SEPARATOR');
		if (input) input.value = val;
		const btn = document.getElementById('MARQUEE_SEPARATOR_btn');
		if (btn) btn.textContent = val;
		saveConfigItem('MARQUEE_SEPARATOR', val);
		const dialog = document.getElementById('sep-picker-dialog');
		if (dialog) dialog.close();
	}

	window.openSeparatorPicker = openSeparatorPicker;
	window.pickSeparator = pickSeparator;
})();
