import 'package:flutter/material.dart';

/// Satu item dalam senarai tab (butang tab): id, tajuk, sub-tajuk, ikon.
/// Boleh digunakan untuk Config, Countdowns, Announcements, dll.
class ListTabItem {
  const ListTabItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.iconColor,
  });

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  /// Warna ikon; jika null, widget guna [ListTabBar.iconColorForId] atau kelabu default.
  final Color? iconColor;
}

/// Senarai butang tab standard: ikon dalam bulatan, tajuk, sub-tajuk, chevron.
/// Gaya sama seperti layer list tab di Config (settings-list).
class ListTabBar extends StatelessWidget {
  const ListTabBar({
    super.key,
    required this.items,
    required this.onTap,
    this.selectedId,
    this.iconColorForId,
  });

  final List<ListTabItem> items;
  final String? selectedId;
  final void Function(String id) onTap;
  /// Pilihan: warna ikon mengikut id (jika item tiada [ListTabItem.iconColor]).
  final Color Function(String id)? iconColorForId;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        elevation: 1,
        shadowColor: Colors.black.withOpacity(0.06),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(items.length * 2 - 1, (i) {
              if (i.isOdd) {
                return Divider(height: 1, thickness: 1, color: Colors.grey.shade200);
              }
              final item = items[i ~/ 2];
              final isSelected = selectedId == item.id;
              final iconColor = item.iconColor ??
                  iconColorForId?.call(item.id) ??
                  const Color(0xFF666666);
              return InkWell(
                onTap: () => onTap(item.id),
                child: Container(
                  color: isSelected ? const Color(0xFFEEF2FF) : null,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF0F0F0),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(item.icon, size: 22, color: iconColor),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF333333),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.subtitle,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, size: 24, color: Colors.grey.shade500),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
