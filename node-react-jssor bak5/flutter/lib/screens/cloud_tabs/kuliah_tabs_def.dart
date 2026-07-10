import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Kuliah (menu utama + sub-skrin).
/// Selari dengan cloud/setting tabs: Jadual, Ganti, Pengkuliah, List Paparan.
class KuliahTabsDef {
  KuliahTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'jadual',
      title: 'Jadual Kuliah',
      subtitle: 'Urus jadual kuliah mingguan',
      icon: Text('📅', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'ganti',
      title: 'Ganti Kuliah',
      subtitle: 'Override/batal tarikh kuliah',
      icon: Text('🔄', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'pengkuliah',
      title: 'Pengkuliah',
      subtitle: 'Urus senarai penceramah',
      icon: Text('👤', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'paparan',
      title: 'List Paparan',
      subtitle: 'Kad kuliah paparan (Harian/Mingguan/Bulanan)',
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
      case 'jadual':
        return const Color(0xFF2563EB);
      case 'ganti':
        return const Color(0xFFEA580C);
      case 'pengkuliah':
        return const Color(0xFF16A34A);
      case 'paparan':
        return const Color(0xFF7C3AED);
      default:
        return const Color(0xFF666666);
    }
  }
}
