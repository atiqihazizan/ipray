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
  final IconData icon;
}

/// Senarai menu panel MIDM — dikongsi oleh drawer dan menu tengah.
class PanelMenu {
  PanelMenu._();

  static const List<PanelMenuItem> items = [
    PanelMenuItem(tabId: 'config', label: 'Konfigurasi', icon: Icons.settings),
    PanelMenuItem(tabId: 'countdowns', label: 'Countdown', icon: Icons.hourglass_bottom),
    PanelMenuItem(tabId: 'announcements', label: 'Pengumuman', icon: Icons.campaign),
    PanelMenuItem(tabId: 'slideshow', label: 'Slideshow', icon: Icons.slideshow),
    PanelMenuItem(tabId: 'kuliah', label: 'Kuliah', icon: Icons.menu_book),
    PanelMenuItem(tabId: 'imam-bilal', label: 'Imam & Bilal', icon: Icons.groups),
    PanelMenuItem(tabId: 'background', label: 'Background', icon: Icons.image),
    PanelMenuItem(tabId: 'kematian', label: 'Kematian', icon: Icons.self_improvement),
    PanelMenuItem(tabId: 'livestream', label: 'Siaran Langsung', icon: Icons.videocam),
  ];

  static IconData iconForTabId(String tabId) {
    for (final e in items) {
      if (e.tabId == tabId) return e.icon;
    }
    return Icons.dashboard;
  }
}
