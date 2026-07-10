import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Slideshow: senarai (bukan table) + dialog tambah/edit.
class SlideshowListSubScreen extends StatefulWidget {
  const SlideshowListSubScreen({
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
        builder: (context) => SlideshowListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<SlideshowListSubScreen> createState() => _SlideshowListSubScreenState();
}

class _SlideshowListSubScreenState extends State<SlideshowListSubScreen> {
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
  void didUpdateWidget(covariant SlideshowListSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService || oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _rows = <Map<String, dynamic>>[];
      _images = <Map<String, dynamic>>[];
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

  Future<void> _refreshNow() async {
    await _loadAll();
  }

  Future<void> _loadAll() async {
    await Future.wait([
      _loadSlideshow(),
      _loadImages(),
    ]);
  }

  Future<void> _loadSlideshow() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final result = await svc.fetchData('slideshow');
      if (!mounted) return;
      setState(() {
        _rows = result.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _loadImages() async {
    final svc = _socketService;
    if (svc == null) return;
    try {
      final result = await svc.fetchData('images');
      if (!mounted) return;
      setState(() {
        _images = result.data;
      });
    } catch (_) {
      if (!mounted) return;
    }
  }

  @override
  void dispose() {
    _disposeSocketBindings();
    super.dispose();
  }

  String _baseUrl() {
    var base = widget.config.baseUrl.trim();
    if (base.endsWith('/')) base = base.substring(0, base.length - 1);
    return base;
  }

  /// Resolve URL imej untuk slideshow:
  /// - jika `image` sudah dalam `/images/...`, guna terus
  /// - jika `image` ialah imageCode, cari `images` fail untuk imagePath
  String _imageUrlForField(String? imageField) {
    final base = _baseUrl();
    final fallback = '$base/images/noimage.png';

    final v = (imageField ?? '').trim();
    if (v.isEmpty) return fallback;
    if (v.startsWith('http')) return v;

    if (v.startsWith('/images/')) {
      return '$base$v';
    }
    if (v.startsWith('images/')) {
      return '$base/$v';
    }

    // Treat as imageCode
    for (final im in _images) {
      final code = (im['imageCode']?.toString() ?? '').trim();
      if (code.isEmpty || code != v) continue;
      final path = (im['imagePath']?.toString() ?? '').trim();
      if (path.isEmpty) continue;
      if (path.startsWith('/images/')) return '$base$path';
      if (path.startsWith('images/')) return '$base/$path';
      if (path.startsWith('http')) return path;
    }

    return fallback;
  }

  Future<void> _applyReorder(List<int> orderedIds) async {
    final svc = _socketService;
    if (svc == null) return;
    try {
      await svc.reorderSlideshow(orderedIds);
    } catch (_) {
      // Abaikan: UI sudah bergerak. User boleh refresh untuk selari.
    }
  }

  void _onReorder(int oldIndex, int newIndex) {
    if (oldIndex < 0 || oldIndex >= _rows.length) return;
    // ReorderableListView kadang beri `newIndex == length` bila drop di hujung.
    if (newIndex < 0 || newIndex > _rows.length) return;

    setState(() {
      final item = _rows.removeAt(oldIndex);
      var insertAt = newIndex;
      if (newIndex > oldIndex) insertAt = newIndex - 1;
      if (insertAt < 0) insertAt = 0;
      if (insertAt > _rows.length) insertAt = _rows.length;
      _rows.insert(insertAt, item);
    });

    final orderedIds = _rows
        .map((r) => r['id'])
        .map((e) => e is int ? e : int.tryParse(e?.toString() ?? ''))
        .whereType<int>()
        .toList();
    if (orderedIds.length == _rows.length) {
      _applyReorder(orderedIds);
    }
  }

  Future<void> _showAddDialog() async {
    final svc = _socketService;
    if (svc == null) return;
    final result = await showDialog<_SlideshowDialogResult>(
      context: context,
      builder: (ctx) => _SlideshowDialog(
        title: 'Tambah Slideshow',
        mode: _SlideshowDialogMode.add,
        initialCaption: '',
        initialImageField: '',
        initialValidFrom: '',
        initialValidTo: '',
        imageUrlForPreview: (img) => _imageUrlForField(img),
      ),
    );
    if (result == null) return;

    String finalImageField;
    try {
      finalImageField = await _uploadAndResolveImage(
        svc,
        imageFieldFromRow: '',
        selectedBytes: result.imageBytes,
        selectedOriginalName: result.imageOriginalName,
        clearRequested: result.clearImage,
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal upload imej slideshow.')),
      );
      return;
    }
    if (finalImageField.isEmpty) return; // validate dalaman

    final caption = result.caption.trim();
    final validFrom = result.validFrom.trim();
    final validTo = result.validTo.trim();
    final raw = '$caption|$finalImageField|$validFrom|$validTo';
    await svc.insertRow('slideshow', {'raw': raw}, position: 'end');
    await _loadSlideshow();
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final result = await showDialog<_SlideshowDialogResult>(
      context: context,
      builder: (ctx) => _SlideshowDialog(
        title: 'Edit Baris #$id',
        mode: _SlideshowDialogMode.edit,
        initialCaption: (row['caption']?.toString() ?? '').trim(),
        initialImageField: (row['image']?.toString() ?? '').trim(),
        initialValidFrom: (row['validFrom']?.toString() ?? '').trim(),
        initialValidTo: (row['validTo']?.toString() ?? '').trim(),
        imageUrlForPreview: (img) => _imageUrlForField(img),
      ),
    );
    if (result == null) return;

    final imageFieldFromRow = (row['image']?.toString() ?? '').trim();
    String finalImageField;
    try {
      finalImageField = await _uploadAndResolveImage(
        svc,
        imageFieldFromRow: imageFieldFromRow,
        selectedBytes: result.imageBytes,
        selectedOriginalName: result.imageOriginalName,
        clearRequested: result.clearImage,
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal upload imej slideshow.')),
      );
      return;
    }
    if (finalImageField.isEmpty) return;

    final caption = result.caption.trim();
    final validFrom = result.validFrom.trim();
    final validTo = result.validTo.trim();
    final raw = '$caption|$finalImageField|$validFrom|$validTo';
    await svc.updateRow('slideshow', id, {'raw': raw});
    await _loadSlideshow();
  }

  Future<String> _uploadAndResolveImage(
    CloudSocketService svc, {
    required String imageFieldFromRow,
    required Uint8List? selectedBytes,
    required String? selectedOriginalName,
    required bool clearRequested,
  }) async {
    // Jika user "clear", imej final jadi kosong (dialog sepatutnya blok jika imej wajib).
    if (clearRequested) return '';

    if (selectedBytes != null) {
      final name = selectedOriginalName?.trim();
      if (name == null || name.isEmpty) return '';
      final path = await svc.uploadImage(
        bytes: selectedBytes,
        originalName: name,
        category: 'slideshow',
      );
      return path ?? '';
    }

    // Tiada upload baru → kekalkan imej sedia ada.
    return imageFieldFromRow.trim();
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final caption = (row['caption']?.toString() ?? '').trim();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Slideshow'),
        content: Text(caption.isEmpty ? 'Padam slideshow ID $id?' : 'Padam "$caption" (ID $id)?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Padam'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    await svc.deleteRow('slideshow', id);
    await _loadSlideshow();
  }

  String _formatDdMmmYyyy(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return '';
    final datePart = s.length >= 10 ? s.substring(0, 10) : s;
    final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(datePart);
    if (m == null) return s;
    final y = int.tryParse(m.group(1) ?? '');
    final mo = int.tryParse(m.group(2) ?? '');
    final d = int.tryParse(m.group(3) ?? '');
    if (y == null || mo == null || d == null) return s;
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (mo < 1 || mo > 12) return s;
    final dd = d.toString().padLeft(2, '0');
    return '$dd ${months[mo - 1]} $y';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Slideshow'),
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
      body: RefreshIndicator(
        onRefresh: _refreshNow,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildListCard(),
          ],
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
                      'Tiada data slideshow.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
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
                      final idRaw = row['id'];
                      final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
                      if (id == null) return const SizedBox.shrink();

                      final caption = (row['caption']?.toString() ?? '').trim();
                      final validFromRaw = (row['validFrom']?.toString() ?? '').trim();
                      final validToRaw = (row['validTo']?.toString() ?? '').trim();
                      final validFrom = _formatDdMmmYyyy(validFromRaw);
                      final validTo = _formatDdMmmYyyy(validToRaw);
                      final imageField = (row['image']?.toString() ?? '').trim();
                      final thumbUrl = _imageUrlForField(imageField);

                      final leading = Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF0F0F0),
                          shape: BoxShape.circle,
                        ),
                        child: ClipOval(
                          child: Image.network(
                            thumbUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, error, stackTrace) => const Center(
                              child: Icon(Icons.image_not_supported, color: Color(0xFF6B7280)),
                            ),
                          ),
                        ),
                      );

                      return Padding(
                        key: ValueKey(id),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            leading,
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (caption.isEmpty ? '(Tiada kapsyen)' : caption).toUpperCase(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF111827),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Mula: ${validFrom.isEmpty ? '-' : validFrom}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF6B7280),
                                                height: 1.2,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Tamat: ${validTo.isEmpty ? '-' : validTo}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF6B7280),
                                                height: 1.2,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            visualDensity: VisualDensity.compact,
                                            padding: EdgeInsets.zero,
                                            icon: const Icon(Icons.edit, color: Color(0xFF2563EB), size: 20),
                                            onPressed: () => _showEditDialog(row),
                                          ),
                                          IconButton(
                                            visualDensity: VisualDensity.compact,
                                            padding: EdgeInsets.zero,
                                            icon: const Icon(Icons.delete, color: Color(0xFFDC2626), size: 20),
                                            onPressed: () => _confirmDelete(row),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  )),
      ),
    );
  }
}

