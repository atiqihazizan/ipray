import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../config/app_config.dart';
import '../services/connectivity_service.dart';
import '../services/cloud_socket_service.dart';
import 'cloud_tabs/cloud_tabs.dart';

class CloudWebViewScreen extends StatefulWidget {
  const CloudWebViewScreen({
    super.key,
    required this.config,
    required this.onOpenConfig,
  });

  final AppConfig config;
  final VoidCallback onOpenConfig;

  @override
  State<CloudWebViewScreen> createState() => _CloudWebViewScreenState();
}

class _CloudWebViewScreenState extends State<CloudWebViewScreen> {
  late final WebViewController _controller;
  late final ConnectivityService _connectivity;
  CloudSocketService? _cloudSocket;
  StreamSubscription<bool>? _localStatusSub;
  bool _isOffline = true;
  String _connectionLabel = 'Mengesan sambungan...';
  String _screenTitle = '';
  String _currentTabId = '';
  int _panelRefreshKey = 0;

  @override
  void initState() {
    super.initState();
    _connectivity = ConnectivityService.instance;
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) => _injectFlutterConfig(),
        ),
      )
      ..loadRequest(Uri.parse(widget.config.webmobileUrl));

    _connectivity.startMonitoring(baseUrl: widget.config.baseUrl);
    _isOffline = _connectivity.isOffline;

    _connectivity.offlineStream.listen((offline) {
      if (!mounted) return;
      setState(() => _isOffline = offline);
    });

    // Label "Local:" dari socket event local:status (kiosk paparan ↔ cloud), selari webmobile.
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

  /// Reload panel tab yang aktif (remount widget → initState → fetch data semula).
  void _reloadPanelTab() {
    if (_currentTabId.isEmpty) return;
    setState(() => _panelRefreshKey++);
  }

  /// Optional: pass config ke halaman web via window.FlutterConfig (jika halaman baca).
  void _injectFlutterConfig() {
    final c = widget.config;
    final script = '''
      window.FlutterConfig = {
        baseUrl: "${c.baseUrl.replaceAll(r'\', r'\\').replaceAll('"', r'\"')}",
        socketUrl: "${c.socketUrl.replaceAll(r'\', r'\\').replaceAll('"', r'\"')}",
        clientId: "${c.clientId.replaceAll(r'\', r'\\').replaceAll('"', r'\"')}",
        clientToken: "${c.clientToken.replaceAll(r'\', r'\\').replaceAll('"', r'\"')}"
      };
    ''';
    _controller.runJavaScript(script);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: Drawer(
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
              ListTile(
                leading: const Icon(Icons.settings),
                title: const Text('Konfigurasi'),
                onTap: () {
                  Navigator.of(context).pop();
                  setState(() {
                    _screenTitle = 'Konfigurasi';
                    _currentTabId = 'config';
                  });
                  _controller.runJavaScript(
                    "if (window.showTab) window.showTab('config');",
                  );
                },
              ),
              _buildDrawerItem(
                icon: Icons.hourglass_bottom,
                label: 'Countdown',
                tabId: 'countdowns',
              ),
              _buildDrawerItem(
                icon: Icons.campaign,
                label: 'Pengumuman',
                tabId: 'announcements',
              ),
              _buildDrawerItem(
                icon: Icons.slideshow,
                label: 'Slideshow',
                tabId: 'slideshow',
              ),
              _buildDrawerItem(
                icon: Icons.menu_book,
                label: 'Kuliah',
                tabId: 'kuliah',
              ),
              _buildDrawerItem(
                icon: Icons.groups,
                label: 'Imam & Bilal',
                tabId: 'imam-bilal',
              ),
              _buildDrawerItem(
                icon: Icons.image,
                label: 'Background',
                tabId: 'background',
              ),
              _buildDrawerItem(
                icon: Icons.self_improvement,
                label: 'Kematian',
                tabId: 'kematian',
              ),
              _buildDrawerItem(
                icon: Icons.videocam,
                label: 'Siaran Langsung',
                tabId: 'livestream',
              ),
            ],
          ),
        ),
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
          // IconButton(
          //   icon: const Icon(Icons.refresh),
          //   onPressed: _reload,
          //   tooltip: 'Muat semula',
          // ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: widget.onOpenConfig,
            tooltip: 'Tetapan',
          ),
        ],
      ),
// body: Stack(
// WebViewWidget(controller: _controller),
// if (_isOffline) _buildOfflineOverlay(),
      body: Column(
        children: [
          // Baris 1: mini top-header hanya papar selepas pengguna pilih nav
          if (_currentTabId.isNotEmpty)
            Container(
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
                        _iconForTabId(_currentTabId),
                        size: 22,
                        color: const Color(0xFF6B7280),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _screenTitle,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF1A202C),
                            ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: _reloadPanelTab,
                    icon: const Icon(Icons.refresh_rounded, size: 22, color: Color(0xFF4B5563)),
                    tooltip: 'Muat semula panel',
                    color: const Color(0xFF4B5563),
                  ),
                ],
              ),
            ),
          // Baris 2: kawasan skrin (widget Dart)
          Expanded(
            child: _buildScreenWidget(),
          ),
        ],
      ),
    );
  }

  /// Widget skrin mengikut tab yang dipilih (sub-skrin dari folder cloud_tabs).
  Widget _buildScreenWidget() {
    if (_currentTabId.isEmpty) {
      return const PlaceholderScreen(
        title: 'Pilih menu dari drawer',
        subtitle: 'Buka menu dan pilih Konfigurasi, Countdown, dll.',
      );
    }
    final key = ValueKey('${_currentTabId}_$_panelRefreshKey');
    switch (_currentTabId) {
      case 'config':
        return ConfigScreen(key: key, config: widget.config);
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

  IconData _iconForTabId(String tabId) {
    switch (tabId) {
      case 'config':
        return Icons.settings;
      case 'countdowns':
        return Icons.hourglass_bottom;
      case 'announcements':
        return Icons.campaign;
      case 'slideshow':
        return Icons.slideshow;
      case 'kuliah':
        return Icons.menu_book;
      case 'imam-bilal':
        return Icons.groups;
      case 'background':
        return Icons.image;
      case 'kematian':
        return Icons.self_improvement;
      case 'livestream':
        return Icons.videocam;
      default:
        return Icons.dashboard;
    }
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String label,
    required String tabId,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      onTap: () {
        Navigator.of(context).pop(); // tutup drawer
        setState(() {
          _screenTitle = label;
          _currentTabId = tabId;
        });
        _controller.runJavaScript(
          "if (window.showTab) window.showTab('$tabId');",
        );
      },
    );
  }

  Widget _buildOfflineOverlay() {
    return Positioned.fill(
      child: AbsorbPointer(
        absorbing: true,
        child: Container(
          color: Colors.black54,
          alignment: Alignment.center,
          padding: const EdgeInsets.all(24),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.wifi_off, size: 64, color: Colors.grey.shade600),
                  const SizedBox(height: 16),
                  Text(
                    'Tiada sambungan internet',
                    style: Theme.of(context).textTheme.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Kemaskini tidak dibenarkan sehingga sambungan pulih.',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
