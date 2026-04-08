import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

class AnnouncementListSubScreen extends StatefulWidget {
  const AnnouncementListSubScreen({
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
        builder: (context) => AnnouncementListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<AnnouncementListSubScreen> createState() => _AnnouncementListSubScreenState();
}

class _AnnouncementListSubScreenState extends State<AnnouncementListSubScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant AnnouncementListSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService || oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _rows = <Map<String, dynamic>>[];
      _initSocketAndLoad();
      return;
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _loadAnnouncements();
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
      _loadAnnouncements();
    } else {
      _readySub?.cancel();
      _readySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        _loadAnnouncements();
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
    await _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final result = await svc.fetchData('announcements');
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

  @override
  void dispose() {
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Senarai Pengumuman'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          ListSubScreenAppBarActions(
            onAdd: _showAddDialog,
            onRefresh: _loadAnnouncements,
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
            children: [
              _buildListCard(),
            ],
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
                      'Tiada data pengumuman.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_rows.length * 2 - 1, (i) {
                      if (i.isOdd) return Divider(height: 1, thickness: 1, color: Colors.grey.shade200);
                      final row = _rows[i ~/ 2];
                      return _AnnouncementRowTile(
                        row: row,
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }

  Future<void> _showAddDialog() async {
    final svc = _socketService;
    if (svc == null) return;
    final result = await showDialog<_AnnouncementDraft>(
      context: context,
      builder: (ctx) => _AnnouncementDialog(
        title: 'Tambah Pengumuman',
        initial: const _AnnouncementDraft(type: 'PENGUMUMAN'),
      ),
    );
    if (result == null) return;
    final raw = _AnnouncementDraft.buildRaw(result);
    if (raw == null) return;
    await svc.insertRow('announcements', {'raw': raw}, position: 'end');
    await _loadAnnouncements();
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final initial = _AnnouncementDraft.fromRow(row);
    final result = await showDialog<_AnnouncementDraft>(
      context: context,
      builder: (ctx) => _AnnouncementDialog(
        title: 'Edit Pengumuman',
        initial: initial,
      ),
    );
    if (result == null) return;
    final raw = _AnnouncementDraft.buildRaw(result);
    if (raw == null) return;
    await svc.updateRow('announcements', id, {'raw': raw});
    await _loadAnnouncements();
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;
    final title = (row['title']?.toString() ?? '').trim();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Pengumuman'),
        content: Text(title.isEmpty ? 'Padam pengumuman ID $id?' : 'Padam \"$title\" (ID $id)?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Padam')),
        ],
      ),
    );
    if (ok != true) return;
    await svc.deleteRow('announcements', id);
    await _loadAnnouncements();
  }
}

class _AnnouncementRowTile extends StatelessWidget {
  const _AnnouncementRowTile({
    required this.row,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final type = (row['type']?.toString() ?? '').trim();
    final title = (row['title']?.toString() ?? '').trim();
    final speaker = (row['speaker']?.toString() ?? '').trim();
    final category = (row['category']?.toString() ?? '').trim();
    final datetime = (row['datetime']?.toString() ?? '').trim();
    final location = (row['location']?.toString() ?? '').trim();
    final audience = (row['audience']?.toString() ?? '').trim();

    String metaLine1() {
      final parts = <String>[];
      if (speaker.isNotEmpty) parts.add(speaker);
      if (category.isNotEmpty) parts.add(category);
      return parts.isEmpty ? '-' : parts.join(' · ');
    }

    String metaLine2() {
      final parts = <String>[];
      if (datetime.isNotEmpty) parts.add(datetime);
      if (location.isNotEmpty) parts.add(location);
      if (audience.isNotEmpty) parts.add(audience);
      return parts.isEmpty ? '-' : parts.join(' · ');
    }

    return ListTile(
      title: Text(
        title.isEmpty ? '(Tiada tajuk)' : title,
        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(type.isEmpty ? '—' : type, style: const TextStyle(fontSize: 12.5, color: Color(0xFF4B5563))),
            const SizedBox(height: 2),
            Text(metaLine1(), style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280))),
            const SizedBox(height: 2),
            Text(metaLine2(), style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B7280))),
          ],
        ),
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
}

