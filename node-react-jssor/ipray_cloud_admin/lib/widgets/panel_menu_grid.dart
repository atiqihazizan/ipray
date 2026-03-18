import 'package:flutter/material.dart';

import '../data/panel_menu.dart';

/// Menu berkotak di tengah skrin — senarai dari [PanelMenu.items].
class PanelMenuGrid extends StatelessWidget {
  const PanelMenuGrid({
    super.key,
    required this.onItemSelected,
  });

  /// Dipanggil bila user pilih item: (tabId, title).
  final void Function(String tabId, String title) onItemSelected;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Wrap(
          alignment: WrapAlignment.center,
          spacing: 12,
          runSpacing: 12,
          children: PanelMenu.items.map((item) => _MenuCard(
                icon: item.icon,
                label: item.label,
                onTap: () => onItemSelected(item.tabId, item.label),
              )).toList(),
        ),
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final Widget icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.08),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 140,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DefaultTextStyle.merge(
                style: const TextStyle(fontSize: 36),
                child: icon,
              ),
              const SizedBox(height: 10),
              Text(
                label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF1F2937),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
