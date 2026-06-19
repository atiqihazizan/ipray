import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

/// Sub-skrin Imam & Bilal: Jadual Petugas (ganti table → list).
class ImamBilalJadualListSubScreen extends StatefulWidget {
  const ImamBilalJadualListSubScreen({
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
        builder: (context) => ImamBilalJadualListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<ImamBilalJadualListSubScreen> createState() =>
      _ImamBilalJadualListSubScreenState();
}

class _ImamBilalJadualListSubScreenState
    extends State<ImamBilalJadualListSubScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _petugas = <Map<String, dynamic>>[];

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

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant ImamBilalJadualListSubScreen oldWidget) {
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

  String _petugasNameFor(String? officerCode) {
    final code = (officerCode ?? '').trim();
    if (code.isEmpty) return '';
    final found = _petugas.firstWhere(
      (p) => (p['slug']?.toString() ?? '').trim() == code,
      orElse: () => const <String, dynamic>{},
    );
    return (found['namaPenuh']?.toString() ?? '').trim();
  }

  Future<void> _loadAll() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final results = await Future.wait<dynamic>([
        svc.fetchData('jadual-petugas'),
        svc.fetchData('petugas'),
      ]);
      if (!mounted) return;
      final jadualRes = results[0] as CloudDataResult;
      final petugasRes = results[1] as CloudDataResult;
      setState(() {
        _rows = jadualRes.data;
        _petugas = petugasRes.data;
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

    const defaultRole = 'BILAL';
    final filtered = _petugas.where((p) {
      final r = (p['role']?.toString() ?? '').trim().toUpperCase();
      return r == defaultRole;
    });
    final defaultOfficerCode =
        filtered.isNotEmpty ? (filtered.first['slug']?.toString() ?? '') : '';

    final draft = await showDialog<_JadualDraft>(
      context: context,
      builder: (ctx) => _JadualDialog(
        title: 'Tambah Jadual',
        initial: _JadualDraft(
          week: 'w1',
          day: 'h0',
          role: defaultRole,
          officerCode: defaultOfficerCode,
        ),
        petugas: _petugas,
      ),
    );
    if (draft == null) return;
    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      await _socketService!.insertRow(
        'jadual-petugas',
        {'raw': raw},
        position: 'end',
      );
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal tambah jadual petugas.')),
      );
    }
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;

    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final initial = _JadualDraft.fromRow(row);

    final draft = await showDialog<_JadualDraft>(
      context: context,
      builder: (ctx) => _JadualDialog(
        title: 'Edit Jadual #$id',
        initial: initial,
        petugas: _petugas,
      ),
    );
    if (draft == null) return;
    final raw = draft.buildRaw();
    if (raw == null) return;

    try {
      await svc.updateRow(
        'jadual-petugas',
        id,
        {'raw': raw},
      );
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal kemaskini jadual petugas.')),
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
    final role = row['role']?.toString() ?? '';
    final code = row['officerCode']?.toString() ?? '';
    final petugasName = _petugasNameFor(code);

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Jadual Petugas'),
        content: Text(
          'Padam ID #$id?'
          '\n'
          '${_weekLabels[week] ?? week}'
          ' · ${_dayLabels[day] ?? day}'
          ' · $role'
          '${petugasName.isNotEmpty ? ' · $petugasName' : ''}',
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
      await svc.deleteRow('jadual-petugas', id);
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal padam jadual petugas.')),
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
        title: const Text('Jadual Petugas Imam & Bilal'),
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
                      'Tiada jadual petugas.',
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
                      return _JadualRowTile(
                        row: row,
                        petugasName: _petugasNameFor(
                          row['officerCode']?.toString(),
                        ),
                        weekLabel: _weekLabels[row['week']?.toString()] ??
                            (row['week']?.toString() ?? ''),
                        dayLabel: _dayLabels[row['day']?.toString()] ??
                            (row['day']?.toString() ?? ''),
                        roleLabel: (row['role']?.toString() ?? '').trim(),
                        onEdit: () => _showEditDialog(row),
                        onDelete: () => _confirmDelete(row),
                      );
                    }),
                  )),
      ),
    );
  }
}

class _JadualRowTile extends StatelessWidget {
  const _JadualRowTile({
    required this.row,
    required this.petugasName,
    required this.weekLabel,
    required this.dayLabel,
    required this.roleLabel,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final String petugasName;
  final String weekLabel;
  final String dayLabel;
  final String roleLabel;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final officerCode = (row['officerCode']?.toString() ?? '').trim();

    return ListTile(
      title: Text(
        weekLabel.isEmpty ? '—' : weekLabel,
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
              dayLabel.isEmpty ? '—' : dayLabel,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF4B5563),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              _subtitleLine(roleLabel, petugasName, officerCode),
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6B7280),
              ),
            ),
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

  String _subtitleLine(String role, String namaPenuh, String officerCode) {
    final parts = <String>[];
    if (role.isNotEmpty) parts.add(role);
    final name = namaPenuh.isNotEmpty ? namaPenuh : officerCode;
    if (name.isNotEmpty) parts.add(name);
    return parts.isEmpty ? '-' : parts.join(' · ');
  }
}

