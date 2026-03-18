import 'dart:async';

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../data/panel_menu.dart';
import '../services/connectivity_service.dart';
import '../services/cloud_socket_service.dart';
import '../widgets/cloud_panel_drawer.dart';
import '../widgets/panel_header_bar.dart';
import '../widgets/panel_menu_grid.dart';
import 'cloud_tabs/cloud_tabs.dart';
import 'login_screen.dart';

/// Skrin utama panel cloud: drawer menu + tab native (Config, Countdown, dll.).
class CloudPanelScreen extends StatefulWidget {
  const CloudPanelScreen({
    super.key,
    required this.config,
    required this.onConfigSaved,
  });

  final AppConfig config;
  final void Function(AppConfig config) onConfigSaved;

  @override
  State<CloudPanelScreen> createState() => _CloudPanelScreenState();
}

class _CloudPanelScreenState extends State<CloudPanelScreen> {
  late final ConnectivityService _connectivity;
  CloudSocketService? _cloudSocket;
  StreamSubscription<bool>? _localStatusSub;
  String _connectionLabel = 'Mengesan sambungan...';
  String _screenTitle = '';
  String _currentTabId = '';
  int _panelRefreshKey = 0;

  @override
  void initState() {
    super.initState();
    _connectivity = ConnectivityService.instance;
    _connectivity.startMonitoring(baseUrl: widget.config.baseUrl);

    // Label "Local:" dari socket event local:status (kiosk paparan ↔ cloud).
    _cloudSocket = CloudSocketService(config: widget.config);
    _cloudSocket!.connect();
    _localStatusSub = _cloudSocket!.localConnectedStream.listen((connected) {
      if (!mounted) return;
      setState(() => _connectionLabel = connected ? 'Local: Connected' : 'Local: Disconnected');
    });
  }

  @override
  void dispose() {
    _localStatusSub?.cancel();
    _cloudSocket?.disconnect();
    super.dispose();
  }

  /// Buka LoginScreen, reconnect socket dengan config baru selepas save.
  Future<void> _openConfig() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => LoginScreen(
          initialConfig: widget.config,
          onSaved: (newConfig) {
            _cloudSocket?.updateConfig(newConfig);
            widget.onConfigSaved(newConfig);
            Navigator.of(context).pop();
          },
          onReconnect: () {
            _cloudSocket?.reconnect();
            _cloudSocket?.onReadyStream.first.then((_) {
              if (mounted) _reloadPanelTab();
            });
          },
        ),
      ),
    );
  }

  /// Reload panel tab yang aktif (remount widget → initState → fetch data semula).
  void _reloadPanelTab() {
    if (_currentTabId.isEmpty) return;
    setState(() => _panelRefreshKey++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: CloudPanelDrawer(
        onItemSelected: (tabId, title) {
          setState(() {
            _screenTitle = title;
            _currentTabId = tabId;
          });
        },
      ),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Muslim Indoor Digital Media',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Builder(builder: (context) {
              final baseStyle = Theme.of(context).textTheme.labelSmall!;
              return Text(
                _connectionLabel,
                style: baseStyle.copyWith(
                  color: (baseStyle.color ?? Colors.white)
                      .withAlpha((0.9 * 255).toInt()),
                ),
              );
            }),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _openConfig,
            tooltip: 'Tetapan',
          ),
        ],
      ),
      body: Column(
        children: [
          if (_currentTabId.isNotEmpty)
            PanelHeaderBar(
              icon: PanelMenu.iconForTabId(_currentTabId),
              title: _screenTitle,
              onRefresh: _reloadPanelTab,
            ),
          Expanded(
            child: _currentTabId.isEmpty
                ? PanelMenuGrid(
                    onItemSelected: (tabId, title) {
                      setState(() {
                        _currentTabId = tabId;
                        _screenTitle = title;
                      });
                    },
                  )
                : _buildScreenWidget(),
          ),
        ],
      ),
    );
  }

  /// Widget skrin mengikut tab yang dipilih (sub-skrin dari folder cloud_tabs).
  Widget _buildScreenWidget() {
    final key = ValueKey('${_currentTabId}_$_panelRefreshKey');
    switch (_currentTabId) {
      case 'config':
        // Jangan remount bila refresh: guna key stabil + refreshTrigger supaya ConfigScreen
        // reload data dalam didUpdateWidget tanpa reset tab (e.g. kekal di Hebahan).
        return ConfigScreen(
          key: ValueKey(_currentTabId),
          config: widget.config,
          refreshTrigger: _panelRefreshKey,
        );
      case 'countdowns':
        return CountdownsScreen(key: key);
      case 'announcements':
        return AnnouncementsScreen(key: key);
      case 'slideshow':
        return SlideshowScreen(key: key);
      case 'kuliah':
        return KuliahScreen(key: key);
      case 'imam-bilal':
        return ImamBilalScreen(key: key);
      case 'background':
        return BackgroundScreen(key: key);
      case 'kematian':
        return KematianScreen(key: key);
      case 'livestream':
        return LivestreamScreen(key: key);
      default:
        return PlaceholderScreen(key: key, title: _screenTitle);
    }
  }

}
