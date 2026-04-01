import 'package:flutter/material.dart';

/// Bar header panel: ikon + tajuk + butang muat semula.
class PanelHeaderBar extends StatelessWidget {
  const PanelHeaderBar({
    super.key,
    required this.icon,
    required this.title,
    required this.onRefresh,
  });

  final IconData icon;
  final String title;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            offset: const Offset(0, 6),
            blurRadius: 12,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 22,
                color: const Color(0xFF6B7280),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF1A202C),
                    ),
              ),
            ],
          ),
          IconButton(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded, size: 22, color: Color(0xFF4B5563)),
            tooltip: 'Muat semula panel',
            color: const Color(0xFF4B5563),
          ),
        ],
      ),
    );
  }
}
