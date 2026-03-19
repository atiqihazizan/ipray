import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'slideshow_list_sub_screen.dart';
import 'slideshow_setting_sub_screen.dart';
import 'slideshow_tabs_def.dart';

/// Skrin Slideshow (menu sahaja): paparkan senarai tab dan buka sub-skrin.
///
/// Selari `AnnouncementsScreen`: guna `socketService` dari panel jika disediakan
/// untuk elak soket ganda.
class SlideshowScreen extends StatefulWidget {
  const SlideshowScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<SlideshowScreen> createState() => _SlideshowScreenState();
}

class _SlideshowScreenState extends State<SlideshowScreen> {
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
  void didUpdateWidget(covariant SlideshowScreen oldWidget) {
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
    if (_ownsSocket) {
      _socketService?.dispose();
    }
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
      // color: const Color(0xFFF5F5F5),
      child: RefreshIndicator(
        onRefresh: () async {},
        child: ListTabBar(
          scrollController: _scrollController,
          scrollPhysics: const AlwaysScrollableScrollPhysics(),
          items: SlideshowTabsDef.tabs,
          iconColorForId: SlideshowTabsDef.iconColorForId,
          onTap: (tabId) async {
            if (tabId == 'senarai') {
              await SlideshowListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'setting') {
              await SlideshowSettingSubScreen.push(
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
