import 'package:flutter/material.dart';

import 'dart:async';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';

class _LivestreamItem {
  const _LivestreamItem({
    required this.id,
    required this.title,
    required this.urlOrIp,
    required this.type,
  });

  final int id;
  final String title;
  final String urlOrIp;
  final String type; // contoh: youtube, hls, mp4, webm, rtsp
}

/// Sub-skrin Siaran Langsung (1 page sahaja, tiada sub page).
class LivestreamScreen extends StatefulWidget {
  const LivestreamScreen({
    super.key,
    required this.config,
    this.socketService,
  });

  final AppConfig config;
  final CloudSocketService? socketService;

  @override
  State<LivestreamScreen> createState() => _LivestreamScreenState();
}

const int _overlayBitDate = 1;
const int _overlayBitSmallTime = 2;
const int _overlayBitMarquee = 4;
const int _overlayDefaultBits = 7;
const String _livestreamShowKey = 'LIVESTREAM_SHOW';

class _LivestreamScreenState extends State<LivestreamScreen> {
  bool _isLiveActive = false;
  bool _showTarikh = true;
  bool _showJamKecil = true;
  bool _showMarquee = true;

  CloudSocketService? _socketService;
  StreamSubscription<void>? _readySub;
  StreamSubscription<Map<String, dynamic>>? _liveStartedSub;
  StreamSubscription<Map<String, dynamic>>? _liveStoppedSub;
  bool _ownsSocket = false;

  bool _loading = false;
  String? _error;
  List<_LivestreamItem> _items = <_LivestreamItem>[];

  @override
  void initState() {
    super.initState();
    _initSocketAndLoad();
  }

  void _initSocketAndLoad() {
    _socketService = widget.socketService;
    if (_socketService == null) {
      _ownsSocket = true;
      _socketService = CloudSocketService(config: widget.config);
      _socketService!.connect();
    }

    if (_socketService!.isReady) {
      unawaited(_loadLivestreamData());
      _bindLiveStatusListeners();
      _socketService?.requestLivestreamStatus();
      return;
    }

    _readySub?.cancel();
    _readySub = _socketService!.onReadyStream.listen((_) {
      if (!mounted) return;
      unawaited(_loadLivestreamData());
      _bindLiveStatusListeners();
      _socketService?.requestLivestreamStatus();
    });
  }

  void _bindLiveStatusListeners() {
    _liveStartedSub?.cancel();
    _liveStoppedSub?.cancel();
    final svc = _socketService;
    if (svc == null) return;

    _liveStartedSub = svc.liveStartedStream.listen((payload) {
      if (!mounted) return;
      setState(() => _isLiveActive = true);
    });
    _liveStoppedSub = svc.liveStoppedStream.listen((payload) {
      if (!mounted) return;
      setState(() => _isLiveActive = false);
    });
  }

  Future<void> _loadOverlayConfig() async {
    final svc = _socketService;
    if (svc == null) return;
    try {
      final result = await svc.fetchData('config');
      for (final row in result.data) {
        if (row['key'] == _livestreamShowKey) {
          final raw = row['value']?.toString() ?? '';
          int bits = _overlayDefaultBits;
          if (raw.isNotEmpty) {
            final n = int.tryParse(raw);
            if (n != null && n >= 0 && n <= 7) bits = n;
          }
          if (!mounted) return;
          setState(() {
            _showTarikh = (bits & _overlayBitDate) != 0;
            _showJamKecil = (bits & _overlayBitSmallTime) != 0;
            _showMarquee = (bits & _overlayBitMarquee) != 0;
          });
          return;
        }
      }
    } catch (_) {}
  }

