import 'dart:async';

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/cloud_socket_service.dart';
import '../widgets/panel_menu_grid.dart';
// import '../widgets/cloud_panel_drawer.dart';
import 'cloud_panel_screen.dart';
import 'login_screen.dart';

/// Skrin menu grid pertama selepas login.
class CloudMenuScreen extends StatefulWidget {
  const CloudMenuScreen({
    super.key,
    required this.config,
    required this.onConfigSaved,
  });

  final AppConfig config;
  final void Function(AppConfig config) onConfigSaved;

  @override
  State<CloudMenuScreen> createState() => _CloudMenuScreenState();
}

class _CloudMenuScreenState extends State<CloudMenuScreen> {
  CloudSocketService? _cloudSocket;
  StreamSubscription<bool>? _localSub;
  bool _localConnected = false;

  @override
  void initState() {
    super.initState();
    _cloudSocket = CloudSocketService(config: widget.config);
    _cloudSocket!.connect();
    _localSub = _cloudSocket!.localConnectedStream.listen((connected) {
      if (mounted) setState(() => _localConnected = connected);
    });
  }

  @override
  void didUpdateWidget(covariant CloudMenuScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config != widget.config) {
      _cloudSocket?.updateConfig(widget.config);
    }
  }

  @override
  void dispose() {
    _localSub?.cancel();
    _cloudSocket?.dispose();
    super.dispose();
  }

  void _openPanel(BuildContext context, String tabId, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CloudPanelScreen(
          config: widget.config,
          onConfigSaved: widget.onConfigSaved,
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
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(26),
          child: ColoredBox(
            color: _localConnected ? Colors.green.shade600 : Colors.red.shade600,
            child: SizedBox(
              width: double.infinity,
              height: 26,
              child: Center(
                child: Text(
                  _localConnected ? 'Local: Connected' : 'Local: Disconnected',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () async {
              await Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (context) => LoginScreen(
                    initialConfig: widget.config,
                    cloudService: _cloudSocket,
                    onSaved: (newConfig) {
                      widget.onConfigSaved(newConfig);
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
