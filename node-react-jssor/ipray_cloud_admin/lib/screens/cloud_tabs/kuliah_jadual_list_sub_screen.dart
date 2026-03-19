import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Kuliah: Jadual Kuliah (table kuliah).
class KuliahJadualListSubScreen extends StatefulWidget {
  const KuliahJadualListSubScreen({
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
        builder: (context) => KuliahJadualListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<KuliahJadualListSubScreen> createState() =>
      _KuliahJadualListSubScreenState();
}

class _KuliahJadualListSubScreenState extends State<KuliahJadualListSubScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _penceramah = <Map<String, dynamic>>[];

  String _filterMinggu = 'w1';
  String _filterKuliah = 'ALL';

  List<Map<String, dynamic>> get _filteredRows {
    return _rows.where((r) {
      final week = (r['week']?.toString() ?? '').trim().toLowerCase();
      if (week != _filterMinggu.toLowerCase()) return false;
      if (_filterKuliah == 'ALL') return true;
      final type = (r['type']?.toString() ?? '').trim().toLowerCase();
      return type == _filterKuliah.toLowerCase();
    }).toList();
  }

  static const List<Map<String, String>> _filterWeekOptions = [
    {'v': 'w1', 'l': '1'},
    {'v': 'w2', 'l': '2'},
    {'v': 'w3', 'l': '3'},
    {'v': 'w4', 'l': '4'},
  ];

  static const List<Map<String, String>> _filterKuliahOptions = [
    {'v': 'ALL', 'l': 'ALL'},
    {'v': 'ks', 'l': 'KS'},
    {'v': 'kd', 'l': 'KD'},
    {'v': 'km', 'l': 'KM'},
  ];

  static const Map<String, String> _weekLabels = {
    'w1': 'Minggu 1',
    'w2': 'Minggu 2',
    'w3': 'Minggu 3',
    'w4': 'Minggu 4',
    'w5': 'Minggu 5',
  };

  static const Map<String, String> _dayLabels = {
    'h0': 'Ahad',
    'h1': 'Isnin',
    'h2': 'Selasa',
    'h3': 'Rabu',
    'h4': 'Khamis',
    'h5': 'Jumaat',
    'h6': 'Sabtu',
  };

  static const Map<String, String> _typeLabels = {
    'ks': 'KS - Kuliah Subuh',
    'km': 'KM - Kuliah Maghrib',
    'kd': 'KD - Kuliah Dhuha',
    'kk': 'KK - Kuliah Khas',
  };

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant KuliahJadualListSubScreen oldWidget) {
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

  String _penceramahNameFor(String? kod) {
    final code = (kod ?? '').trim();
    if (code.isEmpty) return '';
    final found = _penceramah.firstWhere(
      (p) => (p['kod']?.toString() ?? '').trim() == code,
      orElse: () => const <String, dynamic>{},
    );
    final nama = (found['namaPenuh']?.toString() ?? '').trim();
    return nama.isNotEmpty ? nama : code;
  }

  Future<void> _loadAll() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final results = await Future.wait<dynamic>([
        svc.fetchData('kuliah'),
        svc.fetchData('penceramah'),
      ]);
      if (!mounted) return;
      final kuliahRes = results[0] as CloudDataResult;
      final penceramahRes = results[1] as CloudDataResult;
      setState(() {
        _rows = kuliahRes.data;
        _penceramah = penceramahRes.data;
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

    final draft = await showDialog<_KuliahJadualDraft>(
      context: context,
      builder: (ctx) => _KuliahJadualDialog(
        title: 'Tambah Kuliah Baru',
        initial: const _KuliahJadualDraft(
          week: 'w1',
          day: 'h0',
          type: 'km',
          speaker: '',
          title: '',
        ),
        penceramah: _penceramah,
      ),
    );
    if (draft == null) return;
    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      await _socketService!.insertRow(
        'kuliah',
        {'raw': raw},
        position: 'end',
      );
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal tambah kuliah.')),
      );
    }
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final initial = _KuliahJadualDraft.fromRow(row);

    final draft = await showDialog<_KuliahJadualDraft>(
      context: context,
      builder: (ctx) => _KuliahJadualDialog(
        title: 'Edit Kuliah #$id',
        initial: initial,
        penceramah: _penceramah,
      ),
    );
    if (draft == null) return;
    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      await svc.updateRow('kuliah', id, {'raw': raw});
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal kemaskini kuliah.')),
      );
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final week = row['week']?.toString() ?? '';
    final day = row['day']?.toString() ?? '';
    final type = row['type']?.toString() ?? '';
    final speaker = row['speaker']?.toString() ?? '';
    final title = row['title']?.toString() ?? '';
    final penceramahName = _penceramahNameFor(speaker);

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Jadual Kuliah'),
        content: Text(
          'Padam ID #$id?'
          '\n'
          '${_weekLabels[week] ?? week} · ${_dayLabels[day] ?? day} · ${_typeLabels[type] ?? type}'
          '${penceramahName.isNotEmpty ? '\n$penceramahName' : ''}'
          '${title.isNotEmpty ? '\n$title' : ''}',
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
      await svc.deleteRow('kuliah', id);
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal padam jadual kuliah.')),
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
        title: const Text('Jadual Kuliah'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          ListSubScreenAppBarActions(
            onAdd: _showAddDialog,
            onRefresh: _loadAll,
            loading: _loading,
            itemCount: _filteredRows.length,
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
              _buildFilterRow(),
              const SizedBox(height: 12),
              _buildListCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterRow() {
    const labelStyle = TextStyle(fontSize: 12.5, color: Color(0xFF6B7280));
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('minggu:', style: labelStyle),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: _filterMinggu,
              isDense: true,
              underline: const SizedBox(),
              onChanged: (v) => setState(() => _filterMinggu = v ?? 'w1'),
              items: _filterWeekOptions
                  .map((opt) => DropdownMenuItem(value: opt['v'], child: Text(opt['l'] ?? '')))
                  .toList(),
            ),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('kuliah:', style: labelStyle),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: _filterKuliah,
              isDense: true,
              underline: const SizedBox(),
              onChanged: (v) => setState(() => _filterKuliah = v ?? 'ALL'),
              items: _filterKuliahOptions
                  .map((opt) => DropdownMenuItem(value: opt['v'], child: Text(opt['l'] ?? '')))
                  .toList(),
            ),
          ],
        ),
      ],
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
            : (_filteredRows.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      _rows.isEmpty ? 'Tiada jadual kuliah.' : 'Tiada padanan untuk filter.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_filteredRows.length * 2 - 1, (i) {
                      if (i.isOdd) {
                        return Divider(
                          height: 1,
                          thickness: 1,
                          color: Colors.grey.shade200,
                        );
                      }
                      final row = _filteredRows[i ~/ 2];
                      return _KuliahJadualRowTile(
                        row: row,
                        penceramahName:
                            _penceramahNameFor(row['speaker']?.toString()),
                        weekLabel:
                            _weekLabels[row['week']?.toString()] ?? '',
                        dayLabel:
                            _dayLabels[row['day']?.toString()] ?? '',
                        typeLabel:
                            _typeLabels[row['type']?.toString()] ?? '',
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }
}

