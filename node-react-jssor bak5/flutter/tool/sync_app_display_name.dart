// Menyegerakkan display_name daripada app_brand.yaml ke semua platform yang disokong.
// Jalankan dari root projek Flutter: dart run tool/sync_app_display_name.dart

import 'dart:io';

void main(List<String> args) {
  final root = Directory.current;
  final brandFile = File('${root.path}/app_brand.yaml');
  if (!brandFile.existsSync()) {
    stderr.writeln('Fail tidak dijumpai: app_brand.yaml');
    exit(1);
  }
  final raw = brandFile.readAsStringSync();
  final name = _parseDisplayName(raw);
  if (name == null || name.isEmpty) {
    stderr.writeln('app_brand.yaml: medan display_name tidak dijumpai atau kosong.');
    exit(1);
  }

  _writeDartConfig(root, name);
  _writeAndroidStrings(root, name);
  _patchAndroidManifest(root);
  _patchWebIndex(root, name);
  _patchIosPlist(root, name);
  _patchMacosPlist(root, name);
  _patchLinuxDesktop(root, name);

  stdout.writeln('Tajuk disegerakkan: "$name"');
}

String? _parseDisplayName(String yaml) {
  final m = RegExp(
    r'^display_name:\s*(.+?)\s*$',
    multiLine: true,
  ).firstMatch(yaml);
  if (m == null) return null;
  var v = m.group(1)!.trim();
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))) {
    v = v.substring(1, v.length - 1);
  }
  return v;
}

String _escapeXml(String s) => s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

String _dartStringLiteral(String s) =>
    '"${s.replaceAll(r'\', r'\\').replaceAll('"', r'\"').replaceAll(r'$', r'\$')}"';

void _writeDartConfig(Directory root, String name) {
  final out = File('${root.path}/lib/config/app_display_name.dart');
  out.parent.createSync(recursive: true);
  out.writeAsStringSync('''// Dijana oleh tool/sync_app_display_name.dart — jangan sunting tangan.
// Ubah app_brand.yaml lalu jalankan: dart run tool/sync_app_display_name.dart

const String kAppDisplayName = ${_dartStringLiteral(name)};
''');
}

void _writeAndroidStrings(Directory root, String name) {
  final dir = Directory('${root.path}/android/app/src/main/res/values');
  dir.createSync(recursive: true);
  final f = File('${dir.path}/strings.xml');
  f.writeAsStringSync('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${_escapeXml(name)}</string>
</resources>
''');
}

void _patchAndroidManifest(Directory root) {
  final f = File('${root.path}/android/app/src/main/AndroidManifest.xml');
  if (!f.existsSync()) return;
  var xml = f.readAsStringSync();
  if (xml.contains('android:label="@string/app_name"')) return;
  xml = xml.replaceFirst(
    RegExp(r'android:label="[^"]*"'),
    'android:label="@string/app_name"',
  );
  f.writeAsStringSync(xml);
}

void _patchWebIndex(Directory root, String name) {
  final f = File('${root.path}/web/index.html');
  if (!f.existsSync()) return;
  var html = f.readAsStringSync();
  html = html.replaceFirst(
    RegExp(r'<title>.*?</title>', dotAll: true),
    '<title>${_escapeXml(name)}</title>',
  );
  f.writeAsStringSync(html);
}

void _patchIosPlist(Directory root, String name) {
  _patchPlistDisplayName(
    File('${root.path}/ios/Runner/Info.plist'),
    name,
  );
}

void _patchMacosPlist(Directory root, String name) {
  _patchPlistDisplayName(
    File('${root.path}/macos/Runner/Info.plist'),
    name,
  );
}

void _patchPlistDisplayName(File plist, String name) {
  if (!plist.existsSync()) return;
  var t = plist.readAsStringSync();
  final escaped = _escapeXml(name);
  final re = RegExp(
    r'(<key>CFBundleDisplayName</key>\s*<string>).*?(</string>)',
    dotAll: true,
  );
  if (re.hasMatch(t)) {
    t = t.replaceFirstMapped(
      re,
      (m) => '${m.group(1)}$escaped${m.group(2)}',
    );
    plist.writeAsStringSync(t);
    return;
  }
  final dictOpen = RegExp(r'<dict>\s*\n').firstMatch(t);
  if (dictOpen != null) {
    final insert =
        '\t<key>CFBundleDisplayName</key>\n\t<string>$escaped</string>\n';
    t = t.replaceRange(dictOpen.end, dictOpen.end, insert);
    plist.writeAsStringSync(t);
  }
}

void _patchLinuxDesktop(Directory root, String name) {
  final linux = Directory('${root.path}/linux');
  if (!linux.existsSync()) return;
  for (final e in linux.listSync()) {
    if (e is! File || !e.path.endsWith('.desktop')) continue;
    var content = e.readAsStringSync();
    content = content.replaceFirstMapped(
      RegExp(r'^Name=.*$', multiLine: true),
      (_) => 'Name=$name',
    );
    e.writeAsStringSync(content);
  }
}
