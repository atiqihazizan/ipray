/// Model konfigurasi sambungan cloud untuk panel webmobile.
class AppConfig {
  final String baseUrl;
  final String socketUrl;
  final String clientId;
  final String clientToken;

  const AppConfig({
    required this.baseUrl,
    required this.socketUrl,
    required this.clientId,
    required this.clientToken,
  });

  /// URL penuh ke panel webmobile (tanpa trailing slash untuk konsistensi).
  String get webmobileUrl {
    final base = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    return '${base}webmobile/';
  }

  AppConfig copyWith({
    String? baseUrl,
    String? socketUrl,
    String? clientId,
    String? clientToken,
  }) {
    return AppConfig(
      baseUrl: baseUrl ?? this.baseUrl,
      socketUrl: socketUrl ?? this.socketUrl,
      clientId: clientId ?? this.clientId,
      clientToken: clientToken ?? this.clientToken,
    );
  }

  bool get isValid =>
      baseUrl.isNotEmpty &&
      clientId.isNotEmpty &&
      clientToken.isNotEmpty;
}
