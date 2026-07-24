import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Slideshow (menu utama + sub-skrin).
class SlideshowTabsDef {
  SlideshowTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'senarai',
      title: 'Senarai Slideshow',
      subtitle: 'Tambah, edit & padam slideshow',
      icon: Text('🎬', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'setting',
      title: 'Setting Paparan',
      subtitle: 'Tetapan template paparan slideshow',
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

