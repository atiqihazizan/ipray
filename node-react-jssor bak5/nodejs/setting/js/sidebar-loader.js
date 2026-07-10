/**
 * Load sidebar partial HTML into #sidebar-placeholder
 */

function getBasePath() {
	return window.location.pathname.replace(/\/?index\.html$/, '').replace(/\/?$/, '') || '.';
}

/**
 * Fetch partials/sidebar.html and inject into #sidebar-placeholder
 * @returns {Promise<void>}
 */
export async function loadSidebar() {
	const placeholder = document.getElementById('sidebar-placeholder');
	if (!placeholder) return;

	const base = getBasePath();
	const url = base + '/partials/sidebar.html';
	try {
		const resp = await fetch(url);
		if (!resp.ok) throw new Error(resp.statusText);
		const html = await resp.text();
		placeholder.innerHTML = html;
	} catch (err) {
		console.error('Ralat memuat sidebar:', err);
		placeholder.innerHTML = '<aside class="sidebar" id="sidebar"><div class="sidebar-header"><p style="color:#94a3b8;padding:16px;">Gagal memuat menu.</p></div></aside>';
	}
}
