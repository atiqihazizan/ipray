import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Rangka REST untuk cloud: upload, delete upload, ack.
/// Gunakan bila migrate UI ke native (tanpa WebView).
class CloudRestService {
  CloudRestService({required this.config});
  final AppConfig config;

  String get _base => config.baseUrl.endsWith('/') ? config.baseUrl : '${config.baseUrl}/';

  Map<String, String> get _headers => {
        'x-auth-token': config.clientToken,
        'Content-Type': 'application/json',
      };

  /// POST /upload – multipart: file, clientId, folder.
  Future<http.Response> upload({
    required List<int> fileBytes,
    required String originalName,
    required String folder,
  }) async {
    final uri = Uri.parse('${_base}upload');
    final request = http.MultipartRequest('POST', uri);
    request.headers['x-auth-token'] = config.clientToken;
    request.fields['clientId'] = config.clientId;
    request.fields['folder'] = folder;
    request.files.add(http.MultipartFile.fromBytes(
      'file',
      fileBytes,
      filename: originalName,
    ));
    final streamed = await request.send();
    return http.Response.fromStream(streamed);
  }

  /// DELETE /upload – body JSON: clientId, fileName, folder.
  Future<http.Response> deleteUpload({
    required String fileName,
    required String folder,
  }) async {
    final uri = Uri.parse('${_base}upload');
    return http.delete(
      uri,
      headers: _headers,
      body: '{"clientId":"${config.clientId}","fileName":"$fileName","folder":"$folder"}',
    );
  }

  /// POST /ack – body: clientId, file, status.
  Future<http.Response> ack({required String file, required String status}) async {
    final uri = Uri.parse('${_base}ack');
    return http.post(
      uri,
      headers: _headers,
      body: '{"clientId":"${config.clientId}","file":"$file","status":"$status"}',
    );
  }
}
