import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/app_config.dart';

/// Socket.IO untuk cloud panel. Selari dengan webmobile cloud-socket.js.
/// Event: registerSettingPanel, cloud:data:get → cloud:response (requestId).
class CloudSocketService {
  CloudSocketService({required AppConfig config}) : _config = config;

  /// Elak path dalam URL (cth. /setting) dianggap sebagai Socket.IO namespace.
  /// Guna hanya scheme + host + port — selari dengan `io(SOCKET_URL)` di cloud-socket.js.
  static String normalizeSocketUrl(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return s;
    final uri = Uri.tryParse(s);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) return s;
    return Uri(
      scheme: uri.scheme.toLowerCase(),
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
    ).toString();
  }

  AppConfig _config;
  IO.Socket? _socket;
  int _requestId = 0;
  final Map<String, _PendingRequest> _pending = {};
  static const int _timeoutMs = 15000;

  final StreamController<bool> _localConnectedController = StreamController<bool>.broadcast();
  final StreamController<bool> _cloudConnectedController = StreamController<bool>.broadcast();

  /// Stream status sambungan kiosk (paparan) ke cloud. Selari webmobile local:status.
  /// true = Local (kiosk) bersambung ke cloud; false = kiosk tidak bersambung.
  Stream<bool> get localConnectedStream => _localConnectedController.stream;

  /// Stream status sambungan Cloud (socket connect/disconnect).
  Stream<bool> get cloudConnectedStream => _cloudConnectedController.stream;

  bool get isConnected => _socket?.connected ?? false;

  bool _isReady = false;

  /// True bila socket sudah connect dan panel sudah "ready" untuk fetch data.
  /// Nota: `onReadyStream` tidak replay untuk subscriber lewat; guna ini sebagai fallback.
  bool get isReady => _isReady;

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

  /// Emit tanpa respons untuk pengumuman kematian (update).
  void emitKematianUpdate(Map<String, dynamic> data) {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:kematian:update', data);
    }
  }

  /// Emit tanpa respons untuk padam pengumuman kematian.
  void emitKematianClear() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:kematian:clear');
    }
  }

  /// Minta snapshot status kematian semasa.
  /// Nodejs akan jawab dengan event `kematian:updated` atau `kematian:cleared`.
  void requestKematianStatus() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:kematian:status');
    }
  }

  /// Emit mula siaran langsung — selari handleLiveStartFromTable() di webmobile.
  void emitLivestreamStart(Map<String, dynamic> data) {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:live:start', data);
    }
  }

  /// Emit hentikan siaran langsung — selari handleLiveStop() di webmobile.
  void emitLivestreamStop() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:live:stop');
    }
  }

  /// Minta snapshot status live (play/stop) dari nodejs.
  /// Nodejs akan jawab dengan event `live:started` atau `live:stopped`.
  void requestLivestreamStatus() {
    if (_socket?.connected == true) {
      _socket!.emit('cloud:live:status');
    }
  }

  final StreamController<void> _onReadyController = StreamController<void>.broadcast();

  /// Stream yang emit bila socket bersambung & registerSettingPanel berjaya.
  /// Guna ini untuk load data selepas socket siap — elak race condition.
  Stream<void> get onReadyStream => _onReadyController.stream;

  final StreamController<Map<String, dynamic>> _liveStartedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _liveStoppedController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get liveStartedStream => _liveStartedController.stream;
  Stream<Map<String, dynamic>> get liveStoppedStream => _liveStoppedController.stream;

  final StreamController<Map<String, dynamic>> _kematianUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _kematianClearedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _kematianOverlayConfigController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get kematianUpdatedStream => _kematianUpdatedController.stream;
  Stream<Map<String, dynamic>> get kematianClearedStream => _kematianClearedController.stream;
  Stream<Map<String, dynamic>> get kematianOverlayConfigStream => _kematianOverlayConfigController.stream;

  /// Kemas kini config dan sambung semula ke cloud.
  /// Jika sudah ada sambungan, akan putuskan dan bina socket baru dengan config baharu.
  void updateConfig(AppConfig newConfig) {
    _config = newConfig;
    reconnect();
  }

  /// Putuskan sambungan dan cuba sambung semula dengan config semasa.
  void reconnect() {
    disconnect();
    connect();
  }

  /// Sambung dan daftar panel. Panggil sekali selepas config ada.
  void connect() {
    if (_socket != null) return;
    _isReady = false;
    final url = normalizeSocketUrl(_config.socketUrl);
    _socket = IO.io(
      url,
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          // Cache Manager global dalam socket_io_client tidak dibuang selepas dispose —
          // tanpa forceNew, sambungan semula boleh guna Manager lama yang sudah ditutup.
          .enableForceNew()
          .setReconnectionAttempts(double.infinity)
          .setReconnectionDelay(1000)
          .setTimeout(25000)
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      _socket!.emit('registerSettingPanel', {
        'clientId': _config.clientId,
        'authToken': _config.clientToken,
      });
      if (!_cloudConnectedController.isClosed) {
        _cloudConnectedController.add(true);
      }
      Future.delayed(const Duration(milliseconds: 800), () {
        if (_socket?.connected == true) {
          _socket!.emit('getLocalStatus');
        }
        if (!_onReadyController.isClosed) {
          _isReady = true;
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

    // Flag live streaming dari kiosk/nodejs → di-forward oleh cloud server ke setting panel.
    _socket!.on('live:started', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      if (!_liveStartedController.isClosed) _liveStartedController.add(map);
    });
    _socket!.on('live:stopped', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      if (!_liveStoppedController.isClosed) _liveStoppedController.add(map);
    });

    // Flag kematian dari kiosk/nodejs → di-forward oleh cloud server ke setting panel.
    _socket!.on('kematian:updated', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      if (!_kematianUpdatedController.isClosed) _kematianUpdatedController.add(map);
    });
    _socket!.on('kematian:cleared', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      if (!_kematianClearedController.isClosed) _kematianClearedController.add(map);
    });
    _socket!.on('kematian:overlay-config', (data) {
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      if (!_kematianOverlayConfigController.isClosed) _kematianOverlayConfigController.add(map);
    });

    _socket!.onDisconnect((_) {
      if (!_cloudConnectedController.isClosed) {
        _cloudConnectedController.add(false);
      }
    });
    _socket!.onConnectError((e) {
      if (!_cloudConnectedController.isClosed) {
        _cloudConnectedController.add(false);
      }
    });
    _socket!.on('error', (data) {
      // Cloud server: validateSocketAuth gagal → emit error + disconnect.
      if (!_cloudConnectedController.isClosed) {
        _cloudConnectedController.add(false);
      }
    });
  }

  void disconnect() {
    _isReady = false;
    for (final p in _pending.values) {
      p.timer.cancel();
      p.completer.completeError(TimeoutException('Disconnect'));
    }
    _pending.clear();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;

    // Jangan tutup StreamController di sini — `disconnect()` juga digunakan oleh `reconnect()`.
    // Tutup semua controller hanya melalui `dispose()`.
    if (!_localConnectedController.isClosed) _localConnectedController.add(false);
    if (!_cloudConnectedController.isClosed) _cloudConnectedController.add(false);
  }

  /// Tamatkan service sepenuhnya (untuk `dispose()` pada widget).
  /// Ini akan memutuskan socket dan menutup semua stream.
  void dispose() {
    disconnect();
    if (!_localConnectedController.isClosed) _localConnectedController.close();
    if (!_onReadyController.isClosed) _onReadyController.close();
    if (!_cloudConnectedController.isClosed) _cloudConnectedController.close();
    if (!_liveStartedController.isClosed) _liveStartedController.close();
    if (!_liveStoppedController.isClosed) _liveStoppedController.close();
    if (!_kematianUpdatedController.isClosed) _kematianUpdatedController.close();
    if (!_kematianClearedController.isClosed) _kematianClearedController.close();
    if (!_kematianOverlayConfigController.isClosed) _kematianOverlayConfigController.close();
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

  /// Upload imej ke storage cloud untuk panel setting (guna cloud:image:upload).
  ///
  /// Return: path storage dalam format `/images/<category>/<filename>`.
  Future<String?> uploadImage({
    required Uint8List bytes,
    required String originalName,
    required String category,
  }) async {
    final base64 = base64Encode(bytes);
    final res = await emitWithResponse(
      'cloud:image:upload',
      {
        'base64': base64,
        'originalName': originalName,
        'category': category,
      },
    );

    if (res is! Map) return null;
    final path = res['path'];
    return path?.toString();
  }

  /// Kemaskini susunan baris slideshow (fileName=`slideshow`).
  Future<void> reorderSlideshow(List<int> orderedIds) async {
    await emitWithResponse('cloud:slideshow:reorder', {
      'orderedIds': orderedIds,
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

  /// Bina baris raw untuk countdown (selari format nodejs setting/api.js).
  /// format: date|masihi|hijri
  static String? buildCountdownRaw({
    required String format,
    required String event,
    String date = '',
    String tahun = '',
    String bulan = '',
    String hari = '',
    String windowDays = '',
  }) {
    final f = format.trim().toLowerCase();
    final e = event.trim();
    if (e.isEmpty) return null;
    final w = windowDays.trim();

    if (f == 'hijri') {
      final y = tahun.trim();
      final m = bulan.trim();
      final d = hari.trim();
      if (m.isEmpty || d.isEmpty) return null;
      return 'COUNTDOWN_HIJRI|$y|$m|$d|$e|$w';
    }
    if (f == 'masihi') {
      final m = bulan.trim();
      final d = hari.trim();
      if (m.isEmpty || d.isEmpty) return null;
      return 'COUNTDOWN_MASIHI|$m|$d|$e|$w';
    }
    final dt = date.trim();
    if (dt.isEmpty) return null;
    return 'COUNTDOWN|$dt|$e|$w';
  }

  /// Insert baris countdown menggunakan format raw (lebih selamat daripada hantar map).
  Future<void> insertCountdownRow({
    required String format,
    required String event,
    String date = '',
    String tahun = '',
    String bulan = '',
    String hari = '',
    String windowDays = '',
    String position = 'end',
  }) async {
    final raw = buildCountdownRaw(
      format: format,
      event: event,
      date: date,
      tahun: tahun,
      bulan: bulan,
      hari: hari,
      windowDays: windowDays,
    );
    if (raw == null) return;
    await insertRow('countdowns', {'raw': raw}, position: position);
  }

  /// Update baris countdown menggunakan format raw.
  Future<void> updateCountdownRow(
    int id, {
    required String format,
    required String event,
    String date = '',
    String tahun = '',
    String bulan = '',
    String hari = '',
    String windowDays = '',
  }) async {
    final raw = buildCountdownRaw(
      format: format,
      event: event,
      date: date,
      tahun: tahun,
      bulan: bulan,
      hari: hari,
      windowDays: windowDays,
    );
    if (raw == null) return;
    await updateRow('countdowns', id, {'raw': raw});
  }

  /// Simpan keseluruhan fail data (contoh: hebahan) menggunakan cloud:file:save.
  Future<void> saveFile(String fileName, String content) async {
    await emitWithResponse('cloud:file:save', {
      'fileName': fileName,
      'content': content,
    });
  }

  /// Baca modbus-remote.txt (mentah) dari storan cloud / sync.
  Future<String?> fetchModbusRemoteRaw() async {
    final rawResult = await emitWithResponse('cloud:file:get', {
      'fileName': 'modbus-remote',
    });
    if (rawResult is! Map) return null;
    final content = rawResult['content'];
    if (content == null) return null;
    return content.toString();
  }

  /// Simpan endpoint TCP pada kiosk (tulis modbus-remote.txt + sync).
  Future<void> saveRemoteSwitchEndpoint(String host, int port) async {
    await emitWithResponse('cloud:remote-switch:save', {
      'host': host.trim(),
      'port': port,
    });
  }

  /// Uji sambungan TCP dari kiosk ke IP/port dalam modbus-remote.txt.
  Future<void> testRemoteSwitchTcp() async {
    await emitWithResponse('cloud:remote-switch:test', {});
  }

  /// Hantar arahan `sw i0N` + CRLF melalui kiosk (switchIndex 1–4).
  Future<dynamic> fireRemoteSwitch(int switchIndex) {
    return emitWithResponse('cloud:remote-switch:fire', {
      'switchIndex': switchIndex,
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
      // print('[saveConfigItem] key=$key value=$value formattedRow=$formattedRow');
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