class _KuliahJadualRowTile extends StatelessWidget {
  const _KuliahJadualRowTile({
    required this.row,
    required this.penceramahName,
    required this.weekLabel,
    required this.dayLabel,
    required this.typeLabel,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final String penceramahName;
  final String weekLabel;
  final String dayLabel;
  final String typeLabel;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final title = (row['title']?.toString() ?? '').trim();

    return ListTile(
      title: Text(
        typeLabel.isEmpty ? '—' : typeLabel,
        style: const TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${weekLabel.isEmpty ? '—' : weekLabel} · ${dayLabel.isEmpty ? '—' : dayLabel}',
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF4B5563),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              penceramahName.isEmpty ? '(Tiada penceramah)' : penceramahName,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6B7280),
              ),
            ),
            if (title.isNotEmpty)
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9CA3AF),
                ),
              ),
          ],
        ),
      ),
      trailing: Wrap(
        spacing: 16,
        children: [
          IconButton(
            style: IconButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            tooltip: 'Edit',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
          ),
          IconButton(
            style: IconButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            tooltip: 'Padam',
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
          ),
        ],
      ),
    );
  }
}

class _KuliahJadualDraft {
  const _KuliahJadualDraft({
    required this.week,
    required this.day,
    required this.type,
    required this.speaker,
    required this.title,
  });

  final String week;
  final String day;
  final String type;
  final String speaker;
  final String title;

  static _KuliahJadualDraft fromRow(Map<String, dynamic> row) {
    return _KuliahJadualDraft(
      week: (row['week']?.toString() ?? '').trim(),
      day: (row['day']?.toString() ?? '').trim(),
      type: (row['type']?.toString() ?? '').trim(),
      speaker: (row['speaker']?.toString() ?? row['speakerId']?.toString() ?? '').trim(),
      title: (row['title']?.toString() ?? '').trim(),
    );
  }

  /// raw: week|day|type|speaker|title
  String? buildRaw() {
    if (week.trim().isEmpty) return null;
    if (day.trim().isEmpty) return null;
    if (type.trim().isEmpty) return null;
    if (speaker.trim().isEmpty) return null;
    return '${week.trim()}|${day.trim()}|${type.trim()}|${speaker.trim()}|${title.trim()}';
  }
}

class _KuliahJadualDialog extends StatefulWidget {
  const _KuliahJadualDialog({
    required this.title,
    required this.initial,
    required this.penceramah,
  });

  final String title;
  final _KuliahJadualDraft initial;
  final List<Map<String, dynamic>> penceramah;

  @override
  State<_KuliahJadualDialog> createState() => _KuliahJadualDialogState();
}

class _KuliahJadualDialogState extends State<_KuliahJadualDialog> {
  final _formKey = GlobalKey<FormState>();

  late String _week;
  late String _day;
  late String _type;
  late String _speaker;
  late String _title;

