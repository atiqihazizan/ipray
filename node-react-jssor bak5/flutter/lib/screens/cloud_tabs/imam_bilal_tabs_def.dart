import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Imam & Bilal (menu utama + sub-skrin).
class ImamBilalTabsDef {
  ImamBilalTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'jadual-petugas',
      title: 'Jadual Petugas',
      subtitle: 'Tambah, edit & padam jadual imam/bilal',
      icon: Text('📅', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'petugas',
      title: 'Petugas',
      subtitle: 'Tambah, edit & padam petugas',
      icon: Text('👥', style: TextStyle(fontSize: 18)),
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
      case 'jadual-petugas':
        return const Color(0xFF2563EB);
      case 'petugas':
        return const Color(0xFF16A34A);
      default:
        return const Color(0xFF666666);
    }
  }
}

