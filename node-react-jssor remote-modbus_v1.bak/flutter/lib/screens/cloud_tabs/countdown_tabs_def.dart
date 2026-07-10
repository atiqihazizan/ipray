import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Countdown (dikongsi antara `CountdownsScreen` dan sub-skrin).
class CountdownTabsDef {
  CountdownTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'senarai',
      title: 'Senarai Countdown',
      subtitle: 'Tambah, edit & padam countdown',
      icon: Text('⏳', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'setting',
      title: 'Setting Paparan',
      subtitle: 'Tetapan template paparan countdown',
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