  static const List<Map<String, String>> _weekOptions = [
    {'v': 'w1', 'l': 'Minggu 1'},
    {'v': 'w2', 'l': 'Minggu 2'},
    {'v': 'w3', 'l': 'Minggu 3'},
    {'v': 'w4', 'l': 'Minggu 4'},
    {'v': 'w5', 'l': 'Minggu 5'},
  ];

  static const List<Map<String, String>> _dayOptions = [
    {'v': 'h0', 'l': 'Ahad'},
    {'v': 'h1', 'l': 'Isnin'},
    {'v': 'h2', 'l': 'Selasa'},
    {'v': 'h3', 'l': 'Rabu'},
    {'v': 'h4', 'l': 'Khamis'},
    {'v': 'h5', 'l': 'Jumaat'},
    {'v': 'h6', 'l': 'Sabtu'},
  ];

  static const List<Map<String, String>> _typeOptions = [
    {'v': 'ks', 'l': 'KS - Kuliah Subuh'},
    {'v': 'km', 'l': 'KM - Kuliah Maghrib'},
    {'v': 'kd', 'l': 'KD - Kuliah Dhuha'},
    {'v': 'kk', 'l': 'KK - Kuliah Khas'},
  ];

  @override
  void initState() {
    super.initState();
    _week = widget.initial.week.isNotEmpty ? widget.initial.week : 'w1';
    _day = widget.initial.day.isNotEmpty ? widget.initial.day : 'h0';
    _type = widget.initial.type.isNotEmpty ? widget.initial.type : 'km';
    _speaker = widget.initial.speaker;
    _title = widget.initial.title;
  }

  String _selectedPenceramahKitab() {
    if (_speaker.trim().isEmpty) return '';
    final found = widget.penceramah.firstWhere(
      (p) => (p['kod']?.toString() ?? '').trim() == _speaker.trim(),
      orElse: () => const <String, dynamic>{},
    );
    return (found['kitab']?.toString() ?? '').trim();
  }

  @override
  Widget build(BuildContext context) {
    final kitabStr = _selectedPenceramahKitab();
    final kitabList = kitabStr.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    final titleSet = _title.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toSet();

    final speakerItems = <DropdownMenuItem<String>>[
      const DropdownMenuItem<String>(
        value: '',
        child: Text('-- Pilih penceramah --'),
      ),
      ...widget.penceramah.map(
        (p) {
          final kod = (p['kod']?.toString() ?? '').trim();
          final nama = (p['namaPenuh']?.toString() ?? '').trim();
          return DropdownMenuItem<String>(
            value: kod,
            child: Text(nama.isNotEmpty ? nama : kod),
          );
        },
      ),
    ];

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 520,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildRadioGroup('Minggu', _weekOptions, _week, (v) => setState(() => _week = v)),
                const SizedBox(height: 12),
                _buildRadioGroup('Hari', _dayOptions, _day, (v) => setState(() => _day = v)),
                const SizedBox(height: 12),
                _buildRadioGroup('Jenis Kuliah', _typeOptions, _type, (v) => setState(() => _type = v)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Penceramah',
                    isDense: true,
                  ),
                  isExpanded: true,
                  value: _speaker.trim().isEmpty ? null : _speaker.trim(),
                  items: speakerItems,
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() {
                      _speaker = v;
                      _title = '';
                    });
                  },
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Penceramah wajib diisi';
                    }
                    return null;
                  },
                ),
                if (kitabList.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Nama Kitab / Tajuk Kuliah',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: kitabList.map((k) {
                      final checked = titleSet.contains(k);
                      return FilterChip(
                        label: Text(k),
                        selected: checked,
                        onSelected: (sel) {
                          setState(() {
                            if (sel == true) {
                              titleSet.add(k);
                            } else {
                              titleSet.remove(k);
                            }
                            _title = titleSet.join(',');
                          });
                        },
                      );
                    }).toList(),
                  ),
                ] else if (_speaker.trim().isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Pilih penceramah terlebih dahulu',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Tajuk / Kitab (legacy)',
                        isDense: true,
                      ),
                      controller: TextEditingController(text: _title)
                        ..selection = TextSelection.collapsed(offset: _title.length),
                      onChanged: (v) => setState(() => _title = v),
                    ),
                  ),
              ],
            ),
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
            if (_formKey.currentState?.validate() ?? false) {
              Navigator.pop(
                context,
                _KuliahJadualDraft(
                  week: _week,
                  day: _day,
                  type: _type,
                  speaker: _speaker.trim(),
                  title: _title.trim(),
                ),
              );
            }
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }

  Widget _buildRadioGroup(
    String label,
    List<Map<String, String>> options,
    String value,
    void Function(String) onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 14,
          runSpacing: -15,
          children: options.map((opt) {
            final v = opt['v']!;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Radio<String>(
                  value: v,
                  groupValue: value,
                  onChanged: (val) {
                    if (val != null) onChanged(val);
                  },
                ),
                Text(opt['l']!),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}
