import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'kuliah_ganti_list_sub_screen.dart';
import 'kuliah_jadual_list_sub_screen.dart';
import 'kuliah_paparan_list_sub_screen.dart';
import 'kuliah_pengkuliah_list_sub_screen.dart';
import 'kuliah_tabs_def.dart';

/// Skrin Kuliah (menu sahaja): paparkan senarai tab dan buka sub-skrin.
///
/// Selari AnnouncementsScreen/SlideshowScreen: guna socketService dari panel jika
/// disediakan untuk elak soket ganda.
class KuliahScreen extends StatefulWidget {
  const KuliahScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<KuliahScreen> createState() => _KuliahScreenState();
}

class _KuliahScreenState extends State<KuliahScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  final ScrollController _scrollController = ScrollController();
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  @override
  void initState() {
    super.initState();
    _initSocket();
  }

  @override
  void didUpdateWidget(covariant KuliahScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService || oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _initSocket();
      return;
    }
  }

  void _initSocket() {
    _socketService = widget.socketService;
    if (_socketService == null) {
      _ownsSocket = true;
      _socketService = CloudSocketService(config: widget.config);
      _socketService!.connect();
    }

    _bindConnectionListener();

    if (!_socketService!.isReady) {
      _readySub?.cancel();
      _readySub = _socketService!.onReadyStream.listen((_) {
        // Tiada load data di sini (menu sahaja) — sub-skrin akan fetch.
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
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        svc.reconnect();
      });
    });
  }

  void _disposeSocketBindings() {
    _readySub?.cancel();
    _readySub = null;
    _cloudConnSub?.cancel();
    _cloudConnSub = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    if (_ownsSocket) _socketService?.dispose();
    _socketService = null;
    _ownsSocket = false;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      child: RefreshIndicator(
        onRefresh: () async {},
        child: ListTabBar(
          scrollController: _scrollController,
          scrollPhysics: const AlwaysScrollableScrollPhysics(),
          items: KuliahTabsDef.tabs,
          iconColorForId: KuliahTabsDef.iconColorForId,
          onTap: (tabId) async {
            final svc = _socketService;
            if (svc == null) return;
            if (tabId == 'jadual') {
              await KuliahJadualListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'ganti') {
              await KuliahGantiListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'pengkuliah') {
              await KuliahPengkuliahListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'paparan') {
              await KuliahPaparanListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
          },
        ),
      ),
    );
  }
}
