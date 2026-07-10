import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../config/app_config.dart';
import '../services/connectivity_service.dart';
import 'native_config_screen.dart';

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
  bool _isOffline = true;
  String _connectionLabel = 'Mengesan sambungan...';

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

    _connectivity.connectionTypeStream.listen((type) {
      if (!mounted) return;
      setState(() {
        switch (type) {
          case ConnectionType.wifi:
          case ConnectionType.mobile:
            _connectionLabel = 'Local: Connected';
            break;
          case ConnectionType.none:
          case ConnectionType.other:
            _connectionLabel = 'Local: Disconnected';
            break;
        }
      });
    });
  }

  void _reload() {
    _controller.loadRequest(Uri.parse(widget.config.webmobileUrl));
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
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const NativeConfigScreen(),
                    ),
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
            const Text('Panel MIDM'),
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
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
            tooltip: 'Muat semula',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: widget.onOpenConfig,
            tooltip: 'Tetapan',
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isOffline) _buildOfflineOverlay(),
        ],
      ),
    );
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
