import 'package:flutter/material.dart';

import '../../widgets/list_tab_bar.dart';

/// Definisi tab untuk Konfigurasi (dikongsi antara `ConfigScreen` dan `ConfigSubScreen`).
class ConfigTabsDef {
  ConfigTabsDef._();

  static const List<ListTabItem> tabs = [
    ListTabItem(
      id: 'title-home',
      title: 'Paparan Home',
      subtitle: 'Tajuk & gaya skrin utama',
      icon: Text('🏠', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'waktu-solat',
      title: 'Waktu Solat',
      subtitle: 'Konfigurasi jadual solat harian',
      icon: Text('🕒', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'slides',
      title: 'Paparan',
      subtitle: 'Template & layout paparan skrin',
      icon: Text('🖼️', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'hebahan',
      title: 'Hebahan',
      subtitle: 'Teks hebahan untuk paparan',
      icon: Text('📣', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'takwim',
      title: 'Takwim',
      subtitle: 'Zon & takwim solat',
      icon: Text('📅', style: TextStyle(fontSize: 18)),
    ),
    ListTabItem(
      id: 'system',
      title: 'Sistem',
      subtitle: 'Tetapan lanjutan & sistem',
      icon: Text('⚙️', style: TextStyle(fontSize: 18)),
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
      case 'title-home':
        return const Color(0xFFE53935);
      case 'waktu-solat':
        return const Color(0xFF1976D2);
      case 'slides':
        return const Color(0xFF43A047);
      case 'hebahan':
        return const Color(0xFFFB8C00);
      case 'takwim':
        return const Color(0xFFE53935);
      default:
        return const Color(0xFF666666);
    }
  }
}

