import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Pengumuman (dikongsi antara `AnnouncementsScreen` dan sub-skrin).
class AnnouncementTabsDef {
  AnnouncementTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'senarai',
      title: 'Senarai Pengumuman',
      subtitle: 'Tambah, edit & padam pengumuman',
      icon: Text('📢', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'setting',
      title: 'Setting Paparan',
      subtitle: 'Tetapan template paparan pengumuman',
      icon: Text('🖼️', style: TextStyle(fontSize: 18)),
    ),
  ];

  static ListTabItem tabOf(String tabId) {
    for (final t in tabs) {
      if (t.id == tabId) return t;
    }
    return tabs.first;
  }

  static Color iconColorForId(String id) {
    switch (id) {
      case 'senarai':
        return const Color(0xFF2563EB);
      case 'setting':
        return const Color(0xFFEA580C);
      default:
        return const Color(0xFF666666);
    }
  }
}

