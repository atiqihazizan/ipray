import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/stepper_field.dart';

class AnnouncementSettingSubScreen extends StatefulWidget {
  const AnnouncementSettingSubScreen({
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
        builder: (context) => AnnouncementSettingSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<AnnouncementSettingSubScreen> createState() => _AnnouncementSettingSubScreenState();
}

class _AnnouncementSettingSubScreenState extends State<AnnouncementSettingSubScreen> {
  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  bool _loading = false;
  List<Map<String, dynamic>> _announceSlides = <Map<String, dynamic>>[];
  bool _imagesLoading = false;
  List<String> _slidesImageCodes = <String>[];
  final Map<int, Timer> _saveDebouncers = <int, Timer>{};
  final Map<int, String> _saveStatus = <int, String>{};

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  @override
  void didUpdateWidget(covariant AnnouncementSettingSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService || oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _announceSlides = <Map<String, dynamic>>[];
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

  Future<void> _refreshNow() async {
    await _loadAll();
  }

  Future<void> _loadAll() async {
    await Future.wait([
      _loadSlides(),
      _loadImages(),
    ]);
  }

  Future<void> _loadSlides() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final result = await svc.fetchData('slides');
      final filtered = <Map<String, dynamic>>[];
      for (final r in result.data) {
        final type = (r['type']?.toString() ?? '').trim().toLowerCase();
        if (type == 'announce') filtered.add(r);
      }
      if (!mounted) return;
      setState(() {
        _announceSlides = filtered;
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
    if (mounted) setState(() => _imagesLoading = true);
    try {
      final result = await svc.fetchData('images');
      final codes = <String>{};
      for (final r in result.data) {
        final code = (r['imageCode']?.toString() ?? '').trim();
        final path = (r['imagePath']?.toString() ?? '').trim();
        if (code.isEmpty) continue;
        if (!path.contains('/slides/')) continue;
        codes.add(code);
      }
      final list = codes.toList()..sort();
      if (!mounted) return;
      setState(() {
        _slidesImageCodes = list;
        _imagesLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _imagesLoading = false);
    }
  }

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
    _disposeSocketBindings();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setting Paparan'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            tooltip: 'Muat semula',
            onPressed: _loadSlides,
            icon: const Icon(Icons.refresh_rounded),
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
              // _buildHeaderCard(),
              const SizedBox(height: 12),
              _buildSlidesCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withAlpha((0.06 * 255).round()),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'Tetapan ini ambil template dari fail slides (type=announce). Anda boleh pilih imej, tetapkan tempoh (s), dan pilih item Paparan.',
          style: TextStyle(fontSize: 12.5, color: Color(0xFF4B5563), height: 1.35),
        ),
      ),
    );
  }

  Widget _buildSlidesCard() {
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
            : (_announceSlides.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Tiada template announce dalam slides.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_announceSlides.length * 2 - 1, (i) {
                      if (i.isOdd) return Divider(height: 1, thickness: 1, color: Colors.grey.shade200);
                      final row = _announceSlides[i ~/ 2];
                      final idRaw = row['id'];
                      final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
                      return id == null
                          ? const SizedBox.shrink()
                          : _AnnouncementSlideTile(
                              row: row,
                              images: _slidesImageCodes,
                              imagesLoading: _imagesLoading,
                              statusText: _saveStatus[id],
                              onChanged: _scheduleSave,
                            );
                    }),
                  )),
      ),
    );
  }
}

class _AnnouncementSlideTile extends StatefulWidget {
  const _AnnouncementSlideTile({
    required this.row,
    required this.images,
    required this.imagesLoading,
    required this.onChanged,
    this.statusText,
  });

  final Map<String, dynamic> row;
  final List<String> images;
  final bool imagesLoading;
  final String? statusText;
  final void Function(int id, Map<String, dynamic> nextRow) onChanged;

  @override
  State<_AnnouncementSlideTile> createState() => _AnnouncementSlideTileState();
}

class _AnnouncementSlideTileState extends State<_AnnouncementSlideTile> {
  late String _image;
  late int _durationSeconds;
  late Set<String> _paparan;

