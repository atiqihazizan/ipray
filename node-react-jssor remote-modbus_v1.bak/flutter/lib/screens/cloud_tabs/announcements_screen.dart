import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'announcement_list_sub_screen.dart';
import 'announcement_setting_sub_screen.dart';
import 'announcement_tabs_def.dart';

/// Skrin Pengumuman (menu sahaja): paparkan senarai tab dan buka sub-skrin.
///
/// Selari `CountdownsScreen`: guna `socketService` dari panel jika disediakan
/// untuk elak soket ganda.
class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
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
  void didUpdateWidget(covariant AnnouncementsScreen oldWidget) {
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
      // color: const Color(0xFFF5F5F5),
      child: RefreshIndicator(
        onRefresh: () async {},
        child: ListTabBar(
          scrollController: _scrollController,
          scrollPhysics: const AlwaysScrollableScrollPhysics(),
          items: AnnouncementTabsDef.tabs,
          iconColorForId: AnnouncementTabsDef.iconColorForId,
          onTap: (tabId) async {
            if (tabId == 'senarai') {
              await AnnouncementListSubScreen.push(
                context,
                config: widget.config,
                socketService: _socketService,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'setting') {
              await AnnouncementSettingSubScreen.push(
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
