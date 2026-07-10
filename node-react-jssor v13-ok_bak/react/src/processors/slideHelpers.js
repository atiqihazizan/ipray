/**
 * Helper bersama untuk slide processors (escape HTML).
 * Logic batal/skip/replace kini di backend; frontend hanya papar data diproses.
 */

export const escapeHtml = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
