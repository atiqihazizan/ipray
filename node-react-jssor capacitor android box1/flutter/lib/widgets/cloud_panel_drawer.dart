import 'package:flutter/material.dart';

import '../data/panel_menu.dart';

/// Drawer menu MIDM: header + senarai dari [PanelMenu.items].
class CloudPanelDrawer extends StatelessWidget {
  const CloudPanelDrawer({
    super.key,
    required this.onItemSelected,
  });

  /// Dipanggil bila user pilih item: (tabId, title).
  final void Function(String tabId, String title) onItemSelected;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.indigo,
              ),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Text(
                  'Menu MIDM',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            ...PanelMenu.items.map((item) => ListTile(
                  leading: item.icon,
                  title: Text(item.label),
                  onTap: () {
                    Navigator.of(context).pop();
                    onItemSelected(item.tabId, item.label);
                  },
                )),
          ],
        ),
      ),
    );
  }
}
