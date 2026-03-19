import 'package:flutter/material.dart';

import 'dart:async';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'config_sub_screen.dart';
import 'config_tabs_def.dart';

/// Skrin Konfigurasi (menu sahaja): paparkan senarai tab dan buka `ConfigSubScreen`.
/// Guna socketService dari panel jika disediakan (seperti KematianScreen) — elak soket ganda & loading berulang.
class ConfigScreen extends StatefulWidget {
  const ConfigScreen({
    super.key,
    this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig? config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  Map<String, String> _configData = <String, String>{};
  bool _configLoading = false;
  bool _configLoaded = false;
  final ScrollController _scrollController = ScrollController();
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant ConfigScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config != widget.config || oldWidget.socketService != widget.socketService) {
      _readySub?.cancel();
      _readySub = null;
      _cloudConnSub?.cancel();
      _cloudConnSub = null;
      _reconnectTimer?.cancel();
      _reconnectTimer = null;
      if (_ownsSocket) _socketService?.dispose();
      _socketService = null;
      _ownsSocket = false;
      _configData = <String, String>{};
      _configLoaded = false;
      _initSocketAndLoad();
      return;
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _loadConfigData();
    }
  }

  void _initSocketAndLoad() {
    final cfg = widget.config;
    _socketService = widget.socketService;
    if (_socketService == null) {
      if (cfg == null) return;
      _ownsSocket = true;
      _socketService = CloudSocketService(config: cfg);
      _socketService!.connect();
    }

    _configLoading = true;
    _bindConnectionListener();

    // Selari KematianScreen: jika socket sudah ready, load serta-merta (elak onReadyStream tak replay).
    if (_socketService!.isReady) {
      _loadConfigData();
    } else {
      _readySub?.cancel();
      _readySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        _loadConfigData();
      });
    }
  }

  void _bindConnectionListener() {
    _cloudConnSub?.cancel();
    final svc = _socketService;
    if (svc == null) return;
    _cloudConnSub = svc.cloudConnectedStream.listen((connected) {
      if (!mounted) return;
      if (connected) {
        _reconnectTimer?.cancel();
        _reconnectTimer = null;
        return;
      }
      // Sambung semula secara automatik (debounce) bila disconnect/failed.
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        svc.reconnect();
      });
    });
  }

  Future<bool> _ensureSocketReady() async {
    final cfg = widget.config;
    if (_socketService == null && cfg == null) return false;
    if (_socketService == null) {
      _socketService = widget.socketService ?? CloudSocketService(config: cfg!);
      _ownsSocket = (_socketService != widget.socketService);
    }
    final current = _socketService!;

    if (!current.isConnected) {
      current.connect();
    }
    if (current.isReady) return true;

    try {
      await current.onReadyStream.first.timeout(const Duration(seconds: 8));
    } catch (_) {}
    return current.isReady;
  }

  Future<void> _refreshNow() async {
    await _ensureSocketReady();
    await _loadConfigData();
  }

  Future<void> _loadConfigData() async {
    if (_socketService == null) return;
    if (mounted) setState(() => _configLoading = true);
    try {
      final result = await _socketService!.fetchData('config');
      final map = <String, String>{};
      for (final row in result.data) {
        final k = row['key']?.toString();
        final v = row['value']?.toString();
        if (k != null && k.isNotEmpty) map[k] = v ?? '';
      }
      if (!mounted) return;
      setState(() {
        _configData = map;
        _configLoaded = true;
        _configLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _configLoading = false);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _readySub?.cancel();
    _cloudConnSub?.cancel();
    _reconnectTimer?.cancel();
    if (_ownsSocket) _socketService?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      // color: const Color(0xFFF5F5F5),
      child: RefreshIndicator(
        onRefresh: _refreshNow,
        child: ListTabBar(
          scrollController: _scrollController,
          scrollPhysics: const AlwaysScrollableScrollPhysics(),
          items: ConfigTabsDef.tabs,
          onTap: (tabId) {
            final tab = ConfigTabsDef.tabOf(tabId);
            ConfigSubScreen.push(
              context,
              config: widget.config,
              socketService: _socketService,
              initialConfigData: _configLoaded ? _configData : null,
              configLoading: _configLoading,
              tabId: tabId,
              title: tab.title,
              refreshTrigger: widget.refreshTrigger,
            );
          },
          iconColorForId: ConfigTabsDef.iconColorForId,
        ),
      ),
    );
  }
}