  Future<void> _saveOverlayConfig(bool showTarikh, bool showJamKecil, bool showMarquee) async {
    final svc = _socketService;
    if (svc == null) return;
    int bits = 0;
    if (showTarikh) bits |= _overlayBitDate;
    if (showJamKecil) bits |= _overlayBitSmallTime;
    if (showMarquee) bits |= _overlayBitMarquee;
    try {
      await svc.saveConfigItem(_livestreamShowKey, bits.toString());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Paparan overlay disimpan'), duration: Duration(seconds: 2)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal simpan overlay: $e')),
      );
    }
  }

  @override
  void dispose() {
    _readySub?.cancel();
    _liveStartedSub?.cancel();
    _liveStoppedSub?.cancel();
    if (_ownsSocket) _socketService?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: RefreshIndicator(
        onRefresh: _loadLivestreamData,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            _TopBar(
              isLiveActive: _isLiveActive,
              onAdd: _onAddPressed,
              onRefresh: _onRefreshPressed,
            ),
            const SizedBox(height: 12),
            _OverlayCard(
              showTarikh: _showTarikh,
              showJamKecil: _showJamKecil,
              showMarquee: _showMarquee,
              onChangedTarikh: (v) {
                setState(() => _showTarikh = v);
                unawaited(_saveOverlayConfig(v, _showJamKecil, _showMarquee));
              },
              onChangedJamKecil: (v) {
                setState(() => _showJamKecil = v);
                unawaited(_saveOverlayConfig(_showTarikh, v, _showMarquee));
              },
              onChangedMarquee: (v) {
                setState(() => _showMarquee = v);
                unawaited(_saveOverlayConfig(_showTarikh, _showJamKecil, v));
              },
            ),
            const SizedBox(height: 12),
            // Info format URL tidak diperlukan buat masa ini.
            // Simpan untuk kegunaan kedepan.
            // _InfoCard(
            //   borderColor: Theme.of(context).colorScheme.primary.withAlpha((0.25 * 255).toInt()),
            // ),
            // const SizedBox(height: 16),
            if (_loading) const _LoadingCard(),
            if (_error != null) _ErrorCard(message: _error!, onRetry: _loadLivestreamData),
            if (!_loading && _error == null && _items.isEmpty) const _EmptyCard(),
            if (!_loading && _error == null && _isLiveActive)
              _LiveActiveStopCard(
                onStop: _onStopPressed,
              )
            else if (!_loading && _error == null && _items.isNotEmpty)
              _LivestreamTable(
                items: _items,
                isLiveActive: _isLiveActive,
                onStart: _onStartPressed,
                onStop: _onStopPressed,
                onEdit: _onEditPressed,
                onDelete: _onDeletePressed,
              ),
          ],
        ),
      ),
    );
  }

  void _onAddPressed() {
    unawaited(_openAddEditDialog());
  }

  void _onRefreshPressed() {
    unawaited(_loadLivestreamData());
  }

  void _onStartPressed(_LivestreamItem item) {
    final svc = _socketService;
    if (svc == null || !svc.isConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Socket tidak disambung. Sila tunggu dan cuba semula.')),
      );
      return;
    }
    final url = item.urlOrIp.trim();
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL kosong. Sila kemaskini baris ini terlebih dahulu.')),
      );
      return;
    }
    svc.emitLivestreamStart({
      'url': url,
      'title': item.title.trim(),
      'overlayConfig': {
        'showDate': _showTarikh,
        'showSmallTime': _showJamKecil,
        'showMarquee': _showMarquee,
      },
    });
    setState(() => _isLiveActive = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Memulakan siaran: ${item.title}')),
    );
  }

  void _onStopPressed() {
    final svc = _socketService;
    if (svc == null || !svc.isConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Socket tidak disambung. Sila tunggu dan cuba semula.')),
      );
      return;
    }
    svc.emitLivestreamStop();
    setState(() => _isLiveActive = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Siaran dihentikan.')),
    );
  }

  void _onEditPressed(_LivestreamItem item) {
    unawaited(_openAddEditDialog(existing: item));
  }

  void _onDeletePressed(_LivestreamItem item) {
    unawaited(_confirmAndDelete(item));
  }

  Future<void> _loadLivestreamData() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      if (!svc.isConnected) svc.connect();
      final result = await svc.fetchData('livestream');
      final next = <_LivestreamItem>[];
      for (final row in result.data) {
        final id = int.tryParse(row['id']?.toString() ?? '') ?? 0;
        final tajuk = row['tajuk']?.toString() ?? '';
        final url = row['url']?.toString() ?? '';
        final jenis = row['jenis']?.toString() ?? '';
        if (id <= 0) continue;
        next.add(_LivestreamItem(
          id: id,
          title: tajuk,
          urlOrIp: url,
          type: jenis,
        ));
      }
      if (!mounted) return;
      setState(() {
        _items = next;
        _loading = false;
      });
      unawaited(_loadOverlayConfig());
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _openAddEditDialog({_LivestreamItem? existing}) async {
    final svc = _socketService;
    if (svc == null) return;

    final result = await showDialog<_LivestreamFormResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _LivestreamEditDialog(existing: existing),
    );
    if (result == null) return;
    if (!mounted) return;

    try {
      if (!svc.isConnected) svc.connect();
      if (existing == null) {
        await svc.insertRow('livestream', {
          'tajuk': result.tajuk,
          'url': result.url,
          'jenis': result.jenis,
        });
      } else {
        await svc.updateRow('livestream', existing.id, {
          'tajuk': result.tajuk,
          'url': result.url,
          'jenis': result.jenis,
        });
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(existing == null ? 'Berjaya tambah siaran.' : 'Berjaya kemas kini siaran.')),
      );
      await _loadLivestreamData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal simpan: $e')),
      );
    }
  }

  Future<void> _confirmAndDelete(_LivestreamItem item) async {
    final svc = _socketService;
    if (svc == null) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Padam Baris #${item.id}?'),
        content: Text('Anda pasti mahu padam "${item.title.isEmpty ? '-' : item.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Padam'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (!mounted) return;

    try {
      if (!svc.isConnected) svc.connect();
      await svc.deleteRow('livestream', item.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Berjaya padam siaran.')),
      );
      await _loadLivestreamData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal padam: $e')),
      );
    }
  }
}