class _AnnouncementDraft {
  const _AnnouncementDraft({
    this.type = '',
    this.title = '',
    this.speaker = '',
    this.category = '',
    this.datetime = '',
    this.location = '',
    this.audience = '',
  });

  final String type;
  final String title;
  final String speaker;
  final String category;
  final String datetime;
  final String location;
  final String audience;

  static _AnnouncementDraft fromRow(Map<String, dynamic> row) {
    return _AnnouncementDraft(
      type: (row['type']?.toString() ?? '').trim(),
      title: (row['title']?.toString() ?? '').trim(),
      speaker: (row['speaker']?.toString() ?? '').trim(),
      category: (row['category']?.toString() ?? '').trim(),
      datetime: (row['datetime']?.toString() ?? '').trim(),
      location: (row['location']?.toString() ?? '').trim(),
      audience: (row['audience']?.toString() ?? '').trim(),
    );
  }

  static String? buildRaw(_AnnouncementDraft d) {
    final type = d.type.trim();
    final title = d.title.trim();
    final datetime = d.datetime.trim();
    if (type.isEmpty || title.isEmpty || datetime.isEmpty) return null;

    final speaker = d.speaker.trim();
    final category = d.category.trim();
    final location = d.location.trim();
    final audience = d.audience.trim();
    return [
      type,
      title,
      speaker,
      category,
      datetime,
      location,
      audience,
    ].join('|');
  }
}

class _AnnouncementDialog extends StatefulWidget {
  const _AnnouncementDialog({
    required this.title,
    required this.initial,
  });

  final String title;
  final _AnnouncementDraft initial;

  @override
  State<_AnnouncementDialog> createState() => _AnnouncementDialogState();
}

class _AnnouncementDialogState extends State<_AnnouncementDialog> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _typeCtrl;
  late final TextEditingController _titleCtrl;
  late final TextEditingController _speakerCtrl;
  late final TextEditingController _categoryCtrl;
  late final TextEditingController _datetimeCtrl;
  late final TextEditingController _locationCtrl;
  late final TextEditingController _audienceCtrl;

  @override
  void initState() {
    super.initState();
    _typeCtrl = TextEditingController(text: widget.initial.type);
    _titleCtrl = TextEditingController(text: widget.initial.title);
    _speakerCtrl = TextEditingController(text: widget.initial.speaker);
    _categoryCtrl = TextEditingController(text: widget.initial.category);
    _datetimeCtrl = TextEditingController(text: widget.initial.datetime);
    _locationCtrl = TextEditingController(text: widget.initial.location);
    _audienceCtrl = TextEditingController(text: widget.initial.audience);
  }

  @override
  void dispose() {
    _typeCtrl.dispose();
    _titleCtrl.dispose();
    _speakerCtrl.dispose();
    _categoryCtrl.dispose();
    _datetimeCtrl.dispose();
    _locationCtrl.dispose();
    _audienceCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final draft = _AnnouncementDraft(
      type: _typeCtrl.text.trim(),
      title: _titleCtrl.text.trim(),
      speaker: _speakerCtrl.text.trim(),
      category: _categoryCtrl.text.trim(),
      datetime: _datetimeCtrl.text.trim(),
      location: _locationCtrl.text.trim(),
      audience: _audienceCtrl.text.trim(),
    );
    if (_AnnouncementDraft.buildRaw(draft) == null) return;
    Navigator.of(context).pop(draft);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 520,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _typeCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Jenis',
                    hintText: 'PENGUMUMAN',
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Jenis wajib' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(labelText: 'Tajuk'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Tajuk wajib' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _speakerCtrl,
                  decoration: const InputDecoration(labelText: 'Penceramah'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _categoryCtrl,
                  decoration: const InputDecoration(labelText: 'Kategori'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _datetimeCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tarikh/Masa',
                    hintText: 'YYYY-MM-DD HH:MM',
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Tarikh/Masa wajib' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _locationCtrl,
                  decoration: const InputDecoration(labelText: 'Lokasi'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _audienceCtrl,
                  decoration: const InputDecoration(labelText: 'Jemputan'),
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

