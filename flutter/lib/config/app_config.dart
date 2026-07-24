/// Model konfigurasi sambungan cloud untuk panel admin (native).
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

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppConfig &&
          runtimeType == other.runtimeType &&
          baseUrl == other.baseUrl &&
          socketUrl == other.socketUrl &&
          clientId == other.clientId &&
          clientToken == other.clientToken;

  @override
  int get hashCode =>
      baseUrl.hashCode ^
      socketUrl.hashCode ^
      clientId.hashCode ^
      clientToken.hashCode;
}