class _LivestreamFormResult {
  const _LivestreamFormResult({
    required this.tajuk,
    required this.url,
    required this.jenis,
  });

  final String tajuk;
  final String url;
  final String jenis;
}

class _LivestreamJenisOption {
  const _LivestreamJenisOption(this.value, this.label);
  final String value;
  final String label;
}

class _LivestreamEditDialog extends StatefulWidget {
  const _LivestreamEditDialog({this.existing});

  final _LivestreamItem? existing;

  @override
  State<_LivestreamEditDialog> createState() => _LivestreamEditDialogState();
}

class _LivestreamEditDialogState extends State<_LivestreamEditDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _tajukCtrl;
  late final TextEditingController _urlCtrl;
  String? _jenis;
  bool _saving = false;

  static const List<_LivestreamJenisOption> _options = [
    _LivestreamJenisOption('youtube', 'YouTube'),
    _LivestreamJenisOption('facebook', 'Facebook'),
    _LivestreamJenisOption('hls', 'HLS (.m3u8)'),
    _LivestreamJenisOption('video', 'Video (.mp4 / .webm)'),
  ];

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _tajukCtrl = TextEditingController(text: existing?.title ?? '');
    _urlCtrl = TextEditingController(text: existing?.urlOrIp ?? '');
    final rawJenis = (existing?.type ?? '').trim().toLowerCase();
    _jenis = _options.any((e) => e.value == rawJenis) ? rawJenis : null;
  }

  @override
  void dispose() {
    _tajukCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final existing = widget.existing;
    return AlertDialog(
      title: Row(
        children: [
          Expanded(
            child: Text(existing == null ? 'Tambah Siaran' : 'Edit Baris #${existing.id}'),
          ),
          IconButton(
            tooltip: 'Tutup',
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _tajukCtrl,
                enabled: !_saving,
                decoration: const InputDecoration(
                  labelText: 'Tajuk Siaran',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Sila isi tajuk.' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _urlCtrl,
                enabled: !_saving,
                decoration: const InputDecoration(
                  labelText: 'URL / IP Streaming',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Sila isi URL / IP.' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                value: _jenis,
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    enabled: false,
                    child: Text('— Pilih jenis —'),
                  ),
                  ..._options.map((e) => DropdownMenuItem<String?>(
                        value: e.value,
                        child: Text(e.label),
                      )),
                ],
                onChanged: _saving ? null : (v) => setState(() => _jenis = v),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Sila pilih jenis.' : null,
                decoration: const InputDecoration(
                  labelText: 'Jenis',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: _saving
              ? null
              : () async {
                  if (!(_formKey.currentState?.validate() ?? false)) return;
                  setState(() => _saving = true);
                  final tajuk = _tajukCtrl.text.trim();
                  final url = _urlCtrl.text.trim();
                  final jenis = (_jenis ?? '').trim();
                  Navigator.of(context).pop(_LivestreamFormResult(tajuk: tajuk, url: url, jenis: jenis));
                },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.isLiveActive,
    required this.onAdd,
    required this.onRefresh,
  });

  final bool isLiveActive;
  final VoidCallback onAdd;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        Text(
          'Status Siaran:',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151),
              ),
        ),
        const SizedBox(width: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isLiveActive ? const Color(0xFFDCFCE7) : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: isLiveActive ? const Color(0xFF22C55E) : const Color(0xFFE5E7EB),
            ),
          ),
          child: Text(
            isLiveActive ? 'Aktif' : 'Tidak Aktif',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isLiveActive ? const Color(0xFF166534) : const Color(0xFF6B7280),
                ),
          ),
        ),
        const Spacer(),
        if (!isLiveActive) ...[
          _SquareIconButton(
            tooltip: 'Tambah',
            icon: Icons.add,
            background: const Color(0xFF16A34A),
            foreground: Colors.white,
            onPressed: onAdd,
          ),
          const SizedBox(width: 10),
          _SquareIconButton(
            tooltip: 'Refresh',
            icon: Icons.refresh_rounded,
            background: scheme.primary,
            foreground: scheme.onPrimary,
            onPressed: onRefresh,
          ),
        ],
      ],
    );
  }
}

