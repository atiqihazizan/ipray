import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';
import '../../widgets/stepper_field.dart';

/// Sub-skrin Kuliah: List Paparan (kad kuliahHari/kuliahWeekly/kuliahBulanan dari slides).
class KuliahPaparanListSubScreen extends StatefulWidget {
  const KuliahPaparanListSubScreen({
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
        builder: (context) => KuliahPaparanListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<KuliahPaparanListSubScreen> createState() =>
      _KuliahPaparanListSubScreenState();
}

class _KuliahPaparanListSubScreenState extends State<KuliahPaparanListSubScreen>
    with TickerProviderStateMixin {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _images = <Map<String, dynamic>>[];

  final Map<int, Timer> _saveDebouncers = <int, Timer>{};
  final Map<int, String> _saveStatus = <int, String>{};

  late TabController _tabController;

  static const Set<String> _kuliahTypes = {
    'kuliahhari',
    'kuliahweekly',
    'kuliahbulanan',
  };

  static const List<Map<String, String>> _tabConfig = [
    {'type': 'kuliahhari', 'label': 'Harian'},
    {'type': 'kuliahweekly', 'label': 'Mingguan'},
    {'type': 'kuliahbulanan', 'label': 'Bulanan'},
  ];

  List<Map<String, dynamic>> _rowsForType(String type) {
    final t = type.toLowerCase();
    return _rows.where((r) => (r['type']?.toString() ?? '').trim().toLowerCase() == t).toList();
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabConfig.length, vsync: this);
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant KuliahPaparanListSubScreen oldWidget) {
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
    for (final t in _saveDebouncers.values) {
      t.cancel();
    }
    _saveDebouncers.clear();
    _saveStatus.clear();
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

  String _imageUrlForCode(String? imageCode) {
    final code = (imageCode ?? '').trim();
    if (code.isEmpty) return '${_baseUrl()}/storage/clientA/images/noimage.png';
    for (final im in _images) {
      final ic = (im['imageCode']?.toString() ?? '').trim();
      if (ic != code) continue;
      final path = (im['imagePath']?.toString() ?? '').trim();
      if (path.isEmpty) continue;
      if (path.startsWith('http')) return path;
      if (path.startsWith('/')) return '${_baseUrl()}$path';
      return '${_baseUrl()}/$path';
    }
    return '${_baseUrl()}/storage/clientA/images/noimage.png';
  }

  Future<void> _loadAll() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final results = await Future.wait<dynamic>([
        svc.fetchData('slides'),
        svc.fetchData('images'),
      ]);
      if (!mounted) return;
      final slidesRes = results[0] as CloudDataResult;
      final imagesRes = results[1] as CloudDataResult;

      final filtered = <Map<String, dynamic>>[];
      for (final r in slidesRes.data) {
        final type = (r['type']?.toString() ?? '').trim().toLowerCase();
        if (_kuliahTypes.contains(type)) filtered.add(Map.from(r));
      }
      const typeOrder = {'kuliahhari': 1, 'kuliahweekly': 2, 'kuliahbulanan': 3};
      filtered.sort((a, b) {
        final ta = (a['type'] ?? '').toString().toLowerCase();
        final tb = (b['type'] ?? '').toString().toLowerCase();
        return (typeOrder[ta] ?? 999) - (typeOrder[tb] ?? 999);
      });

      setState(() {
        _rows = filtered;
        _images = imagesRes.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _refreshNow() async => _loadAll();

  void _scheduleSave(int id, Map<String, dynamic> nextRow) {
    final svc = _socketService;
    if (svc == null) return;

    _saveDebouncers[id]?.cancel();
    if (mounted) setState(() => _saveStatus[id] = 'Menyimpan…');
    _saveDebouncers[id] = Timer(const Duration(milliseconds: 450), () async {
      try {
        await svc.updateRow('slides', id, nextRow);
        if (!mounted) return;
        setState(() => _saveStatus[id] = 'Disimpan');
      } catch (_) {
        if (!mounted) return;
        setState(() => _saveStatus[id] = 'Gagal simpan');
      } finally {
        _saveDebouncers.remove(id);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('List Paparan Kuliah'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        bottom: TabBar(
          controller: _tabController,
          tabs: _tabConfig
              .map((tc) => Tab(text: tc['label'] ?? ''))
              .toList(),
        ),
        actions: [
          ListSubScreenAppBarActions(
            showAdd: false,
            onRefresh: _loadAll,
            loading: _loading,
            itemCount: _rows.length,
          ),
        ],
      ),
      body: Container(
        color: const Color(0xFFF5F5F5),
        child: TabBarView(
          controller: _tabController,
          children: _tabConfig.map((tc) {
            final type = tc['type'] ?? '';
            final rows = _rowsForType(type);
            return RefreshIndicator(
              onRefresh: _refreshNow,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildCardsGridForRows(rows),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCardsGridForRows(List<Map<String, dynamic>> rows) {
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
            : (rows.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Tiada kad kuliah paparan untuk tab ini.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(rows.length * 2 - 1, (i) {
                      if (i.isOdd) {
                        return Divider(
                          height: 1,
                          thickness: 1,
                          color: Colors.grey.shade200,
                        );
                      }
                      final row = rows[i ~/ 2];
                      final idRaw = row['id'];
                      final id = idRaw is int
                          ? idRaw
                          : int.tryParse(idRaw?.toString() ?? '');
                      if (id == null) return const SizedBox.shrink();

                      return _KuliahPaparanCard(
                        row: row,
                        imageUrl: _imageUrlForCode(row['image']?.toString()),
                        statusText: _saveStatus[id],
                        onChanged: _scheduleSave,
                      );
                    }),
                  )),
      ),
    );
  }
}

class _KuliahPaparanCard extends StatefulWidget {
  const _KuliahPaparanCard({
    required this.row,
    required this.imageUrl,
    required this.onChanged,
    this.statusText,
  });

  final Map<String, dynamic> row;
  final String imageUrl;
  final String? statusText;
  final void Function(int id, Map<String, dynamic> nextRow) onChanged;

  @override
  State<_KuliahPaparanCard> createState() => _KuliahPaparanCardState();
}

class _KuliahPaparanCardState extends State<_KuliahPaparanCard> {
  late int _durationSeconds;
  late Set<String> _paparan;

  static int _durationMsToSeconds(String? raw) {
    final s = (raw ?? '').trim();
    if (s.isEmpty) return 0;
    final ms = double.tryParse(s);
    if (ms == null || ms.isNaN) return 0;
    return (ms / 1000).round();
  }

  static String _durationSecondsToMs(int sec) => (sec * 1000).toString();

  Set<String> _parseCheckbox(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return <String>{};
    return s.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toSet();
  }

  @override
  void initState() {
    super.initState();
    _durationSeconds = _durationMsToSeconds(widget.row['duration']?.toString());
    _paparan = _parseCheckbox(widget.row['checkbox']?.toString() ?? '');
  }

  @override
  void didUpdateWidget(covariant _KuliahPaparanCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.row != oldWidget.row) {
      _durationSeconds = _durationMsToSeconds(widget.row['duration']?.toString());
      _paparan = _parseCheckbox(widget.row['checkbox']?.toString() ?? '');
    }
  }

  void _emitChange() {
    final idRaw = widget.row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final next = Map<String, dynamic>.from(widget.row);
    next['duration'] = _durationSecondsToMs(_durationSeconds);
    final sorted = _paparan.toList()..sort();
    next['checkbox'] = sorted.join(',');
    next['hide'] = '0';

    widget.onChanged(id, next);
  }

  String _formatPaparanText() {
    const labels = {
      'date': 'Tarikh',
      'solat-time': 'Waktu solat',
      'solat-time-small': 'Masa kecil',
      'marquee': 'Hebahan bar',
    };
    final parts = _paparan
        .map((k) => labels[k] ?? k)
        .where((s) => s.isNotEmpty)
        .toList();
    return parts.isEmpty ? '—' : parts.join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final type = (widget.row['type']?.toString() ?? 'Kuliah').trim();
    final id = widget.row['id']?.toString() ?? '';
    final status = widget.statusText;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                type.isEmpty ? 'Kuliah' : type,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                ),
              ),
              const Spacer(),
              Text('ID $id', style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
              if (status != null && status.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text(status, style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: double.infinity,
                height: 120,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    widget.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFFE5E7EB),
                      child: const Center(child: Icon(Icons.image_not_supported, color: Color(0xFF6B7280))),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  _PaparanCb(optionKey: 'date', label: 'Tarikh', paparan: _paparan, onChanged: (v) {
                    setState(() {
                      if (v == true) _paparan.add('date');
                      else _paparan.remove('date');
                      _emitChange();
                    });
                  }),
                  _PaparanCb(optionKey: 'solat-time', label: 'Waktu solat', paparan: _paparan, onChanged: (v) {
                    setState(() {
                      if (v == true) _paparan.add('solat-time');
                      else _paparan.remove('solat-time');
                      _emitChange();
                    });
                  }),
                  _PaparanCb(optionKey: 'solat-time-small', label: 'Masa kecil', paparan: _paparan, onChanged: (v) {
                    setState(() {
                      if (v == true) _paparan.add('solat-time-small');
                      else _paparan.remove('solat-time-small');
                      _emitChange();
                    });
                  }),
                  _PaparanCb(optionKey: 'marquee', label: 'Hebahan bar', paparan: _paparan, onChanged: (v) {
                    setState(() {
                      if (v == true) _paparan.add('marquee');
                      else _paparan.remove('marquee');
                      _emitChange();
                    });
                  }),
                ],
              ),
              const SizedBox(height: 8),
              StepperField(
                label: 'Tempoh (s)',
                value: _durationSeconds,
                min: 0,
                onChanged: (v) {
                  setState(() {
                    _durationSeconds = v;
                    _emitChange();
                  });
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PaparanCb extends StatelessWidget {
  const _PaparanCb({
    required this.optionKey,
    required this.label,
    required this.paparan,
    required this.onChanged,
  });

  final String optionKey;
  final String label;
  final Set<String> paparan;
  final void Function(bool?) onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: CheckboxListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: paparan.contains(optionKey),
        title: Text(
          label,
          style: const TextStyle(fontSize: 12.5, color: Color(0xFF374151)),
          overflow: TextOverflow.ellipsis,
        ),
        onChanged: onChanged,
      ),
    );
  }
}