  static int _durationMsToIntSeconds(String? raw) {
    final s = (raw ?? '').trim();
    if (s.isEmpty) return 0;
    final ms = double.tryParse(s);
    if (ms == null || ms.isNaN) return 0;
    return (ms / 1000).round();
  }

  static String _durationIntSecondsToMs(int sec) => (sec * 1000).toString();

  @override
  void initState() {
    super.initState();
    _image = (widget.row['image']?.toString() ?? '').trim();
    _durationSeconds = _durationMsToIntSeconds(widget.row['duration']?.toString());
    _paparan = _parseCheckbox(widget.row['checkbox']?.toString() ?? '');
  }

  @override
  void didUpdateWidget(covariant _AnnouncementSlideTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.row != oldWidget.row) {
      _image = (widget.row['image']?.toString() ?? '').trim();
      _durationSeconds = _durationMsToIntSeconds(widget.row['duration']?.toString());
      _paparan = _parseCheckbox(widget.row['checkbox']?.toString() ?? '');
      return;
    }
    final nextImage = (widget.row['image']?.toString() ?? '').trim();
    if (_image != nextImage) _image = nextImage;
  }

  Set<String> _parseCheckbox(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return <String>{};
    return s
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toSet();
  }

  void _emitChange() {
    final idRaw = widget.row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;
    final next = Map<String, dynamic>.from(widget.row);
    next['image'] = _image;
    next['duration'] = _durationIntSecondsToMs(_durationSeconds);
    final sorted = _paparan.toList()..sort();
    next['checkbox'] = sorted.join(',');
    widget.onChanged(id, next);
  }

  Widget _paparanCheckbox(String key, String label) {
    final checked = _paparan.contains(key);
    return SizedBox(
      width: 220,
      child: CheckboxListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: checked,
        title: Text(label, style: const TextStyle(fontSize: 12.5, color: Color(0xFF374151))),
        onChanged: (v) {
          setState(() {
            if (v == true) {
              _paparan.add(key);
            } else {
              _paparan.remove(key);
            }
          });
          _emitChange();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final id = widget.row['id']?.toString() ?? '';
    final status = widget.statusText;

    final imageItems = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: '', child: Text('-- Pilih imej --', overflow: TextOverflow.ellipsis)),
      ...widget.images.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis))),
      if (_image.isNotEmpty && !widget.images.contains(_image))
        DropdownMenuItem(value: _image, child: Text('$_image (tiada dalam Images)', overflow: TextOverflow.ellipsis)),
    ];

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('ID $id', style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
              const Spacer(),
              if (status != null && status.isNotEmpty)
                Text(status, style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B7280))),
            ],
          ),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (context, c) {
            final isNarrow = c.maxWidth < 380;
            final imageField = DropdownButtonFormField<String>(
              key: ValueKey(_image),
              initialValue: _image.isEmpty ? '' : _image,
              isExpanded: true,
              items: imageItems,
              onChanged: widget.imagesLoading
                  ? null
                  : (v) {
                      setState(() => _image = (v ?? '').trim());
                      _emitChange();
                    },
              decoration: InputDecoration(
                labelText: 'Imej',
                isDense: true,
                border: const OutlineInputBorder(),
                helperText: widget.imagesLoading ? 'Memuatkan images…' : null,
              ),
            );

            if (isNarrow) {
              return Column(
                children: [
                  imageField,
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Tempoh (s)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                        ),
                        StepperField(
                          label: null,
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
                  ),
                ],
              );
            }
            return Row(
              children: [
                Expanded(child: imageField),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Tempoh (s)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                      ),
                      StepperField(
                        label: null,
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
                ),
              ],
            );
          }),
          const SizedBox(height: 12),
          const Text('Paparan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
          const SizedBox(height: 6),
          Wrap(
            spacing: 12,
            runSpacing: 0,
            children: [
              _paparanCheckbox('date', 'Tarikh'),
              _paparanCheckbox('solat-time', 'Waktu solat penuh'),
              _paparanCheckbox('solat-time-small', 'Waktu solat seterusnya'),
              _paparanCheckbox('marquee', 'Hebahan bar'),
            ],
          ),
        ],
      ),
    );
  }
}

