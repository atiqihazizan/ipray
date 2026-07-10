import 'package:flutter/material.dart';

/// Paparan senarai konfigurasi (ala Settings Android),
/// diselarikan dengan senarai dalam `cloud/webmobile/tabs/config.html`.
class NativeConfigScreen extends StatelessWidget {
  const NativeConfigScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = <_ConfigItem>[
      const _ConfigItem(
        icon: Icons.home_outlined,
        title: 'Paparan Home',
        subtitle: 'Tajuk & gaya skrin utama',
      ),
      const _ConfigItem(
        icon: Icons.access_time,
        title: 'Waktu Solat',
        subtitle: 'Konfigurasi jadual solat harian',
      ),
      const _ConfigItem(
        icon: Icons.image_outlined,
        title: 'Paparan',
        subtitle: 'Template & layout paparan skrin',
      ),
      const _ConfigItem(
        icon: Icons.campaign_outlined,
        title: 'Hebahan',
        subtitle: 'Teks hebahan untuk paparan',
      ),
      const _ConfigItem(
        icon: Icons.event_note_outlined,
        title: 'Takwim',
        subtitle: 'Zon & takwim solat',
      ),
      const _ConfigItem(
        icon: Icons.schedule_outlined,
        title: 'Masa Sistem',
        subtitle: 'Tetapan tarikh & masa peranti',
      ),
      const _ConfigItem(
        icon: Icons.wifi,
        title: 'Wi‑Fi',
        subtitle: 'Sambungan rangkaian Wi‑Fi',
      ),
      const _ConfigItem(
        icon: Icons.wifi_tethering,
        title: 'Hotspot',
        subtitle: 'Tetapan hotspot peranti',
      ),
      const _ConfigItem(
        icon: Icons.settings_applications_outlined,
        title: 'Sistem',
        subtitle: 'Tetapan lanjutan & sistem',
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Konfigurasi MIDM'),
      ),
      body: ListView.separated(
        itemCount: items.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final item = items[index];
          return ListTile(
            leading: Icon(item.icon),
            title: Text(item.title),
            subtitle: Text(item.subtitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // Buat masa ini hanya paparkan nama; boleh dihubungkan
              // ke skrin konfigurasi terperinci kemudian.
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Buka: ${item.title}')),
              );
            },
          );
        },
      ),
    );
  }
}

class _ConfigItem {
  final IconData icon;
  final String title;
  final String subtitle;

  const _ConfigItem({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

