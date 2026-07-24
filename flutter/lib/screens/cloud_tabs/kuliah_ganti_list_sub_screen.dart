import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Kuliah: Ganti Kuliah (table kuliah-override).
class KuliahGantiListSubScreen extends StatefulWidget {
  const KuliahGantiListSubScreen({
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
        builder: (context) => KuliahGantiListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<KuliahGantiListSubScreen> createState() =>
      _KuliahGantiListSubScreenState();
}

class _KuliahGantiListSubScreenState extends State<KuliahGantiListSubScreen> {
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
  void didUpdateWidget(covariant KuliahGantiListSubScreen oldWidget) {
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

  Future<void> _loadAll() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final result = await svc.fetchData('kuliah-override');
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

  Future<void> _refreshNow() async {
    await _loadAll();
  }

  Future<void> _showAddDialog() async {
    final svc = _socketService;
    if (svc == null) return;
    final result = await showDialog<_GantiDraft>(
      context: context,
      builder: (ctx) => _GantiDialog(
        title: 'Tambah Gantian Kuliah',
        initial: const _GantiDraft(format: 'single'),
      ),
    );
    if (result == null) return;
    final raw = _GantiDraft.buildRaw(result);
    if (raw == null) return;
    try {
      await svc.insertRow('kuliah-override', {'raw': raw}, position: 'end');
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal tambah gantian kuliah.')),
      );
    }
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final initial = _GantiDraft.fromRow(row);
    final result = await showDialog<_GantiDraft>(
      context: context,
      builder: (ctx) => _GantiDialog(
        // title: 'Edit Gantian Kuliah #$id',
        title: 'Edit Gantian Kuliah',
        initial: initial,
      ),
    );
    if (result == null) return;
    final raw = _GantiDraft.buildRaw(result);
    if (raw == null) return;
    try {
      await svc.updateRow('kuliah-override', id, {'raw': raw});
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal kemaskini gantian kuliah.')),
      );
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Gantian Kuliah'),
        content: Text('Padam rekod ID #$id?'),
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
      await svc.deleteRow('kuliah-override', id);
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal padam gantian kuliah.')),
      );
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
        title: const Text('Ganti Kuliah'),
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
                      'Tiada gantian kuliah.',
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
                      return _GantiRowTile(
                        row: row,
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }
}

class _GantiRowTile extends StatelessWidget {
  const _GantiRowTile({
    required this.row,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  String _formatLabel(String f) {
    switch (f.toLowerCase()) {
      case 'single':
        return 'Tarikh tunggal';
      case 'weekly':
        return 'Mingguan';
      case 'hijri':
        return 'Hijri';
      case 'range':
        return 'Range';
      default:
        return f;
    }
  }

  static String _bulanHijriMmm(String bulanRaw) {
    final m = int.tryParse(bulanRaw.trim());
    const map = <int, String>{
      1: 'Muh',
      2: 'Saf',
      3: 'Raw',
      4: 'Rth',
      5: 'Jaw',
      6: 'Jth',
      7: 'Raj',
      8: 'Sha',
      9: 'Ram',
      10: 'Shw',
      11: 'Dhq',
      12: 'Dhh',
    };
    return map[m]?.toUpperCase() ?? bulanRaw.trim().toUpperCase();
  }

  static String _bulanMasihiMmm(String bulanRaw) {
    final m = int.tryParse(bulanRaw.trim());
    const map = <int, String>{
      1: 'Jan',
      2: 'Feb',
      3: 'Mar',
      4: 'Apr',
      5: 'Mei',
      6: 'Jun',
      7: 'Jul',
      8: 'Ogo',
      9: 'Sep',
      10: 'Okt',
      11: 'Nov',
      12: 'Dis',
    };
    return map[m]?.toUpperCase() ?? bulanRaw.trim().toUpperCase();
  }

  String _summary() {
    final format = (row['format']?.toString() ?? 'single').toLowerCase();
    if (format == 'single') {
      final date = (row['date']?.toString() ?? '').trim();
      if (date.isNotEmpty && date.contains('-')) {
        final parts = date.split('-');
        if (parts.length >= 3) {
          final d = parts[0];
          final m = int.tryParse(parts[1]);
          final y = parts[2];
          final mmm = m != null ? _bulanMasihiMmm(parts[1]) : parts[1];
          return '$d $mmm $y';
        }
      }
      return date.isEmpty ? '-' : date;
    }
    if (format == 'weekly') {
      final hari = (row['hari']?.toString() ?? '').trim();
      return 'Hari $hari';
    }
    if (format == 'hijri') {
      final tahun = (row['tahun']?.toString() ?? '').trim();
      final bulan = (row['bulan']?.toString() ?? '').trim();
      final hari = (row['hari']?.toString() ?? '').trim();
      final mmm = _bulanHijriMmm(bulan);
      return '$hari $mmm${tahun.isNotEmpty ? " $tahun H" : ""}';
    }
    final tahun = (row['tahun']?.toString() ?? '').trim();
    final bulan = (row['bulan']?.toString() ?? '').trim();
    final hari = (row['hari']?.toString() ?? '').trim();
    final mmm = _bulanMasihiMmm(bulan);
    return '${tahun.isNotEmpty ? "$tahun " : ""}$mmm · $hari';
  }

  @override
  Widget build(BuildContext context) {
    final format = (row['format']?.toString() ?? 'single').toLowerCase();
    final notes = (row['notes']?.toString() ?? '').trim();
    final type = (row['type']?.toString() ?? '').trim();
    const subStyle = TextStyle(fontSize: 12.5, color: Color(0xFF6B7280));
    return ListTile(
      title: Text(
        notes.isEmpty ? '(Tiada catatan)' : notes,
        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${_formatLabel(format)} · ${_summary()}',
            style: subStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              type.isEmpty ? '(Tiada)' : type.toUpperCase().replaceAll(',', ' · '),
              style: subStyle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.end,
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

class _GantiDraft {
  const _GantiDraft({
    this.format = 'single',
    this.date = '',
    this.tahun = '',
    this.bulan = '',
    this.hari = '',
    this.type = '',
    this.replace = '',
    this.notes = '',
    this.showAnnounce = '',
    this.title = '',
    this.tempat = '',
    this.jemputan = '',
  });

  final String format;
  final String date;
  final String tahun;
  final String bulan;
  final String hari;
  final String type;
  final String replace;
  final String notes;
  final String showAnnounce;
  final String title;
  final String tempat;
  final String jemputan;

  static _GantiDraft fromRow(Map<String, dynamic> row) {
    return _GantiDraft(
      format: (row['format']?.toString() ?? 'single').toLowerCase(),
      date: row['date']?.toString() ?? '',
      tahun: row['tahun']?.toString() ?? '',
      bulan: row['bulan']?.toString() ?? '',
      hari: row['hari']?.toString() ?? '',
      type: row['type']?.toString() ?? '',
      replace: row['replace']?.toString() ?? '',
      notes: row['notes']?.toString() ?? '',
      showAnnounce: row['showAnnounce']?.toString() ?? '',
      title: row['title']?.toString() ?? '',
      tempat: row['tempat']?.toString() ?? '',
      jemputan: row['jemputan']?.toString() ?? '',
    );
  }

  static String? buildRaw(_GantiDraft d) {
    final fmt = d.format.toLowerCase();
    if (fmt == 'single') {
      final date = d.date.trim();
      final type = d.type.trim();
      if (type.isEmpty) return null;
      return '${date.isEmpty ? "" : date}|$type|${d.notes.trim()}';
    }
    if (fmt == 'weekly') {
      final hari = d.hari.trim();
      final type = d.type.trim();
      if (type.isEmpty) return null;
      final replace = d.replace.trim();
      final notes = d.notes.trim();
      return 'weekly|$hari|$type|${replace.isEmpty ? "0" : replace}|$notes';
    }
    if (fmt == 'hijri') {
      final tahun = d.tahun.trim();
      final bulan = d.bulan.trim();
      final hari = d.hari.trim();
      final type = d.type.trim();
      if (type.isEmpty || bulan.isEmpty || hari.isEmpty) return null;
      final replace = d.replace.trim().isEmpty ? '0' : d.replace.trim();
      final notes = d.notes.trim();
      final showAnnounce =
          (d.showAnnounce.trim() == '1' || d.showAnnounce.trim() == 'true')
              ? '1'
              : '0';
      final title = d.title.trim();
      final tempat = d.tempat.trim();
      final jemputan = d.jemputan.trim();
      if (showAnnounce == '1' || title.isNotEmpty || tempat.isNotEmpty || jemputan.isNotEmpty) {
        return 'hijri|$tahun|$bulan|$hari|$type|$replace|$notes|$showAnnounce|$title|$tempat|$jemputan';
      }
      return 'hijri|$tahun|$bulan|$hari|$type|$replace|$notes';
    }
    final tahun = d.tahun.trim();
    final bulan = d.bulan.trim();
    final type = d.type.trim();
    final hari = d.hari.trim();
    final replace = d.replace.trim();
    final notes = d.notes.trim();
    if (type.isEmpty || bulan.isEmpty || hari.isEmpty) return null;
    if (tahun.isNotEmpty) {
      return '$tahun|$bulan|$type|$hari|${replace.isEmpty ? "0" : replace}|$notes';
    }
    if (replace.isNotEmpty) {
      return '$bulan|$type|$hari|$replace|$notes';
    }
    return '$bulan|$type|$hari|$notes';
  }
}

class _GantiDialog extends StatefulWidget {
  const _GantiDialog({
    required this.title,
    required this.initial,
  });

  final String title;
  final _GantiDraft initial;

  @override
  State<_GantiDialog> createState() => _GantiDialogState();
}

class _GantiDialogState extends State<_GantiDialog> {
  late String _format;
  late final TextEditingController _dateCtrl;
  late final TextEditingController _tahunCtrl;
  late final TextEditingController _bulanCtrl;
  late final TextEditingController _hariCtrl;
  late final TextEditingController _typeCtrl;
  late final TextEditingController _replaceCtrl;
  late final TextEditingController _notesCtrl;
  late final TextEditingController _showAnnounceCtrl;
  late final TextEditingController _titleCtrl;
  late final TextEditingController _tempatCtrl;
  late final TextEditingController _jemputanCtrl;

  static const List<Map<String, String>> _formatOptions = [
    {'v': 'single', 'l': 'Tarikh tunggal (Masihi)'},
    {'v': 'weekly', 'l': 'Mingguan'},
    {'v': 'hijri', 'l': 'Hijri'},
    {'v': 'range', 'l': 'Range (tahun/bulan)'},
  ];

  static const List<Map<String, String>> _typeOptions = [
    {'v': 'ks', 'l': 'KS - Kuliah Subuh'},
    {'v': 'km', 'l': 'KM - Kuliah Maghrib'},
    {'v': 'kd', 'l': 'KD - Kuliah Dhuha'},
    {'v': 'kk', 'l': 'KK - Kuliah Khas'},
  ];

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    final dd = picked.day.toString().padLeft(2, '0');
    final mm = picked.month.toString().padLeft(2, '0');
    final yyyy = picked.year.toString();
    _dateCtrl.text = '$dd-$mm-$yyyy';
  }

  @override
  void initState() {
    super.initState();
    _format = widget.initial.format;
    _dateCtrl = TextEditingController(text: widget.initial.date);
    _tahunCtrl = TextEditingController(text: widget.initial.tahun);
    _bulanCtrl = TextEditingController(text: widget.initial.bulan);
    _hariCtrl = TextEditingController(text: widget.initial.hari);
    _typeCtrl = TextEditingController(text: widget.initial.type);
    _replaceCtrl = TextEditingController(text: widget.initial.replace);
    _notesCtrl = TextEditingController(text: widget.initial.notes);
    _showAnnounceCtrl = TextEditingController(text: widget.initial.showAnnounce);
    _titleCtrl = TextEditingController(text: widget.initial.title);
    _tempatCtrl = TextEditingController(text: widget.initial.tempat);
    _jemputanCtrl = TextEditingController(text: widget.initial.jemputan);
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _tahunCtrl.dispose();
    _bulanCtrl.dispose();
    _hariCtrl.dispose();
    _typeCtrl.dispose();
    _replaceCtrl.dispose();
    _notesCtrl.dispose();
    _showAnnounceCtrl.dispose();
    _titleCtrl.dispose();
    _tempatCtrl.dispose();
    _jemputanCtrl.dispose();
    super.dispose();
  }

  _GantiDraft _buildDraft() {
    return _GantiDraft(
      format: _format,
      date: _dateCtrl.text.trim(),
      tahun: _tahunCtrl.text.trim(),
      bulan: _bulanCtrl.text.trim(),
      hari: _hariCtrl.text.trim(),
      type: _typeCtrl.text.trim(),
      replace: _replaceCtrl.text.trim(),
      notes: _notesCtrl.text.trim(),
      showAnnounce: _showAnnounceCtrl.text.trim(),
      title: _titleCtrl.text.trim(),
      tempat: _tempatCtrl.text.trim(),
      jemputan: _jemputanCtrl.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSingle = _format == 'single';
    final isWeekly = _format == 'weekly';
    final isHijri = _format == 'hijri';
    final isRange = _format == 'range';

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                value: _format,
                isExpanded: true,
                items: _formatOptions
                    .map((o) => DropdownMenuItem(value: o['v'], child: Text(o['l']!, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (v) => setState(() => _format = v ?? 'single'),
                decoration: const InputDecoration(labelText: 'Format', isDense: true),
              ),
              const SizedBox(height: 12),
              if (isSingle) ...[
                TextField(
                  controller: _dateCtrl,
                  readOnly: true,
                  onTap: _pickDate,
                  decoration: const InputDecoration(
                    labelText: 'Tarikh (DD-MM-YYYY)',
                    hintText: 'Tekan untuk pilih',
                    isDense: true,
                    suffixIcon: Icon(Icons.calendar_month, size: 20),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (isWeekly) ...[
                TextField(
                  controller: _hariCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Hari (0=Ahad..6=Sabtu)',
                    isDense: true,
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
              ],
              if (isHijri || isRange) ...[
                Row(
                  children: [
                    if (isRange)
                      Expanded(
                        child: TextField(
                          controller: _tahunCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Tahun (optional)',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    if (isRange) const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _bulanCtrl,
                        decoration: InputDecoration(
                          labelText: isHijri ? 'Bulan (1-12)' : 'Bulan',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _hariCtrl,
                        decoration: InputDecoration(
                          labelText: 'Hari',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                if (isHijri) const SizedBox(height: 4),
                if (isRange) const SizedBox(height: 12),
              ],
              if (isHijri) ...[
                TextField(
                  controller: _tahunCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tahun (optional)',
                    isDense: true,
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Jenis Kuliah (ks,km,kd,kk - boleh berbilang)', style: Theme.of(context).textTheme.labelSmall),
              ),
              Wrap(
                spacing: 12,
                children: _typeOptions.map((o) {
                  final v = o['v']!;
                  final selected = _typeCtrl.text.split(',').map((s) => s.trim()).contains(v);
                  return FilterChip(
                    label: Text(o['l']!),
                    selected: selected,
                    onSelected: (sel) {
                      final parts = _typeCtrl.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toSet();
                      if (sel) {
                        parts.add(v);
                      } else {
                        parts.remove(v);
                      }
                      _typeCtrl.text = parts.join(',');
                      setState(() {});
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              if (isWeekly || isHijri || isRange) ...[
                DropdownButtonFormField<String>(
                  value: _replaceCtrl.text.trim().isEmpty ? '0' : _replaceCtrl.text.trim(),
                  isExpanded: true,
                  items: const [
                    DropdownMenuItem(value: '0', child: Text('Batal', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: '1', child: Text('Ganti (1)', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => _replaceCtrl.text = v ?? '0',
                  decoration: const InputDecoration(labelText: 'Replace', isDense: true),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _notesCtrl,
                decoration: const InputDecoration(labelText: 'Catatan', isDense: true),
                maxLines: 1,
              ),
              if (isHijri) ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _showAnnounceCtrl.text.trim() == '1' ? '1' : '0',
                  isExpanded: true,
                  items: const [
                    DropdownMenuItem(value: '0', child: Text('Tiada pengumuman', overflow: TextOverflow.ellipsis)),
                    DropdownMenuItem(value: '1', child: Text('Paparkan pengumuman', overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => _showAnnounceCtrl.text = v ?? '0',
                  decoration: const InputDecoration(labelText: 'Pengumuman', isDense: true),
                ),
                const SizedBox(height: 12),
                TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Tajuk', isDense: true)),
                const SizedBox(height: 8),
                TextField(controller: _tempatCtrl, decoration: const InputDecoration(labelText: 'Tempat', isDense: true)),
                const SizedBox(height: 8),
                TextField(controller: _jemputanCtrl, decoration: const InputDecoration(labelText: 'Jemputan', isDense: true)),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: () {
            final type = _typeCtrl.text.trim();
            if (type.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Type kuliah wajib dipilih')),
              );
              return;
            }
            Navigator.pop(context, _buildDraft());
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}