class _SquareIconButton extends StatelessWidget {
  const _SquareIconButton({
    required this.tooltip,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final Color background;
  final Color foreground;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(12),
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onPressed,
          child: Tooltip(
            message: tooltip,
            child: Icon(icon, color: foreground),
          ),
        ),
      ),
    );
  }
}

class _OverlayCard extends StatelessWidget {
  const _OverlayCard({
    required this.showTarikh,
    required this.showJamKecil,
    required this.showMarquee,
    required this.onChangedTarikh,
    required this.onChangedJamKecil,
    required this.onChangedMarquee,
  });

  final bool showTarikh;
  final bool showJamKecil;
  final bool showMarquee;
  final ValueChanged<bool> onChangedTarikh;
  final ValueChanged<bool> onChangedJamKecil;
  final ValueChanged<bool> onChangedMarquee;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Paparan Overlay Semasa Siaran',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1F2937),
                ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              _CheckItem(label: 'Tarikh', value: showTarikh, onChanged: onChangedTarikh),
              _CheckItem(label: 'Jam Kecil', value: showJamKecil, onChanged: onChangedJamKecil),
              _CheckItem(label: 'Marquee', value: showMarquee, onChanged: onChangedMarquee),
            ],
          ),
        ],
      ),
    );
  }
}

class _CheckItem extends StatelessWidget {
  const _CheckItem({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => onChanged(!value),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Checkbox(
            value: value,
            onChanged: (v) => onChanged(v ?? false),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: const VisualDensity(horizontal: -2, vertical: -2),
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF374151),
                ),
          ),
        ],
      ),
    );
  }
}

@pragma('vm:entry-point')
class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.borderColor});

  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(12);
    final borderSide = BorderSide(color: Colors.black.withValues(alpha: 0.06));

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: radius,
        border: Border.all(color: borderSide.color),
        boxShadow: [
          BoxShadow(
            blurRadius: 10,
            offset: const Offset(0, 6),
            color: Colors.black.withValues(alpha: 0.05),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 6, color: borderColor),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Format URL yang disokong:',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF111827),
                          ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: const [
                        _FormatChip(label: 'HLS', value: 'http://ip/stream.m3u8'),
                        _FormatChip(label: 'YouTube', value: 'https://youtube.com/watch?v=...'),
                        _FormatChip(label: 'Facebook', value: 'https://facebook.com/.../videos/...'),
                        _FormatChip(label: 'Video', value: '.mp4'),
                        _FormatChip(label: 'Video', value: '.webm'),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Tekan butang Mula pada baris yang dikehendaki untuk memulakan siaran langsung.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF4B5563),
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormatChip extends StatelessWidget {
  const _FormatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Text(
        '$label: $value',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: const Color(0xFF374151),
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _LivestreamTable extends StatelessWidget {
  const _LivestreamTable({
    required this.items,
    required this.isLiveActive,
    required this.onStart,
    required this.onStop,
    required this.onEdit,
    required this.onDelete,
  });

  final List<_LivestreamItem> items;
  final bool isLiveActive;
  final void Function(_LivestreamItem item) onStart;
  final VoidCallback onStop;
  final void Function(_LivestreamItem item) onEdit;
  final void Function(_LivestreamItem item) onDelete;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 10),
      itemBuilder: (context, idx) {
        final e = items[idx];
        return _LivestreamListTile(
          item: e,
          isLiveActive: isLiveActive,
          onStart: () => onStart(e),
          onStop: onStop,
          onEdit: () => onEdit(e),
          onDelete: () => onDelete(e),
        );
      },
    );
  }
}