enum _SlideshowDialogMode { add, edit }

class _SlideshowDialogResult {
  const _SlideshowDialogResult({
    required this.caption,
    required this.imageBytes,
    required this.imageOriginalName,
    required this.clearImage,
    required this.validFrom,
    required this.validTo,
  });

  final String caption;
  final Uint8List? imageBytes;
  final String? imageOriginalName;
  final bool clearImage;
  final String validFrom;
  final String validTo;
}

class _SlideshowDialog extends StatefulWidget {
  const _SlideshowDialog({
    required this.title,
    required this.mode,
    required this.initialCaption,
    required this.initialImageField,
    required this.initialValidFrom,
    required this.initialValidTo,
    required this.imageUrlForPreview,
  });

  final String title;
  final _SlideshowDialogMode mode;
  final String initialCaption;
  final String initialImageField;
  final String initialValidFrom;
  final String initialValidTo;
  final String Function(String? imageField) imageUrlForPreview;

  @override
  State<_SlideshowDialog> createState() => _SlideshowDialogState();
}

class _SlideshowDialogState extends State<_SlideshowDialog> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _captionCtrl;
  late final TextEditingController _fromCtrl;
  late final TextEditingController _toCtrl;

  Uint8List? _selectedBytes;
  String? _selectedOriginalName;
  bool _clearImageRequested = false;
  String? _localSelectedName;

  String get _existingImageField => widget.initialImageField.trim();

  String _errorText = '';

  @override
  void initState() {
    super.initState();
    _captionCtrl = TextEditingController(text: widget.initialCaption);
    _fromCtrl = TextEditingController(text: widget.initialValidFrom);
    _toCtrl = TextEditingController(text: widget.initialValidTo);
  }

  @override
  void dispose() {
    _captionCtrl.dispose();
    _fromCtrl.dispose();
    _toCtrl.dispose();
    super.dispose();
  }

  String _formatDate(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> _pickDate(TextEditingController ctrl) async {
    final raw = ctrl.text.trim();

    // Jika tiada nilai / format tak sepadan, guna tarikh hari ini.
    DateTime initial = DateTime.now();
    if (raw.isNotEmpty) {
      final parts = raw.split('-');
      if (parts.length == 3) {
        final y = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final d = int.tryParse(parts[2]);
        if (y != null && m != null && d != null) {
          initial = DateTime(y, m, d);
        }
      }
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );

    if (!mounted) return;
    if (picked == null) return;

    setState(() => ctrl.text = _formatDate(picked));
  }

  String? _previewImageUrl() {
    if (_selectedBytes != null) return null;
    if (_clearImageRequested) return null;
    final existing = _existingImageField;
    if (existing.isEmpty) return null;
    return widget.imageUrlForPreview(existing);
  }

  Future<void> _pickImage() async {
    final res = await FilePicker.platform.pickFiles(
      type: FileType.image,
      withData: true,
    );
    if (res == null || res.files.isEmpty) return;
    final file = res.files.single;
    setState(() {
      _selectedBytes = file.bytes;
      _selectedOriginalName = file.name;
      _localSelectedName = file.name;
      _clearImageRequested = false;
      _errorText = '';
    });
    if (_selectedBytes == null && file.path != null) {
      final p = file.path!;
      final bytes = await File(p).readAsBytes();
      if (!mounted) return;
      setState(() {
        _selectedBytes = bytes;
      });
    }
  }

  void _clearImage() {
    setState(() {
      _selectedBytes = null;
      _selectedOriginalName = null;
      _localSelectedName = null;
      _clearImageRequested = true;
      _errorText = '';
    });
  }

  Future<void> _submit() async {
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    final finalImageNeeded =
        (_selectedBytes != null) || (!_clearImageRequested && _existingImageField.isNotEmpty);
    if (!finalImageNeeded) {
      setState(() => _errorText = 'Imej wajib diisi.');
      return;
    }

    final caption = _captionCtrl.text.trim();
    final validFrom = _fromCtrl.text.trim();
    final validTo = _toCtrl.text.trim();

    Navigator.of(context).pop(
      _SlideshowDialogResult(
        caption: caption,
        imageBytes: _selectedBytes,
        imageOriginalName: _selectedOriginalName,
        clearImage: _clearImageRequested,
        validFrom: validFrom,
        validTo: validTo,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final previewUrl = _previewImageUrl();

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
                  controller: _captionCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Caption',
                    hintText: 'Contoh: Nuzul Quran',
                    isDense: true,
                    labelStyle: TextStyle(fontSize: 12.5),
                    floatingLabelStyle: TextStyle(fontSize: 12.5),
                  ),
                  validator: (v) {
                    final s = (v ?? '').trim();
                    if (s.isEmpty) return 'Caption wajib diisi';
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Imej (pilih fail, kemudian klik Simpan)',
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280)),
                  ),
                ),
                const SizedBox(height: 8),

                Container(
                  height: 140,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade300),
                    color: const Color(0xFFF9FAFB),
                  ),
                  alignment: Alignment.center,
                  child: _selectedBytes != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(
                            _selectedBytes!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                          ),
                        )
                      : (previewUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                previewUrl,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                errorBuilder: (ctx, error, stackTrace) => const Icon(Icons.broken_image),
                              ),
                            )
                          : const Icon(Icons.image_outlined, size: 44, color: Colors.grey)),
                ),

                const SizedBox(height: 10),
                Row(
                  children: [
                    FilledButton.tonal(
                      onPressed: _pickImage,
                      child: const Text('Choose File'),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _localSelectedName != null && _selectedBytes != null
                            ? _localSelectedName!
                            : (_existingImageField.isNotEmpty && !_clearImageRequested)
                                ? 'Imej sedia ada'
                                : 'No file chosen',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 12.5),
                      ),
                    ),
                    const SizedBox(width: 10),
                    if (_selectedBytes != null || (!_clearImageRequested && _existingImageField.isNotEmpty))
                      IconButton(
                        tooltip: 'Clear',
                        onPressed: _clearImage,
                        icon: const Icon(
                          Icons.close_rounded,
                          color: Color(0xFFDC2626),
                          size: 20,
                        ),
                      ),
                  ],
                ),

                if (_errorText.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _errorText,
                      style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12.5),
                    ),
                  ),
                ],

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _fromCtrl,
                        readOnly: true,
                        onTap: () => _pickDate(_fromCtrl),
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Valid From (pilihan, YYYY-MM-DD)',
                          isDense: true,
                          labelStyle: const TextStyle(fontSize: 12.5),
                          floatingLabelStyle: const TextStyle(fontSize: 12.5),
                          suffixIcon: _fromCtrl.text.trim().isNotEmpty
                              ? IconButton(
                                  tooltip: 'Clear',
                                  onPressed: () => setState(() => _fromCtrl.text = ''),
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    color: Color(0xFFDC2626),
                                    size: 18,
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _toCtrl,
                        readOnly: true,
                        onTap: () => _pickDate(_toCtrl),
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Valid To (pilihan, YYYY-MM-DD)',
                          isDense: true,
                          labelStyle: const TextStyle(fontSize: 12.5),
                          floatingLabelStyle: const TextStyle(fontSize: 12.5),
                          suffixIcon: _toCtrl.text.trim().isNotEmpty
                              ? IconButton(
                                  tooltip: 'Clear',
                                  onPressed: () => setState(() => _toCtrl.text = ''),
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    color: Color(0xFFDC2626),
                                    size: 18,
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
        FilledButton(onPressed: _submit, child: const Text('Simpan')),
      ],
    );
  }
}

