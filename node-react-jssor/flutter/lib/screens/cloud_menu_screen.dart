import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../widgets/panel_menu_grid.dart';
// import '../widgets/cloud_panel_drawer.dart';
import 'cloud_panel_screen.dart';
import 'login_screen.dart';

/// Skrin menu grid pertama selepas login.
class CloudMenuScreen extends StatelessWidget {
  const CloudMenuScreen({
    super.key,
    required this.config,
    required this.onConfigSaved,
  });

  final AppConfig config;
  final void Function(AppConfig config) onConfigSaved;

  void _openPanel(BuildContext context, String tabId, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CloudPanelScreen(
          config: config,
          onConfigSaved: onConfigSaved,
          initialTabId: tabId,
          initialTitle: title,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // drawer: CloudPanelDrawer(
      //   onItemSelected: (tabId, title) => _openPanel(context, tabId, title),
      // ),
      appBar: AppBar(
        title: const Text('Muslim Indoor Digital Media'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () async {
              await Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (context) => LoginScreen(
                    initialConfig: config,
                    onSaved: (newConfig) {
                      onConfigSaved(newConfig);
                      Navigator.of(context).pop();
                    },
                  ),
                ),
              );
            },
            tooltip: 'Tetapan',
          ),
        ],
      ),
      body: PanelMenuGrid(
        onItemSelected: (tabId, title) => _openPanel(context, tabId, title),
      ),
    );
  }
}

