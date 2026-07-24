import 'dart:async';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Imam & Bilal: Petugas (ganti table → list).
class ImamBilalPetugasListSubScreen extends StatefulWidget {
  const ImamBilalPetugasListSubScreen({
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
        builder: (context) => ImamBilalPetugasListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<ImamBilalPetugasListSubScreen> createState() =>
      _ImamBilalPetugasListSubScreenState();
}

class _ImamBilalPetugasListSubScreenState
    extends State<ImamBilalPetugasListSubScreen> {
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
  void didUpdateWidget(covariant ImamBilalPetugasListSubScreen oldWidget) {
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

  String _imageUrlForPetugasSlug(String? slug) {
    final code = (slug ?? '').trim();
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
        svc.fetchData('petugas'),
        svc.fetchData('images'),
      ]);
      if (!mounted) return;
      final petugasRes = results[0] as CloudDataResult;
      final imagesRes = results[1] as CloudDataResult;
      setState(() {
        _rows = petugasRes.data;
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
    final draft = await showDialog<_PetugasDraft>(
      context: context,
      builder: (ctx) => _PetugasDialog(
        title: 'Tambah Petugas',
        initial: const _PetugasDraft(
          namaPenuh: '',
          shortname: '',
          role: 'BILAL',
          slug: '',
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
      // Upload images dahulu (untuk senarai imej), kemudian insert petugas.
      if (draft.imageBytes != null) {
        final uploadPath = await _socketService!.uploadImage(
          bytes: draft.imageBytes!,
          originalName: draft.imageOriginalName ?? 'petugas.png',
          category: 'imambilal',
        );
        if (uploadPath != null && uploadPath.trim().isNotEmpty) {
          await _upsertImageForCode(
            code: draft.slug,
            imagePath: uploadPath,
          );
        }
      }

      await _socketService!.insertRow(
        'petugas',
        {'raw': raw},
        position: 'end',
      );
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal tambah petugas.')),
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
    final role = (row['role']?.toString() ?? '').trim().toUpperCase();
    final slug = (row['slug']?.toString() ?? '').trim();
    final existingImageUrl = _imageUrlForPetugasSlug(slug);

    final draft = await showDialog<_PetugasDraft>(
      context: context,
      builder: (ctx) => _PetugasDialog(
        title: 'Edit Petugas #$id',
        initial: _PetugasDraft(
          namaPenuh: namaPenuh,
          shortname: shortname,
          role: role.isEmpty ? 'BILAL' : role,
          slug: slug,
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
      // Update petugas
      await svc.updateRow(
        'petugas',
        id,
        {'raw': raw},
      );

      // Jika user pilih gambar baharu, upsert image untuk slug terkini.
      if (draft.imageBytes != null) {
        final uploadPath = await svc.uploadImage(
          bytes: draft.imageBytes!,
          originalName: draft.imageOriginalName ?? 'petugas.png',
          category: 'imambilal',
        );
        if (uploadPath != null && uploadPath.trim().isNotEmpty) {
          await _upsertImageForCode(
            code: draft.slug,
            imagePath: uploadPath,
          );
        }
      }

      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal kemaskini petugas.')),
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
        title: const Text('Padam Petugas'),
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
      await svc.deleteRow('petugas', id);
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal padam petugas.')),
      );
    }
  }

  Future<void> _upsertImageForCode({
    required String code,
    required String imagePath,
  }) async {
    final svc = _socketService;
    if (svc == null) return;
    final slug = code.trim();
    if (slug.isEmpty) return;

    final raw = '$slug|$imagePath';
    final matches = _images.where((im) {
      final imageCode = (im['imageCode']?.toString() ?? '').trim();
      return imageCode == slug;
    }).toList();

    if (matches.isEmpty) {
      await svc.insertRow('images', {'raw': raw}, position: 'end');
      return;
    }

    // Upsert: kemaskini semua baris imageCode yang sama.
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
        title: const Text('Petugas Imam & Bilal'),
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
                      'Tiada data petugas.',
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
                      final slug = (row['slug']?.toString() ?? '').trim();
                      final namaPenuh = (row['namaPenuh']?.toString() ?? '').trim();
                      final shortname =
                          (row['shortname']?.toString() ?? '').trim();
                      final role = (row['role']?.toString() ?? '').trim();
                      return _PetugasRowTile(
                        row: row,
                        avatarUrl: _imageUrlForPetugasSlug(slug),
                        namaPenuh: namaPenuh,
                        shortname: shortname,
                        role: role,
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }
}

class _PetugasRowTile extends StatelessWidget {
  const _PetugasRowTile({
    required this.row,
    required this.avatarUrl,
    required this.namaPenuh,
    required this.shortname,
    required this.role,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final String avatarUrl;
  final String namaPenuh;
  final String shortname;
  final String role;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        radius: 26,
        backgroundColor: const Color(0xFFE5E7EB),
        backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
        child: avatarUrl.isEmpty
            ? const Icon(Icons.person_outline, color: Color(0xFF6B7280))
            : null,
      ),
      title: Text(
        namaPenuh.isEmpty ? '(Tiada nama)' : namaPenuh,
        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        _sub(role, shortname),
        style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
      ),
      trailing: Wrap(
        spacing: 6,
        children: [
          IconButton(
            tooltip: 'Edit',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
          ),
          IconButton(
            tooltip: 'Padam',
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
          ),
        ],
      ),
    );
  }

  String _sub(String role, String shortname) {
    final parts = <String>[];
    if (role.isNotEmpty) parts.add(role);
    if (shortname.isNotEmpty) parts.add(shortname);
    return parts.isEmpty ? '-' : parts.join(' · ');
  }
}

class _PetugasDraft {
  const _PetugasDraft({
    required this.namaPenuh,
    required this.shortname,
    required this.role,
    required this.slug,
    required this.imageBytes,
    required this.imageOriginalName,
  });

  final String namaPenuh;
  final String shortname;
  final String role;
  final String slug;

  final Uint8List? imageBytes;
  final String? imageOriginalName;

  static String slugifyName(String name) {
    final t = name.trim().toLowerCase();
    var out = t.replaceAll(RegExp(r'\s+'), '-');
    out = out.replaceAll(RegExp(r'[^a-z0-9\-]'), '');
    out = out.replaceAll(RegExp(r'\-+'), '-');
    return out;
  }

  /// raw petugas: `slug|namaPenuh|shortname|role|`
  String? buildRaw() {
    final nama = namaPenuh.trim();
    if (nama.isEmpty) return null;
    final computedSlug = slugifyName(nama);
    if (computedSlug.isEmpty) return null;
    if (role.trim().isEmpty) return null;
    final short = shortname.trim();
    final roleUp = role.trim().toUpperCase();
    return '${computedSlug}|$nama|$short|$roleUp|';
  }
}

class _PetugasDialog extends StatefulWidget {
  const _PetugasDialog({
    required this.title,
    required this.initial,
    required this.existingImageUrl,
  });

  final String title;
  final _PetugasDraft initial;
  final String? existingImageUrl;

  @override
  State<_PetugasDialog> createState() => _PetugasDialogState();
}

class _PetugasDialogState extends State<_PetugasDialog> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _namaPenuhCtrl;
  late final TextEditingController _shortnameCtrl;
  late String _role;
  String get _slugPreview =>
      _PetugasDraft.slugifyName(_namaPenuhCtrl.text.trim());

  Uint8List? _selectedBytes;
  String? _selectedOriginalName;

  @override
  void initState() {
    super.initState();
    _namaPenuhCtrl = TextEditingController(text: widget.initial.namaPenuh);
    _shortnameCtrl = TextEditingController(text: widget.initial.shortname);
    _role = widget.initial.role.trim().toUpperCase().isEmpty
        ? 'BILAL'
        : widget.initial.role.trim().toUpperCase();
    _selectedBytes = null;
    _selectedOriginalName = null;
  }

  @override
  void dispose() {
    _namaPenuhCtrl.dispose();
    _shortnameCtrl.dispose();
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
                  onChanged: (_) {
                    // Biar slug preview kemas kini (UI sahaja).
                    setState(() {});
                  },
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
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Peranan',
                    isDense: true,
                  ),
                  value: _role,
                  items: const [
                    DropdownMenuItem<String>(value: 'BILAL', child: Text('BILAL')),
                    DropdownMenuItem<String>(value: 'IMAM', child: Text('IMAM')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _role = v);
                  },
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Peranan wajib' : null,
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Slug (jana automatik): ${_slugPreview.isEmpty ? '-' : _slugPreview}',
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
                  ),
                ),
                const SizedBox(height: 12),

                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Gambar (pilih fail imej untuk upload)',
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
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
                                errorBuilder: (ctx, error, stackTrace) => const Icon(
                                  Icons.person_outline,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            )
                          : const Icon(Icons.person_outline,
                              color: Color(0xFF6B7280)),
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
            final slug = _PetugasDraft.slugifyName(nama);
            if (slug.isEmpty) return;
            Navigator.of(context).pop(
              _PetugasDraft(
                namaPenuh: nama,
                shortname: _shortnameCtrl.text.trim(),
                role: _role,
                slug: slug,
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

