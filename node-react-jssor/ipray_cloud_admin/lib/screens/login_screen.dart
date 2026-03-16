import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/config_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    this.initialConfig,
    required this.onSaved,
  });

  final AppConfig? initialConfig;
  final void Function(AppConfig config) onSaved;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _baseUrlController = TextEditingController();
  final _socketUrlController = TextEditingController();
  final _clientIdController = TextEditingController();
  final _clientTokenController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fillFrom(widget.initialConfig);
  }

  void _fillFrom(AppConfig? c) {
    if (c == null) return;
    _baseUrlController.text = c.baseUrl;
    _socketUrlController.text = c.socketUrl;
    _clientIdController.text = c.clientId;
    _clientTokenController.text = c.clientToken;
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _socketUrlController.dispose();
    _clientIdController.dispose();
    _clientTokenController.dispose();
    super.dispose();
  }

  Future<void> _saveAndConnect() async {
    _errorMessage = null;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final baseUrl = _baseUrlController.text.trim();
    final socketUrl = _socketUrlController.text.trim();
    final config = AppConfig(
      baseUrl: baseUrl,
      socketUrl: socketUrl.isEmpty ? baseUrl : socketUrl,
      clientId: _clientIdController.text.trim(),
      clientToken: _clientTokenController.text.trim(),
    );

    try {
      await ConfigService.instance.save(config);
      if (mounted) widget.onSaved(config);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
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
                controller: _socketUrlController,
                decoration: const InputDecoration(
                  labelText: 'Socket URL (pilihan, kosongkan = guna Base URL)',
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
