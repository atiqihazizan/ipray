import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/app_config.dart';

/// Socket.IO untuk cloud panel. Selari dengan webmobile cloud-socket.js.
/// Event: registerSettingPanel, cloud:data:get → cloud:response (requestId).
class CloudSocketService {
  CloudSocketService({required this.config});

  final AppConfig config;
  IO.Socket? _socket;
  int _requestId = 0;
  final Map<String, _PendingRequest> _pending = {};
  static const int _timeoutMs = 15000;

  final StreamController<bool> _localConnectedController = StreamController<bool>.broadcast();

  /// Stream status sambungan kiosk (paparan) ke cloud. Selari webmobile local:status.
  /// true = Local (kiosk) bersambung ke cloud; false = kiosk tidak bersambung.
  Stream<bool> get localConnectedStream => _localConnectedController.stream;

  bool get isConnected => _socket?.connected ?? false;

  /// Emit tanpa menunggu respons — selari handleTestSound() di webmobile.
  void emitTestSound() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:test-sound');
    }
  }

  /// Emit tanpa menunggu respons — selari handleRebootKiosk() di webmobile.
  void emitRebootKiosk() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:reboot');
    }
  }

  final StreamController<void> _onReadyController = StreamController<void>.broadcast();

  /// Stream yang emit bila socket bersambung & registerSettingPanel berjaya.
  /// Guna ini untuk load data selepas socket siap — elak race condition.
  Stream<void> get onReadyStream => _onReadyController.stream;

  /// Sambung dan daftar panel. Panggil sekali selepas config ada.
  void connect() {
    if (_socket != null) return;
    _socket = IO.io(
      config.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      _socket!.emit('registerSettingPanel', {
        'clientId': config.clientId,
        'authToken': config.clientToken,
      });
      Future.delayed(const Duration(milliseconds: 800), () {
        if (_socket?.connected == true) {
          _socket!.emit('getLocalStatus');
        }
        if (!_onReadyController.isClosed) {
          _onReadyController.add(null);
        }
      });
    });

    _socket!.on('local:status', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : null;
      final connected = map?['connected'] == true;
      if (!_localConnectedController.isClosed) {
        _localConnectedController.add(connected);
      }
    });

    _socket!.on('cloud:response', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : null;
      if (map == null) return;
      final id = map['requestId']?.toString();
      if (id == null) return;
      final pending = _pending.remove(id);
      if (pending == null) return;
      pending.timer.cancel();
      if (map['success'] == true) {
        pending.completer.complete(map['data']);
      } else {
        pending.completer.completeError(Exception(map['error']?.toString() ?? 'Unknown error'));
      }
    });

    _socket!.onDisconnect((_) {});
    _socket!.onConnectError((e) {});
  }

  void disconnect() {
    for (final p in _pending.values) {
      p.timer.cancel();
      p.completer.completeError(TimeoutException('Disconnect'));
    }
    _pending.clear();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    if (!_localConnectedController.isClosed) {
      _localConnectedController.close();
    }
    if (!_onReadyController.isClosed) {
      _onReadyController.close();
    }
  }

  /// Emit event dan tunggu cloud:response (selari emitWithResponse di webmobile).
  Future<dynamic> emitWithResponse(String event, [Map<String, dynamic>? payload]) async {
    final id = '${DateTime.now().millisecondsSinceEpoch}_${++_requestId}';
    final completer = Completer<dynamic>();
    final timer = Timer(Duration(milliseconds: _timeoutMs), () {
      if (_pending.remove(id) != null) {
        completer.completeError(TimeoutException('Request timeout'));
      }
    });
    _pending[id] = _PendingRequest(completer: completer, timer: timer);
    final body = <String, dynamic>{...?payload, 'requestId': id};
    _socket?.emit(event, body);
    return completer.future;
  }

  /// Dapatkan data fail (config, hebahan, dll). Selari fetchData('fileName') di webmobile.
  /// Returns { data: List<Map>, columns: List<String> }.
  Future<CloudDataResult> fetchData(String fileName) async {
    final res = await emitWithResponse('cloud:data:get', {'fileName': fileName});
    if (res is! Map) return CloudDataResult(data: [], columns: []);
    final data = res['data'];
    final columns = res['columns'];
    return CloudDataResult(
      data: data is List ? List<Map<String, dynamic>>.from(data.map((e) => e is Map ? Map<String, dynamic>.from(e) : <String, dynamic>{})) : [],
      columns: columns is List ? List<String>.from(columns) : [],
    );
  }

  /// Kemas kini satu baris (config atau jadual).
  Future<void> updateRow(String fileName, int id, Map<String, dynamic> row) async {
    await emitWithResponse('cloud:data:update', {
      'fileName': fileName,
      'id': id,
      'row': row,
    });
  }

  /// Masukkan baris baru.
  Future<void> insertRow(String fileName, Map<String, dynamic> row, {String position = 'end'}) async {
    await emitWithResponse('cloud:data:insert', {
      'fileName': fileName,
      'row': row,
      'position': position,
    });
  }

  /// Padam satu baris.
  Future<void> deleteRow(String fileName, int id) async {
    await emitWithResponse('cloud:data:delete', {
      'fileName': fileName,
      'id': id,
    });
  }

  /// Insert baris hebahan (format raw string, selari cloudDataService hebahan).
  Future<void> insertHebahanRow(String text, String startDate, String endDate) async {
    final raw = '$text|$startDate|$endDate';
    await emitWithResponse('cloud:data:insert', {
      'fileName': 'hebahan',
      'row': raw,
      'position': 'end',
    });
  }

  /// Update baris hebahan (guna raw string).
  Future<void> updateHebahanRow(int id, String text, String startDate, String endDate) async {
    final raw = '$text|$startDate|$endDate';
    await emitWithResponse('cloud:data:update', {
      'fileName': 'hebahan',
      'id': id,
      'row': raw,
    });
  }

  /// Simpan keseluruhan fail data (contoh: hebahan) menggunakan cloud:file:save.
  Future<void> saveFile(String fileName, String content) async {
    await emitWithResponse('cloud:file:save', {
      'fileName': fileName,
      'content': content,
    });
  }

  /// Simpan item config (key/value) ke fail config.txt, selari saveConfigItem di webmobile.
  Future<void> saveConfigItem(String key, String value) async {
    final rawResult = await emitWithResponse('cloud:data:get', {'fileName': 'config'});
    if (rawResult is! Map) return;
    final data = rawResult['data'];
    if (data is! List) return;

    Map<String, dynamic>? existing;
    for (final row in data) {
      if (row is Map && row['key'] == key) {
        existing = Map<String, dynamic>.from(row);
        break;
      }
    }

    final formattedRow = '$key|$value';

    if (existing != null && existing['id'] != null) {
      print('[saveConfigItem] key=$key value=$value formattedRow=$formattedRow');
      final id = existing['id'];
      await emitWithResponse('cloud:data:update', {
        'fileName': 'config',
        'id': id,
        'row': {
          ...existing,
          'value': value,
          'raw': formattedRow,
        },
      });
    } else {
      await emitWithResponse('cloud:data:insert', {
        'fileName': 'config',
        'row': formattedRow,
        'position': 'end',
      });
    }
  }
}

class _PendingRequest {
  _PendingRequest({required this.completer, required this.timer});
  final Completer<dynamic> completer;
  final Timer timer;
}

class CloudDataResult {
  CloudDataResult({required this.data, required this.columns});
  final List<Map<String, dynamic>> data;
  final List<String> columns;
}
