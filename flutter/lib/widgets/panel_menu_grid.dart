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
    return LayoutBuilder(
      builder: (context, constraints) {
        // Responsive sizing for mobile: ensure 2 columns fit without horizontal overflow.
        final isMobile = constraints.maxWidth < 420;
        final horizontalPadding = isMobile ? 16.0 : 24.0;
        final spacing = isMobile ? 10.0 : 12.0;
        final runSpacing = isMobile ? 10.0 : 12.0;

        final availableWidth = constraints.maxWidth - (horizontalPadding * 2);
        const minCardWidth = 140.0;
        final useTwoColumns = availableWidth >= (minCardWidth * 2 + spacing);
        final cardWidthBase = useTwoColumns
            ? ((availableWidth - spacing) / 2)
            : availableWidth; // 1 kolum bila ruang tak cukup untuk 2 kolum
        final cardWidth = cardWidthBase.clamp(0.0, 170.0);

        final iconFontSize = isMobile ? 28.0 : 36.0;
        final cardPaddingH = isMobile ? 12.0 : 16.0;
        final cardPaddingV = isMobile ? 16.0 : 20.0;

        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: horizontalPadding,
              vertical: isMobile ? 16.0 : 24.0,
            ),
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: spacing,
              runSpacing: runSpacing,
              children: PanelMenu.items.map((item) => _MenuCard(
                    icon: item.icon,
                    label: item.label,
                    cardWidth: cardWidth,
                    iconFontSize: iconFontSize,
                    cardPadding: EdgeInsets.symmetric(
                      horizontal: cardPaddingH,
                      vertical: cardPaddingV,
                    ),
                    onTap: () => onItemSelected(item.tabId, item.label),
                  )).toList(),
            ),
          ),
        );
      },
    );
  }
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.cardWidth,
    required this.iconFontSize,
    required this.cardPadding,
  });

  final Widget icon;
  final String label;
  final VoidCallback onTap;
  final double cardWidth;
  final double iconFontSize;
  final EdgeInsets cardPadding;

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
          width: cardWidth,
          padding: cardPadding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DefaultTextStyle.merge(
                style: TextStyle(fontSize: iconFontSize),
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
