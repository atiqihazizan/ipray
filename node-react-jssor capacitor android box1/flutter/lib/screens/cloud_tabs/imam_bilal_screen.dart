import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_tab_bar.dart';
import 'imam_bilal_jadual_list_sub_screen.dart';
import 'imam_bilal_petugas_list_sub_screen.dart';
import 'imam_bilal_tabs_def.dart';

/// Skrin menu Imam & Bilal (senarai sub-tab).
class ImamBilalScreen extends StatefulWidget {
  const ImamBilalScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<ImamBilalScreen> createState() => _ImamBilalScreenState();
}

class _ImamBilalScreenState extends State<ImamBilalScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;

  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  @override
  void initState() {
    super.initState();
    _initSocket();
  }

  @override
  void didUpdateWidget(covariant ImamBilalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService ||
        oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _initSocket();
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
        // Menu sahaja; sub-skrin yang fetch data.
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
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      child: RefreshIndicator(
        onRefresh: () async {},
        child: ListTabBar(
          items: ImamBilalTabsDef.tabs,
          iconColorForId: ImamBilalTabsDef.iconColorForId,
          onTap: (tabId) async {
            final svc = _socketService;
            if (svc == null) return;
            if (tabId == 'jadual-petugas') {
              await ImamBilalJadualListSubScreen.push(
                context,
                config: widget.config,
                socketService: svc,
                refreshTrigger: widget.refreshTrigger,
              );
              return;
            }
            if (tabId == 'petugas') {
              await ImamBilalPetugasListSubScreen.push(
                context,
                config: widget.config,
                socketService: svc,
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
