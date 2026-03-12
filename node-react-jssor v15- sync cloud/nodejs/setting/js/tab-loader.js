/**
 * Tab loader: fetch partial HTML for each main tab and inject into #tab-content-container
 */

const TAB_FILES = [
	'config', 'slides', 'slideshow', 'kuliah', 'kuliah-override',
	'penceramah', 'petugas', 'jadual-petugas',
	'images', 'announcements', 'hebahan', 'countdowns', 'takwim',
	'kematian', 'livestream'
];

const cache = {};

/**
 * Get base path for fetching tab HTML (same as config-tabs.js)
 */
function getBasePath() {
	return window.location.pathname.replace(/\/?index\.html$/, '').replace(/\/?$/, '') || '.';
}

/**
 * Load tab content by name: fetch tabs/{tabName}.html and inject into container
 * @param {string} tabName - e.g. 'config', 'slides', 'kematian'
 * @returns {Promise<string>} - HTML string on success
 */
export async function loadTabContent(tabName) {
	const container = document.getElementById('tab-content-container');
	if (!container) return '';

	if (!TAB_FILES.includes(tabName)) {
		container.innerHTML = '<div class="content-card"><p class="text-center text-gray-500">Tab tidak dijumpai.</p></div>';
		return '';
	}

	if (cache[tabName]) {
		container.innerHTML = cache[tabName];
		return cache[tabName];
	}

	const base = getBasePath();
	const url = base + '/tabs/' + tabName + '.html';
	container.innerHTML = '<div class="content-card"><div class="text-center py-8 text-gray-500">Memuat...</div></div>';

	try {
		const resp = await fetch(url);
		if (!resp.ok) throw new Error(resp.statusText);
		const html = await resp.text();
		container.innerHTML = html;
		cache[tabName] = html;
		return html;
	} catch (err) {
		console.error('Ralat memuat tab:', err);
		container.innerHTML = '<div class="content-card"><div class="text-center py-8 text-red-600">Gagal memuat: ' + (err.message || 'Unknown error') + '</div></div>';
		return '';
	}
}

/**
 * Clear cache for a tab (e.g. after content may have changed server-side)
 * @param {string} [tabName] - if omitted, clear all
 */
export function clearTabCache(tabName) {
	if (tabName) delete cache[tabName];
	else Object.keys(cache).forEach(k => delete cache[k]);
}

if (typeof window !== 'undefined') {
	window.TabLoader = { loadTabContent, clearTabCache, TAB_FILES };
}
