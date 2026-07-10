import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';

const _keyBaseUrl = 'cloud_base_url';
const _keySocketUrl = 'cloud_socket_url';
const _keyClientId = 'cloud_client_id';
const _keyClientToken = 'cloud_client_token';

class ConfigService {
  ConfigService._();
  static final ConfigService instance = ConfigService._();

  Future<AppConfig> load() async {
    final prefs = await SharedPreferences.getInstance();
    final baseUrl = prefs.getString(_keyBaseUrl) ?? '';
    final socketUrl = prefs.getString(_keySocketUrl) ?? '';
    final clientId = prefs.getString(_keyClientId) ?? '';
    final clientToken = prefs.getString(_keyClientToken) ?? '';
    return AppConfig(
      baseUrl: baseUrl,
      socketUrl: socketUrl.isEmpty ? baseUrl : socketUrl,
      clientId: clientId,
      clientToken: clientToken,
    );
  }

  Future<void> save(AppConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, config.baseUrl);
    await prefs.setString(_keySocketUrl, config.socketUrl);
    await prefs.setString(_keyClientId, config.clientId);
    await prefs.setString(_keyClientToken, config.clientToken);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyBaseUrl);
    await prefs.remove(_keySocketUrl);
    await prefs.remove(_keyClientId);
    await prefs.remove(_keyClientToken);
  }
}
