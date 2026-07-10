import 'dart:async';

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/connectivity_service.dart';
import '../services/cloud_socket_service.dart';
import '../widgets/cloud_panel_drawer.dart';
import 'cloud_tabs/cloud_tabs.dart';
import 'login_screen.dart';

/// Skrin utama panel cloud: drawer menu + tab native (Config, Countdown, dll.).
class CloudPanelScreen extends StatefulWidget {
  const CloudPanelScreen({
    super.key,
    required this.config,
    required this.onConfigSaved,
    this.initialTabId,
    this.initialTitle,
  });

  final AppConfig config;
  final void Function(AppConfig config) onConfigSaved;
  final String? initialTabId;
  final String? initialTitle;

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

    // Tab awal dari menu grid (jika ada).
    _currentTabId = widget.initialTabId ?? '';
    _screenTitle = widget.initialTitle ?? _screenTitle;
  }

  @override
  void didUpdateWidget(covariant CloudPanelScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Jika config berubah (contoh: tukar client ID), update socket dan sambung semula
    if (oldWidget.config != widget.config) {
      _cloudSocket?.updateConfig(widget.config);
      _connectivity.startMonitoring(baseUrl: widget.config.baseUrl);
    }
  }

  @override
  void dispose() {
    _localStatusSub?.cancel();
    _cloudSocket?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: CloudPanelDrawer(
        onItemSelected: (tabId, title) {
          setState(() {
            _currentTabId = tabId;
            _screenTitle = title;
          });
        },
      ),
      appBar: AppBar(
        // Bila ada drawer, AppBar akan papar ikon menu (hamburger) secara automatik.
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _screenTitle.isEmpty ? '' : _screenTitle,
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
        //   IconButton(
        //     icon: const Icon(Icons.refresh_rounded),
        //     onPressed: _reloadPanelTab,
        //     tooltip: 'Muat semula panel',
        //   ),
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
          tooltip: 'Settings',
        ),
        ],
      ),
      body: _buildScreenWidget(),
    );
  }

  /// Widget skrin mengikut tab yang dipilih (sub-skrin dari folder cloud_tabs).
  Widget _buildScreenWidget() {
    final key = ValueKey('${_currentTabId}_$_panelRefreshKey');
    switch (_currentTabId) {
      case 'config':
        return ConfigScreen(
          key: ValueKey(_currentTabId),
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      case 'countdowns':
        return CountdownsScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      case 'announcements':
        return AnnouncementsScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      case 'slideshow':
        return SlideshowScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      case 'kuliah':
        return KuliahScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      case 'imam-bilal':
        return ImamBilalScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      // case 'background':
      //   return BackgroundScreen(key: key);
      case 'kematian':
        return KematianScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
        );
      case 'livestream':
        return LivestreamScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
        );
      case 'kawalan-skrin':
        return KawalanJauhScreen(
          key: key,
          config: widget.config,
          socketService: _cloudSocket,
          refreshTrigger: _panelRefreshKey,
        );
      default:
        return PlaceholderScreen(key: key, title: _screenTitle);
    }
  }

}
