import 'dart:async';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Kuliah: Pengkuliah (Penceramah) — ganti table → list.
class KuliahPengkuliahListSubScreen extends StatefulWidget {
  const KuliahPengkuliahListSubScreen({
    super.key,
    required this.config,
    this.socketService,
    this.refreshTrigger = 0,
  });

  final AppConfig config;
  final CloudSocketService? socketService;
  final int refreshTrigger;

  static Future<void> push(
    BuildContext context, {
    required AppConfig config,
    CloudSocketService? socketService,
    int refreshTrigger = 0,
  }) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => KuliahPengkuliahListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<KuliahPengkuliahListSubScreen> createState() =>
      _KuliahPengkuliahListSubScreenState();
}

class _KuliahPengkuliahListSubScreenState
    extends State<KuliahPengkuliahListSubScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _images = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant KuliahPengkuliahListSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService ||
        oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _initSocketAndLoad();
      return;
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _loadAll();
    }
  }

  void _disposeSocketBindings() {
    _readySub?.cancel();
    _readySub = null;
    _cloudConnSub?.cancel();
    _cloudConnSub = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    if (_ownsSocket) _socketService?.dispose();
    _socketService = null;
    _ownsSocket = false;
  }

  void _initSocketAndLoad() {
    _socketService = widget.socketService;
    if (_socketService == null) {
      _ownsSocket = true;
      _socketService = CloudSocketService(config: widget.config);
      _socketService!.connect();
    }

    _bindConnectionListener();

    if (_socketService!.isReady) {
      _loadAll();
    } else {
      _readySub?.cancel();
      _readySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        _loadAll();
      });
    }
  }

  void _bindConnectionListener() {
    _cloudConnSub?.cancel();
    final svc = _socketService;
    if (svc == null) return;
    _cloudConnSub = svc.cloudConnectedStream.listen((connected) {
      if (!mounted) return;
      if (connected) {
        _reconnectTimer?.cancel();
        _reconnectTimer = null;
        return;
      }
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        svc.reconnect();
      });
    });
  }

  String _baseUrl() {
    var base = widget.config.baseUrl.trim();
    if (base.endsWith('/')) base = base.substring(0, base.length - 1);
    return base;
  }

  String _imageUrlForKod(String? kod) {
    final code = (kod ?? '').trim();
    if (code.isEmpty) return '${_baseUrl()}/images/noimage.png';
    for (final im in _images) {
      final imageCode = (im['imageCode']?.toString() ?? '').trim();
      if (imageCode != code) continue;
      final path = (im['imagePath']?.toString() ?? '').trim();
      if (path.isEmpty) continue;
      if (path.startsWith('http')) return path;
      if (path.startsWith('/images/')) return '${_baseUrl()}$path';
      if (path.startsWith('images/')) return '${_baseUrl()}/$path';
    }
    return '${_baseUrl()}/images/noimage.png';
  }

  Future<void> _loadAll() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final results = await Future.wait<dynamic>([
        svc.fetchData('penceramah'),
        svc.fetchData('images'),
      ]);
      if (!mounted) return;
      final penceramahRes = results[0] as CloudDataResult;
      final imagesRes = results[1] as CloudDataResult;
      setState(() {
        _rows = penceramahRes.data;
        _images = imagesRes.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _refreshNow() async {
    await _loadAll();
  }

  Future<void> _showAddDialog() async {
    if (_socketService == null) return;
    final draft = await showDialog<_PenceramahDraft>(
      context: context,
      builder: (ctx) => _PenceramahDialog(
        title: 'Tambah Pengkuliah',
        initial: const _PenceramahDraft(
          namaPenuh: '',
          shortname: '',
          kitab: '',
          kod: '',
          imageBytes: null,
          imageOriginalName: null,
        ),
        existingImageUrl: null,
      ),
    );
    if (draft == null) return;

    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      if (draft.imageBytes != null) {
        final uploadPath = await _socketService!.uploadImage(
          bytes: draft.imageBytes!,
          originalName: draft.imageOriginalName ?? 'penceramah.png',
          category: 'penceramah',
        );
        if (uploadPath != null && uploadPath.trim().isNotEmpty) {
          await _upsertImageForCode(
            code: draft.kod,
            imagePath: uploadPath,
          );
        }
      }

      await _socketService!.insertRow(
        'penceramah',
        {'raw': raw},
        position: 'end',
      );
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal tambah pengkuliah.')),
      );
    }
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final namaPenuh = (row['namaPenuh']?.toString() ?? '').trim();
    final shortname = (row['shortname']?.toString() ?? '').trim();
    final kitab = (row['kitab']?.toString() ?? '').trim();
    final kod = (row['kod']?.toString() ?? '').trim();
    final existingImageUrl = _imageUrlForKod(kod);

    final draft = await showDialog<_PenceramahDraft>(
      context: context,
      builder: (ctx) => _PenceramahDialog(
        title: 'Edit Pengkuliah #$id',
        initial: _PenceramahDraft(
          namaPenuh: namaPenuh,
          shortname: shortname,
          kitab: kitab,
          kod: kod,
          imageBytes: null,
          imageOriginalName: null,
        ),
        existingImageUrl: existingImageUrl,
      ),
    );
    if (draft == null) return;

    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      await svc.updateRow('penceramah', id, {'raw': raw});

      if (draft.imageBytes != null) {
        final uploadPath = await svc.uploadImage(
          bytes: draft.imageBytes!,
          originalName: draft.imageOriginalName ?? 'penceramah.png',
          category: 'penceramah',
        );
        if (uploadPath != null && uploadPath.trim().isNotEmpty) {
          await _upsertImageForCode(
            code: draft.kod,
            imagePath: uploadPath,
          );
        }
      }

      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal kemaskini pengkuliah.')),
      );
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final namaPenuh = (row['namaPenuh']?.toString() ?? '').trim();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Pengkuliah'),
        content: Text(
          namaPenuh.isEmpty ? 'Padam ID $id?' : 'Padam "$namaPenuh" (ID $id)?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Padam'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    try {
      await svc.deleteRow('penceramah', id);
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal padam pengkuliah.')),
      );
    }
  }

  Future<void> _upsertImageForCode({
    required String code,
    required String imagePath,
  }) async {
    final svc = _socketService;
    if (svc == null) return;
    final kod = code.trim();
    if (kod.isEmpty) return;

    final raw = '$kod|$imagePath';
    final matches = _images.where((im) {
      final imageCode = (im['imageCode']?.toString() ?? '').trim();
      return imageCode == kod;
    }).toList();

    if (matches.isEmpty) {
      await svc.insertRow('images', {'raw': raw}, position: 'end');
      return;
    }

    for (final m in matches) {
      final idRaw = m['id'];
      final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
      if (id == null) continue;
      await svc.updateRow('images', id, {'raw': raw});
    }
  }

  @override
  void dispose() {
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengkuliah'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          ListSubScreenAppBarActions(
            onAdd: _showAddDialog,
            onRefresh: _loadAll,
            loading: _loading,
            itemCount: _rows.length,
          ),
        ],
      ),
      body: Container(
        color: const Color(0xFFF5F5F5),
        child: RefreshIndicator(
          onRefresh: _refreshNow,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [_buildListCard()],
          ),
        ),
      ),
    );
  }

  Widget _buildListCard() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withAlpha((0.06 * 255).round()),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _loading
            ? const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            : (_rows.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Tiada data pengkuliah.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_rows.length * 2 - 1, (i) {
                      if (i.isOdd) {
                        return Divider(
                          height: 1,
                          thickness: 1,
                          color: Colors.grey.shade200,
                        );
                      }
                      final row = _rows[i ~/ 2];
                      final kod = (row['kod']?.toString() ?? '').trim();
                      final namaPenuh = (row['namaPenuh']?.toString() ?? '').trim();
                      final shortname =
                          (row['shortname']?.toString() ?? '').trim();
                      final kitab = (row['kitab']?.toString() ?? '').trim();
                      return _PenceramahRowTile(
                        row: row,
                        avatarUrl: _imageUrlForKod(kod),
                        namaPenuh: namaPenuh,
                        shortname: shortname,
                        kitab: kitab,
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }
}

class _PenceramahRowTile extends StatelessWidget {
  const _PenceramahRowTile({
    required this.row,
    required this.avatarUrl,
    required this.namaPenuh,
    required this.shortname,
    required this.kitab,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final String avatarUrl;
  final String namaPenuh;
  final String shortname;
  final String kitab;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      // leading: CircleAvatar(
      //   radius: 26,
      //   backgroundColor: const Color(0xFFE5E7EB),
      //   backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
      //   child: avatarUrl.isEmpty
      //       ? const Icon(Icons.person_outline, color: Color(0xFF6B7280))
      //       : null,
      // ),
      title: Text(
        namaPenuh.isEmpty ? '(Tiada nama)' : namaPenuh,
        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        _sub(kitab),
        style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
      ),
      trailing: Wrap(
        spacing: 15,
        children: [
          IconButton(
            tooltip: 'Edit',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
            style: IconButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          IconButton(
            tooltip: 'Padam',
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
            style: IconButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ],
      ),
    );
  }

  // String _sub(String shortname, String kitab) {
  //   final parts = <String>[];
  //   if (shortname.isNotEmpty) parts.add(shortname);
  //   if (kitab.isNotEmpty) parts.add(kitab);
  //   return parts.isEmpty ? '-' : parts.join(' · ');
  // }
  String _sub(String kitab) {
    final parts = <String>[];
    if (kitab.isNotEmpty) parts.add(kitab);
    return parts.isEmpty ? '-' : parts.join(' · ');
  }
}

class _PenceramahDraft {
  const _PenceramahDraft({
    required this.namaPenuh,
    required this.shortname,
    required this.kitab,
    required this.kod,
    required this.imageBytes,
    required this.imageOriginalName,
  });

  final String namaPenuh;
  final String shortname;
  final String kitab;
  final String kod;

  final Uint8List? imageBytes;
  final String? imageOriginalName;

  static String kodifyName(String name) {
    final t = name.trim().toLowerCase();
    var out = t.replaceAll(RegExp(r'\s+'), '-');
    out = out.replaceAll(RegExp(r'[^a-z0-9\-]'), '');
    out = out.replaceAll(RegExp(r'\-+'), '-');
    return out;
  }

  /// raw penceramah: `kod|namaPenuh|shortname|kitab`
  String? buildRaw() {
    final nama = namaPenuh.trim();
    if (nama.isEmpty) return null;
    final computedKod = kod.trim().isNotEmpty ? kod.trim() : kodifyName(nama);
    if (computedKod.isEmpty) return null;
    final short = shortname.trim();
    final k = kitab.trim();
    return '$computedKod|$nama|$short|$k';
  }
}

class _PenceramahDialog extends StatefulWidget {
  const _PenceramahDialog({
    required this.title,
    required this.initial,
    required this.existingImageUrl,
  });

  final String title;
  final _PenceramahDraft initial;
  final String? existingImageUrl;

  @override
  State<_PenceramahDialog> createState() => _PenceramahDialogState();
}

class _PenceramahDialogState extends State<_PenceramahDialog> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _namaPenuhCtrl;
  late final TextEditingController _shortnameCtrl;
  late final TextEditingController _kitabCtrl;
  late final TextEditingController _kodCtrl;
  String get _kodPreview => _kodCtrl.text.trim().isNotEmpty
      ? _kodCtrl.text.trim()
      : _PenceramahDraft.kodifyName(_namaPenuhCtrl.text.trim());

  Uint8List? _selectedBytes;
  String? _selectedOriginalName;

  @override
  void initState() {
    super.initState();
    _namaPenuhCtrl = TextEditingController(text: widget.initial.namaPenuh);
    _shortnameCtrl = TextEditingController(text: widget.initial.shortname);
    _kitabCtrl = TextEditingController(text: widget.initial.kitab);
    _kodCtrl = TextEditingController(text: widget.initial.kod);
    _selectedBytes = null;
    _selectedOriginalName = null;
  }

  @override
  void dispose() {
    _namaPenuhCtrl.dispose();
    _shortnameCtrl.dispose();
    _kitabCtrl.dispose();
    _kodCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final res = await FilePicker.platform.pickFiles(
      type: FileType.image,
      withData: true,
    );
    if (res == null || res.files.isEmpty) return;

    final file = res.files.single;
    if (file.bytes == null) return;

    setState(() {
      _selectedBytes = file.bytes;
      _selectedOriginalName = file.name;
    });
  }

  @override
  Widget build(BuildContext context) {
    final previewUrl = widget.existingImageUrl;
    final hasNew = _selectedBytes != null;

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 620,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _namaPenuhCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nama Penuh',
                    isDense: true,
                  ),
                  validator: (v) {
                    final s = (v ?? '').trim();
                    if (s.isEmpty) return 'Nama Penuh wajib diisi';
                    return null;
                  },
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _shortnameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Shortname',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _kitabCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Kitab',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _kodCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Kod (optional, jana automatik jika kosong)',
                    isDense: true,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Kod: ${_kodPreview.isEmpty ? '-' : _kodPreview}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Gambar (pilih fail imej untuk upload)',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 140,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade300),
                    color: const Color(0xFFF9FAFB),
                  ),
                  alignment: Alignment.center,
                  child: hasNew
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(
                            _selectedBytes!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                        )
                      : (previewUrl != null && previewUrl.isNotEmpty)
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                previewUrl,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                errorBuilder: (ctx, error, stackTrace) =>
                                    const Icon(
                                  Icons.person_outline,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            )
                          : const Icon(
                              Icons.person_outline,
                              color: Color(0xFF6B7280),
                            ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.upload_file_outlined),
                        label: const Text('Pilih Gambar'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (hasNew)
                      IconButton(
                        tooltip: 'Reset',
                        onPressed: () {
                          setState(() {
                            _selectedBytes = null;
                            _selectedOriginalName = null;
                          });
                        },
                        icon: const Icon(Icons.refresh),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: () {
            final ok = _formKey.currentState?.validate() ?? false;
            if (!ok) return;
            final nama = _namaPenuhCtrl.text.trim();
            final kod = _kodCtrl.text.trim().isNotEmpty
                ? _kodCtrl.text.trim()
                : _PenceramahDraft.kodifyName(nama);
            if (kod.isEmpty) return;
            Navigator.of(context).pop(
              _PenceramahDraft(
                namaPenuh: nama,
                shortname: _shortnameCtrl.text.trim(),
                kitab: _kitabCtrl.text.trim(),
                kod: kod,
                imageBytes: _selectedBytes,
                imageOriginalName: _selectedOriginalName,
              ),
            );
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}
