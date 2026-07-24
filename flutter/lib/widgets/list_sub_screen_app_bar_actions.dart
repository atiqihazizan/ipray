import 'package:flutter/material.dart';

/// Widget AppBar actions untuk skrin list (Tambah + Muat semula).
/// Boleh dikongsi di slideshow, announcement, countdown, kuliah, imam bilal.
class ListSubScreenAppBarActions extends StatelessWidget {
  const ListSubScreenAppBarActions({
    super.key,
    required this.onRefresh,
    this.onAdd,
    this.loading = false,
    this.itemCount,
    this.showAdd = true,
  });

  final VoidCallback onRefresh;
  final VoidCallback? onAdd;
  final bool loading;
  final int? itemCount;
  final bool showAdd;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showAdd && onAdd != null)
          IconButton(
            tooltip: 'Tambah',
            onPressed: onAdd,
            icon: const Icon(Icons.add_rounded),
          ),
        IconButton(
          tooltip: 'Muat semula',
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh_rounded),
        ),
        // if (itemCount != null || loading)
        //   Padding(
        //     padding: const EdgeInsets.symmetric(horizontal: 8),
        //     child: Center(
        //       child: Text(
        //         loading ? 'Memuatkan...' : '${itemCount ?? 0} item',
        //         style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
        //       ),
        //     ),
        //   ),
      ],
    );
  }
}
