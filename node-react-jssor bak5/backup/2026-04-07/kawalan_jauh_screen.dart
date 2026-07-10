import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';

/// Skrin Kawalan Jauh — kawalan paparan kiosk dari jarak jauh.
class KawalanJauhScreen extends StatelessWidget {
  const KawalanJauhScreen({
    super.key,
    required this.config,
    this.socketService,
  });

  final AppConfig config;
  final CloudSocketService? socketService;

  @override
  Widget build(BuildContext context) {
    final socketReady = socketService?.isReady ?? false;
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.settings_remote,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Kawalan Jauh',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Kiosk: ${config.clientId}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Gunakan skrin ini untuk mengawal paparan (navigasi, jeda, seterusnya) apabila fungsi disambungkan ke pelayan.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                socketReady
                    ? 'Sambungan soket: sedia'
                    : 'Sambungan soket: belum sedia',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: socketReady
                          ? Colors.green.shade700
                          : Theme.of(context).colorScheme.outline,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
