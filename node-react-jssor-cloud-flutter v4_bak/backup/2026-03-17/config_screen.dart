import 'package:flutter/material.dart';

import 'dart:async';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'config_sub_screen.dart';
import 'config_tabs_def.dart';

/// Skrin Konfigurasi (menu sahaja): paparkan senarai tab dan buka `ConfigSubScreen`.
class ConfigScreen extends StatefulWidget {
  const ConfigScreen({
    super.key,
    this.config,
    this.refreshTrigger = 0,
  });

  final AppConfig? config;
  final int refreshTrigger;

  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  CloudSocketService? _socketService;
  Map<String, String> _configData = <String, String>{};
  bool _configLoading = false;
  bool _configLoaded = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant ConfigScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config != widget.config) {
      _socketService?.dispose();
      _socketService = null;
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
    if (cfg == null) return;
    _socketService = CloudSocketService(config: cfg);
    _socketService!.connect();
    _configLoading = true;
    _socketService!.onReadyStream.listen((_) {
      if (!mounted) return;
      _loadConfigData();
    });
  }

  Future<void> _refreshNow() async {
    final cfg = widget.config;
    if (cfg == null) return;

    _socketService ??= CloudSocketService(config: cfg);
    if (!_socketService!.isConnected) {
      _socketService!.connect();
    } else {
      _socketService!.reconnect();
    }

    if (!_socketService!.isReady) {
      final completer = Completer<void>();
      StreamSubscription<void>? sub;
      sub = _socketService!.onReadyStream.listen((_) {
        sub?.cancel();
        if (!completer.isCompleted) completer.complete();
      });
      try {
        await completer.future.timeout(const Duration(seconds: 6));
      } catch (_) {
        await sub.cancel();
      }
    }

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
    _socketService?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F5F5),
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
