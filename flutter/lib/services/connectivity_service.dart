import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

/// Jenis sambungan asas untuk paparan status.
enum ConnectionType { none, wifi, mobile, other }

/// Exposes connectivity and server health. "Offline" = no connectivity or health check failed.
class ConnectivityService {
  ConnectivityService._();
  static final ConnectivityService instance = ConnectivityService._();

  final _offlineController = StreamController<bool>.broadcast();
  Stream<bool> get offlineStream => _offlineController.stream;

  final _connectionTypeController =
      StreamController<ConnectionType>.broadcast();
  Stream<ConnectionType> get connectionTypeStream =>
      _connectionTypeController.stream;

  bool _isOffline = true;
  bool get isOffline => _isOffline;

  ConnectionType _connectionType = ConnectionType.none;
  ConnectionType get connectionType => _connectionType;

  Timer? _healthTimer;
  String _healthBaseUrl = '';
  Duration _healthInterval = const Duration(seconds: 20);

  final List<StreamSubscription<List<ConnectivityResult>>> _subs = [];

  void startMonitoring({required String baseUrl, Duration? healthInterval}) {
    _healthBaseUrl = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    if (healthInterval != null) _healthInterval = healthInterval;

    _subs.add(
      Connectivity().onConnectivityChanged.listen((results) {
        _onConnectivityChanged(results);
      }),
    );

    Connectivity().checkConnectivity().then(_onConnectivityChanged);
    _scheduleHealthCheck();
  }

  void _onConnectivityChanged(List<ConnectivityResult> results) {
    if (results.isEmpty) {
      _setConnectionType(ConnectionType.none);
      _setOffline(true);
      return;
    }

    if (results.contains(ConnectivityResult.wifi)) {
      _setConnectionType(ConnectionType.wifi);
    } else if (results.contains(ConnectivityResult.mobile)) {
      _setConnectionType(ConnectionType.mobile);
    } else if (results.contains(ConnectivityResult.none)) {
      _setConnectionType(ConnectionType.none);
    } else {
      _setConnectionType(ConnectionType.other);
    }

    final noConnection =
        _connectionType == ConnectionType.none || _connectionType == ConnectionType.other;
    if (noConnection) {
      _setOffline(true);
      return;
    }

    _checkHealth();
  }

  void _scheduleHealthCheck() {
    _healthTimer?.cancel();
    _healthTimer = Timer.periodic(_healthInterval, (_) => _checkHealth());
  }

  Future<void> _checkHealth() async {
    if (_healthBaseUrl.isEmpty) {
      _setOffline(true);
      return;
    }
    final uri = Uri.parse('${_healthBaseUrl}health');
    try {
      final resp = await http.get(uri).timeout(
        const Duration(seconds: 8),
        onTimeout: () => throw TimeoutException('health'),
      );
      _setOffline(resp.statusCode != 200);
    } catch (_) {
      _setOffline(true);
    }
  }

  void _setOffline(bool value) {
    if (_isOffline == value) return;
    _isOffline = value;
    _offlineController.add(value);
  }

  void _setConnectionType(ConnectionType type) {
    if (_connectionType == type) return;
    _connectionType = type;
    _connectionTypeController.add(type);
  }

  /// One-off health check (e.g. before opening WebView). Returns true if server OK.
  Future<bool> checkHealthOnce(String baseUrl) async {
    final url = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    final uri = Uri.parse('${url}health');
    try {
      final resp = await http.get(uri).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('health'),
      );
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void dispose() {
    _healthTimer?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    _subs.clear();
    _offlineController.close();
    _connectionTypeController.close();
  }
}
