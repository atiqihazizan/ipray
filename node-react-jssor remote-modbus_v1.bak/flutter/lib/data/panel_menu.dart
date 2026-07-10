import 'package:flutter/material.dart';

/// Satu item menu panel (drawer & menu tengah).
class PanelMenuItem {
  const PanelMenuItem({
    required this.tabId,
    required this.label,
    required this.icon,
  });
  final String tabId;
  final String label;
  /// Ikon boleh jadi emoji (berwarna) atau widget lain.
  final Widget icon;
}

/// Senarai menu panel MIDM — dikongsi oleh drawer dan menu tengah.
class PanelMenu {
  PanelMenu._();

  static const TextStyle _emojiStyle = TextStyle(fontSize: 18);

  static const List<PanelMenuItem> items = [
    PanelMenuItem(tabId: 'config', label: 'Konfigurasi', icon: Text('⚙️', style: _emojiStyle)),
    PanelMenuItem(tabId: 'countdowns', label: 'Countdown', icon: Text('⏳', style: _emojiStyle)),
    PanelMenuItem(tabId: 'announcements', label: 'Pengumuman', icon: Text('📣', style: _emojiStyle)),
    PanelMenuItem(tabId: 'slideshow', label: 'Slideshow', icon: Text('🎬', style: _emojiStyle)),
    PanelMenuItem(tabId: 'kuliah', label: 'Kuliah', icon: Text('📚', style: _emojiStyle)),
    PanelMenuItem(tabId: 'imam-bilal', label: 'Imam & Bilal', icon: Text('👥', style: _emojiStyle)),
    // PanelMenuItem(tabId: 'background', label: 'Background', icon: Text('🖼️', style: _emojiStyle)),
    PanelMenuItem(tabId: 'kematian', label: 'Kematian', icon: Text('🕌', style: _emojiStyle)),
    PanelMenuItem(tabId: 'livestream', label: 'Siaran Langsung', icon: Text('📹', style: _emojiStyle)),
    PanelMenuItem(tabId: 'kawalan-skrin', label: 'Kawalan Skrin', icon: Text('🎛️', style: _emojiStyle)),
  ];

  static Widget iconForTabId(String tabId) {
    for (final e in items) {
      if (e.tabId == tabId) return e.icon;
    }
    return const Text('⬛', style: _emojiStyle);
  }
}
