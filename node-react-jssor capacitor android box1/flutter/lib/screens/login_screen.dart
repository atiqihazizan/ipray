import 'dart:async';

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/cloud_socket_service.dart';
import '../services/config_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    this.initialConfig,
    required this.onSaved,
    this.cloudService,
  });

  final AppConfig? initialConfig;
  final void Function(AppConfig config) onSaved;

  /// Sambungan sedia ada (cth. dari panel). Jika null dan [initialConfig] sah,
  /// skrin akan bina sambungan sementara untuk paparan status.
  final CloudSocketService? cloudService;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _baseUrlController = TextEditingController();
  final _realtimeUrlController = TextEditingController();
  final _clientIdController = TextEditingController();
  final _clientTokenController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  CloudSocketService? _ownedService;
  StreamSubscription<bool>? _cloudSub;
  bool _cloudConnected = false;
  bool _hasCloudBinding = false;

  CloudSocketService? get _effective => widget.cloudService ?? _ownedService;

  @override
  void initState() {
    super.initState();
    _fillFrom(widget.initialConfig);
    _setupCloudBinding();
  }

  static const _defaultBaseUrl = 'http://ipray-cloud.mahsites.net';

  void _fillFrom(AppConfig? c) {
    if (c == null) {
      _baseUrlController.text = _defaultBaseUrl;
      return;
    }
    _baseUrlController.text = c.baseUrl.isNotEmpty ? c.baseUrl : _defaultBaseUrl;
    _realtimeUrlController.text = c.socketUrl;
    _clientIdController.text = c.clientId;
    _clientTokenController.text = c.clientToken;
  }

  void _setupCloudBinding() {
    if (widget.cloudService == null &&
        widget.initialConfig != null &&
        widget.initialConfig!.isValid) {
      _ownedService = CloudSocketService(config: widget.initialConfig!);
      _ownedService!.connect();
    }

    final s = _effective;
    if (s == null) return;

    _hasCloudBinding = true;
    _cloudConnected = s.isConnected;
    _cloudSub = s.cloudConnectedStream.listen((connected) {
      if (mounted) setState(() => _cloudConnected = connected);
    });
  }

  @override
  void didUpdateWidget(covariant LoginScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.cloudService != widget.cloudService ||
        oldWidget.initialConfig != widget.initialConfig) {
      _cloudSub?.cancel();
      _cloudSub = null;
      _ownedService?.dispose();
      _ownedService = null;
      _hasCloudBinding = false;
      _fillFrom(widget.initialConfig);
      _setupCloudBinding();
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    _cloudSub?.cancel();
    _ownedService?.dispose();
    _baseUrlController.dispose();
    _realtimeUrlController.dispose();
    _clientIdController.dispose();
    _clientTokenController.dispose();
    super.dispose();
  }

  Future<void> _saveAndConnect() async {
    _errorMessage = null;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final baseUrl = _baseUrlController.text.trim();
    final realtimeUrl = _realtimeUrlController.text.trim();
    final config = AppConfig(
      baseUrl: baseUrl,
      socketUrl: realtimeUrl.isEmpty ? baseUrl : realtimeUrl,
      clientId: _clientIdController.text.trim(),
      clientToken: _clientTokenController.text.trim(),
    );

    try {
      await ConfigService.instance.save(config);
      final s = _effective;
      if (s != null) {
        s.updateConfig(config);
      }
      if (mounted) widget.onSaved(config);
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _reconnectCloud() {
    _effective?.reconnect();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Konfigurasi Cloud'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_hasCloudBinding) ...[
                _ConnectionStatusCard(
                  connected: _cloudConnected,
                  onReconnect: _cloudConnected ? null : _reconnectCloud,
                ),
                const SizedBox(height: 16),
              ],
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.red.shade800),
                  ),
                ),
              ],
              TextFormField(
                controller: _baseUrlController,
                decoration: const InputDecoration(
                  labelText: 'Base URL',
                  hintText: 'https://cloud.ipray.my',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
                autocorrect: false,
                validator: (v) {
                  final s = v?.trim() ?? '';
                  if (s.isEmpty) return 'Sila isi Base URL';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _realtimeUrlController,
                decoration: const InputDecoration(
                  labelText: 'URL sambungan langsung (pilihan, kosongkan = Base URL)',
                  hintText: 'https://cloud.ipray.my',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
                autocorrect: false,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientIdController,
                decoration: const InputDecoration(
                  labelText: 'Client ID',
                  hintText: 'clientA',
                  border: OutlineInputBorder(),
                ),
                autocorrect: false,
                validator: (v) {
                  if ((v?.trim() ?? '').isEmpty) return 'Sila isi Client ID';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientTokenController,
                decoration: const InputDecoration(
                  labelText: 'Client Token',
                  hintText: 'Token dari server',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                autocorrect: false,
                validator: (v) {
                  if ((v?.trim() ?? '').isEmpty) return 'Sila isi Client Token';
                  return null;
                },
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: _isLoading ? null : _saveAndConnect,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Simpan & Sambung'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConnectionStatusCard extends StatelessWidget {
  const _ConnectionStatusCard({
    required this.connected,
    this.onReconnect,
  });

  final bool connected;
  final VoidCallback? onReconnect;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = connected ? Colors.green.shade50 : Colors.orange.shade50;
    final border = connected ? Colors.green.shade200 : Colors.orange.shade200;
    final icon = connected ? Icons.cloud_done_outlined : Icons.cloud_off_outlined;
    final title = connected ? 'Bersambung dengan pelayan' : 'Sambungan terputus';

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, color: connected ? scheme.primary : scheme.error),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
            if (onReconnect != null) ...[
              const SizedBox(height: 12),
              FilledButton.tonalIcon(
                onPressed: onReconnect,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Sambung semula'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
