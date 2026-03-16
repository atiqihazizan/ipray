import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'screens/cloud_webview_screen.dart';
import 'screens/login_screen.dart';
import 'services/config_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'MIDM Cloud Admin',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const AppGate(),
    );
  }
}

class AppGate extends StatefulWidget {
  const AppGate({super.key});

  @override
  State<AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<AppGate> {
  AppConfig? _config;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    final config = await ConfigService.instance.load();
    if (mounted) {
      setState(() {
        _config = config;
        _loading = false;
      });
    }
  }

  void _onConfigSaved(AppConfig config) {
    setState(() => _config = config);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_config == null || !_config!.isValid) {
      return LoginScreen(
        initialConfig: _config,
        onSaved: _onConfigSaved,
      );
    }

    return CloudWebViewScreen(
      config: _config!,
      onOpenConfig: () async {
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (context) => LoginScreen(
              initialConfig: _config,
              onSaved: (c) {
                setState(() => _config = c);
                Navigator.of(context).pop();
              },
            ),
          ),
        );
      },
    );
  }
}