class _JadualDraft {
  const _JadualDraft({
    required this.week,
    required this.day,
    required this.role,
    required this.officerCode,
  });

  final String week;
  final String day;
  final String role;
  final String officerCode;

  static _JadualDraft fromRow(Map<String, dynamic> row) {
    return _JadualDraft(
      week: (row['week']?.toString() ?? '').trim(),
      day: (row['day']?.toString() ?? '').trim(),
      role: (row['role']?.toString() ?? '').trim(),
      officerCode: (row['officerCode']?.toString() ?? '').trim(),
    );
  }

  /// raw: `week|day|role|officerCode`
  String? buildRaw() {
    if (week.trim().isEmpty) return null;
    if (day.trim().isEmpty) return null;
    if (role.trim().isEmpty) return null;
    if (officerCode.trim().isEmpty) return null;
    return '${week.trim()}|${day.trim()}|${role.trim()}|${officerCode.trim()}';
  }
}

class _JadualDialog extends StatefulWidget {
  const _JadualDialog({
    required this.title,
    required this.initial,
    required this.petugas,
  });

  final String title;
  final _JadualDraft initial;
  final List<Map<String, dynamic>> petugas;

  @override
  State<_JadualDialog> createState() => _JadualDialogState();
}

class _JadualDialogState extends State<_JadualDialog> {
  final _formKey = GlobalKey<FormState>();

  late String _week;
  late String _day;
  late String _role;
  late String _officerCode;

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

  List<Map<String, dynamic>> get _filteredPetugas {
    final roleUp = _role.trim().toUpperCase();
    return widget.petugas.where((p) {
      final r = (p['role']?.toString() ?? '').trim().toUpperCase();
      return r == roleUp;
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _week = widget.initial.week;
    _day = widget.initial.day;
    _role = widget.initial.role;
    _officerCode = widget.initial.officerCode;
    _syncOfficerCodeIfNeeded();
  }

  void _syncOfficerCodeIfNeeded() {
    final filteredSlugs = _filteredPetugas
        .map((p) => (p['slug']?.toString() ?? '').trim())
        .where((s) => s.isNotEmpty)
        .toSet();
    if (filteredSlugs.contains(_officerCode.trim())) return;
    final first = _filteredPetugas.isNotEmpty
        ? (widget.petugas
                .where((p) =>
                    (p['role']?.toString() ?? '').trim().toUpperCase() ==
                    _role.trim().toUpperCase())
                .first['slug']
                ?.toString() ??
            '')
        : '';
    _officerCode = first;
  }

  @override
  Widget build(BuildContext context) {
    final officerItems = <DropdownMenuItem<String>>[
      const DropdownMenuItem<String>(
        value: '',
        child: Text('-- Pilih petugas --'),
      ),
      ..._filteredPetugas.map(
        (p) {
          final slug = (p['slug']?.toString() ?? '').trim();
          final nama = (p['namaPenuh']?.toString() ?? '').trim();
          return DropdownMenuItem<String>(
            value: slug,
            child: Text(nama.isNotEmpty ? nama : slug),
          );
        },
      ),
    ];

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 560,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Minggu',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 14,
                  runSpacing: -15,
                  children: _weekOptions.map((opt) {
                    final v = opt['v']!;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Radio<String>(
                          value: v,
                          groupValue: _week,
                          onChanged: (val) {
                            if (val == null) return;
                            setState(() => _week = val);
                          },
                        ),
                        Text(opt['l']!),
                      ],
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Hari',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  runSpacing: -15,
                  children: _dayOptions.map((opt) {
                    final v = opt['v']!;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Radio<String>(
                          value: v,
                          groupValue: _day,
                          onChanged: (val) {
                            if (val == null) return;
                            setState(() => _day = val);
                          },
                        ),
                        Text(opt['l']?.toUpperCase() ?? ''),
                      ],
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                FormField<String>(
                  initialValue: _role,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Peranan wajib' : null,
                  builder: (field) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Peranan',
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 18,
                          runSpacing: -15,
                          children: ['BILAL', 'IMAM'].map((v) {
                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Radio<String>(
                                  value: v,
                                  groupValue: _role,
                                  onChanged: (val) {
                                    if (val == null) return;
                                    setState(() {
                                      _role = val;
                                      _syncOfficerCodeIfNeeded();
                                    });
                                    field.didChange(val);
                                  },
                                ),
                                Text(v),
                              ],
                            );
                          }).toList(),
                        ),
                        if (field.hasError)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              field.errorText ?? '',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Petugas',
                    isDense: true,
                  ),
                  value: _officerCode.trim(),
                  items: officerItems,
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _officerCode = v);
                  },
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Petugas wajib diisi';
                    }
                    return null;
                  },
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
            final result = _JadualDraft(
              week: _week,
              day: _day,
              role: _role.trim().toUpperCase(),
              officerCode: _officerCode.trim(),
            );
            Navigator.of(context).pop(result);
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}

