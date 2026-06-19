import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';

/// Skrin Kawalan Jauh — suis skrin melalui TCP ASCII (`sw i01` … `sw i04` + CRLF).
class KawalanJauhScreen extends StatefulWidget {
  const KawalanJauhScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  @override
  State<KawalanJauhScreen> createState() => _KawalanJauhScreenState();
}

class _KawalanJauhScreenState extends State<KawalanJauhScreen> {
  final _hostCtrl = TextEditingController();
  final _portCtrl = TextEditingController(text: '502');
  bool _loading = false;
  int? _selectedSwitch;
  StreamSubscription<void>? _onReadySub;

  void _bindReadyListener() {
    _onReadySub?.cancel();
    _onReadySub = null;
    final sock = widget.socketService;
    if (sock == null) return;
    _onReadySub = sock.onReadyStream.listen((_) {
      if (mounted) _loadConfigFromCloud();
    });
  }

  @override
  void initState() {
    super.initState();
    _bindReadyListener();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadConfigFromCloud());
  }

  @override
  void didUpdateWidget(covariant KawalanJauhScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService) {
      _bindReadyListener();
      _loadConfigFromCloud();
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _loadConfigFromCloud();
    }
  }

  @override
  void dispose() {
    _onReadySub?.cancel();
    _hostCtrl.dispose();
    _portCtrl.dispose();
    super.dispose();
  }

  static (String host, int port)? _parseHostPort(String? content) {
    if (content == null || content.trim().isEmpty) return null;
    for (final line in content.split(RegExp(r'\r?\n'))) {
      final t = line.trim();
      if (t.isEmpty || t.startsWith('#')) continue;
      final parts = t.split('|');
      if (parts.isEmpty) continue;
      final h = parts[0].trim();
      if (h.isEmpty) continue;
      final p = parts.length > 1
          ? int.tryParse(parts[1].trim()) ?? 502
          : 502;
      return (h, p);
    }
    return null;
  }

  Future<void> _loadConfigFromCloud() async {
    final sock = widget.socketService;
    if (sock == null || !sock.isReady) return;
    setState(() => _loading = true);
    try {
      final raw = await sock.fetchModbusRemoteRaw();
      if (!mounted) return;
      // final rawPreview = raw == null
      //     ? '(null)'
      //     : raw.isEmpty
      //         ? '(kosong)'
      //         : raw.replaceAll('\r', r'\r').replaceAll('\n', r'\n');
      // _snack('Selepas fetch (raw): $rawPreview', duration: const Duration(seconds: 8));
      final parsed = _parseHostPort(raw);
      if (parsed != null) {
        _hostCtrl.text = parsed.$1;
        _portCtrl.text = '${parsed.$2}';
      }
    } catch (e) {
      _snack('Fetch modbus-remote gagal: $e', error: true, duration: const Duration(seconds: 8));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg, {bool error = false, Duration? duration}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        duration: duration ?? const Duration(seconds: 4),
        backgroundColor: error ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  Future<void> _save() async {
    final sock = widget.socketService;
    if (sock == null || !sock.isConnected) {
      _snack('Sambungan cloud diperlukan.', error: true);
      return;
    }
    final host = _hostCtrl.text.trim();
    final port = int.tryParse(_portCtrl.text.trim()) ?? 0;
    if (host.isEmpty || port < 1 || port > 65535) {
      _snack('Isi host dan port (1–65535) yang sah.', error: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await sock.saveRemoteSwitchEndpoint(host, port);
      _snack('Konfigurasi berjaya disimpan.');
    } catch (e) {
      _snack('Gagal simpan: $e', error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fire(int sw) async {
    final sock = widget.socketService;
    if (sock == null || !sock.isConnected) {
      _snack('Sambungan cloud diperlukan.', error: true);
      return;
    }
    setState(() {
      _loading = true;
      _selectedSwitch = sw;
    });
    try {
      final res = await sock.fireRemoteSwitch(sw);
      String detail = '';
      if (res is Map) {
        final sent = res['sent']?.toString();
        final idx = res['lastSlideIndex'];
        final reply = res['reply']?.toString();
        if (sent != null) {
          detail = ' — dihantar: $sent (indeks skrin kiosk: $idx)';
        }
        if (reply != null && reply.isNotEmpty) {
          detail = '$detail | jawapan: $reply';
        }
      }
      // _snack('Arahan suis $sw dihantar$detail');
    } catch (e) {
      _snack('Gagal hantar: $e', error: true);
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _selectedSwitch = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sock = widget.socketService;
    final socketReady = sock?.isReady ?? false;
    final localKiosk = sock != null;

    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  Icons.settings_remote,
                  size: 56,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 12),
                Text(
                  'Kawalan Jauh (suis skrin)',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Kiosk: ${widget.config.clientId}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Hantar arahan ASCII seperti HF2211/ATEN: sw i01 … sw i04 + \\r ke IP/port dalam fail modbus-remote.txt pada kiosk.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                if (!localKiosk)
                  Text(
                    'Tiada sambungan soket.',
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                    textAlign: TextAlign.center,
                  )
                else ...[
                  Text(
                    socketReady
                        ? 'Sambungan panel: sedia'
                        : 'Sambungan panel: belum sedia',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: socketReady
                              ? Colors.green.shade700
                              : Theme.of(context).colorScheme.outline,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _hostCtrl,
                    decoration: const InputDecoration(
                      labelText: 'IP atau host Modbus/TCP',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _portCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Port',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _loading ? null : _save,
                    child: const Text('Simpan ke kiosk'),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Suis (1–4)',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: List.generate(4, (i) {
                      final n = i + 1;
                      final busy = _loading && _selectedSwitch == n;
                      return SizedBox(
                        width: 96,
                        child: FilledButton.tonal(
                          onPressed: (_loading && !busy) ? null : () => _fire(n),
                          child: busy
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text('Suis $n'),
                        ),
                      );
                    }),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