class _LivestreamListTile extends StatelessWidget {
  const _LivestreamListTile({
    required this.item,
    required this.isLiveActive,
    required this.onStart,
    required this.onStop,
    required this.onEdit,
    required this.onDelete,
  });

  final _LivestreamItem item;
  final bool isLiveActive;
  final VoidCallback onStart;
  final VoidCallback onStop;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title.isEmpty ? '-' : item.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF111827),
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.urlOrIp.isEmpty ? '-' : item.urlOrIp,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF4B5563),
                        ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _TypeBadge(type: item.type),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _MiniActionButton(
                            tooltip: 'Edit',
                            icon: Icons.edit_rounded,
                            color: const Color(0xFF2563EB),
                            onPressed: onEdit,
                          ),
                          const SizedBox(width: 6),
                          _MiniActionButton(
                            tooltip: 'Padam',
                            icon: Icons.delete_outline_rounded,
                            color: const Color(0xFFEF4444),
                            onPressed: onDelete,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _PlayButtonLarge(
              isLiveActive: isLiveActive,
              onPressedPlay: onStart,
              onPressedStop: onStop,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayButtonLarge extends StatelessWidget {
  const _PlayButtonLarge({
    required this.isLiveActive,
    required this.onPressedPlay,
    required this.onPressedStop,
  });

  final bool isLiveActive;
  final VoidCallback onPressedPlay;
  final VoidCallback onPressedStop;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 56,
      height: double.infinity,
      child: Material(
        color: isLiveActive ? const Color(0xFFEF4444) : const Color(0xFF16A34A),
        borderRadius: BorderRadius.circular(16),
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: isLiveActive ? onPressedStop : onPressedPlay,
          child: Tooltip(
            message: isLiveActive ? 'Stop' : 'Mula',
            child: Center(
              child: Icon(
                isLiveActive ? Icons.stop_rounded : Icons.play_arrow_rounded,
                color: Colors.white,
                size: 34,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniActionButton extends StatelessWidget {
  const _MiniActionButton({
    required this.tooltip,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF9FAFB),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onPressed,
        child: Tooltip(
          message: tooltip,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(icon, size: 20, color: color),
          ),
        ),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final normalized = type.trim().toLowerCase();
    final label = normalized.isEmpty ? '-' : normalized;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF374151),
            ),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({
    required this.child,
    this.padding = const EdgeInsets.all(14),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
        boxShadow: [
          BoxShadow(
            blurRadius: 10,
            offset: const Offset(0, 6),
            color: Colors.black.withValues(alpha: 0.05),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _LiveActiveStopCard extends StatelessWidget {
  const _LiveActiveStopCard({required this.onStop});

  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Siaran sedang aktif',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF111827),
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tekan Stop untuk hentikan siaran.',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF4B5563),
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _PlayButtonLarge(
              isLiveActive: true,
              onPressedPlay: () {},
              onPressedStop: onStop,
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return const _CardShell(
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 12),
          Text('Memuat data siaran langsung...'),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard();

  @override
  Widget build(BuildContext context) {
    return const _CardShell(
      child: Text('Tiada data siaran langsung.'),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Gagal get data: $message',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 10),
          TextButton(
            onPressed: () => unawaited(onRetry()),
            child: const Text('Cuba lagi'),
          ),
        ],
      ),
    );
  }
}
