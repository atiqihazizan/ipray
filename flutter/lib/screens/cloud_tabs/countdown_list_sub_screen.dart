import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/list_sub_screen_app_bar_actions.dart';

class CountdownListSubScreen extends StatefulWidget {
  const CountdownListSubScreen({
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
        builder: (context) => CountdownListSubScreen(
          config: config,
          socketService: socketService,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<CountdownListSubScreen> createState() => _CountdownListSubScreenState();
}

class _CountdownListSubScreenState extends State<CountdownListSubScreen> {
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
  void didUpdateWidget(covariant CountdownListSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.socketService != widget.socketService || oldWidget.config != widget.config) {
      _disposeSocketBindings();
      _rows = <Map<String, dynamic>>[];
      _initSocketAndLoad();
      return;
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _loadCountdowns();
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
      _loadCountdowns();
    } else {
      _readySub?.cancel();
      _readySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        _loadCountdowns();
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
    await _loadCountdowns();
  }

  Future<void> _loadCountdowns() async {
    final svc = _socketService;
    if (svc == null) return;
    if (mounted) setState(() => _loading = true);
    try {
      final result = await svc.fetchData('countdowns');
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
        title: const Text('Countdown'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          ListSubScreenAppBarActions(
            onAdd: _showAddDialog,
            onRefresh: _loadCountdowns,
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
                      'Tiada data countdown.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_rows.length * 2 - 1, (i) {
                      if (i.isOdd) return Divider(height: 1, thickness: 1, color: Colors.grey.shade200);
                      final row = _rows[i ~/ 2];
                      return _CountdownRowTile(
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
    final result = await showDialog<_CountdownDraft>(
      context: context,
      builder: (ctx) => _CountdownDialog(
        title: 'Tambah Countdown',
        initial: const _CountdownDraft(),
      ),
    );
    if (result == null) return;
    final raw = _CountdownDraft.buildRaw(result);
    if (raw == null) return;
    await svc.insertRow('countdowns', {'raw': raw}, position: 'end');
    await _loadCountdowns();
  }

  Future<void> _showEditDialog(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;

    final initial = _CountdownDraft.fromRow(row);
    final result = await showDialog<_CountdownDraft>(
      context: context,
      builder: (ctx) => _CountdownDialog(
        title: 'Edit Countdown',
        initial: initial,
      ),
    );
    if (result == null) return;
    final raw = _CountdownDraft.buildRaw(result);
    if (raw == null) return;
    await svc.updateRow('countdowns', id, {'raw': raw});
    await _loadCountdowns();
  }

  Future<void> _confirmDelete(Map<String, dynamic> row) async {
    final svc = _socketService;
    if (svc == null) return;
    final idRaw = row['id'];
    final id = idRaw is int ? idRaw : int.tryParse(idRaw?.toString() ?? '');
    if (id == null) return;
    final event = (row['event']?.toString() ?? '').trim();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Padam Countdown'),
        content: Text(event.isEmpty ? 'Padam countdown ID $id?' : 'Padam "$event" (ID $id)?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Padam')),
        ],
      ),
    );
    if (ok != true) return;
    await svc.deleteRow('countdowns', id);
    await _loadCountdowns();
  }
}

class _CountdownRowTile extends StatelessWidget {
  const _CountdownRowTile({
    required this.row,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> row;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  String _formatLabel(String raw) {
    switch (raw.toLowerCase()) {
      case 'hijri':
        return 'Hijri (ulang)';
      case 'masihi':
        return 'Masihi (ulang)';
      default:
        return 'Tarikh tetap';
    }
  }

  String _formatDdMmmYy(String input) {
    final s = input.trim();
    if (s.isEmpty) return '-';
    // Expect: YYYY-MM-DD or YYYY-MM-DD HH:mm
    final datePart = s.length >= 10 ? s.substring(0, 10) : s;
    final parts = datePart.split('-');
    if (parts.length != 3) return s;
    final y = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    final d = int.tryParse(parts[2]);
    if (y == null || m == null || d == null) return s;
    if (m < 1 || m > 12 || d < 1 || d > 31) return s;
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
    final yy = (y % 100).toString().padLeft(2, '0');
    final dd = d.toString().padLeft(2, '0');
    final mmm = months[m - 1].toUpperCase().toUpperCase();
    return '$dd $mmm $yy';
  }

  String _hijriMonthMmm(String monthRaw) {
    final m = int.tryParse(monthRaw.trim());
    const map = <int, String>{
      1: 'Muh', // Muharram
      2: 'Saf', // Safar
      3: 'Raw', // Rabiulawal
      4: 'Rth', // Rabiulakhir
      5: 'Jaw', // Jamadilawal
      6: 'Jth', // Jamadilakhir
      7: 'Raj', // Rejab
      8: 'Sha', // Syaaban
      9: 'Ram', // Ramadan
      10: 'Shw', // Syawal
      11: 'Dhq', // Zulkaedah
      12: 'Dhh', // Zulhijjah
    };
    return map[m] ?? monthRaw.trim();
  }

  String _masihiMonthMmm(String monthRaw) {
    final m = int.tryParse(monthRaw.trim());
    const months = <int, String>{
      1: 'Jan',
      2: 'Feb',
      3: 'Mar',
      4: 'Apr',
      5: 'May',
      6: 'Jun',
      7: 'Jul',
      8: 'Aug',
      9: 'Sep',
      10: 'Oct',
      11: 'Nov',
      12: 'Dec',
    };
    return months[m] ?? monthRaw.trim();
  }

  String _dateLabel() {
    final format = (row['format']?.toString() ?? 'date').toLowerCase();
    if (format == 'date') {
      final date = (row['date']?.toString() ?? '').trim();
      return _formatDdMmmYy(date);
    }
    final tahun = (row['tahun']?.toString() ?? '').trim();
    final bulan = (row['bulan']?.toString() ?? '').trim();
    final hari = (row['hari']?.toString() ?? '').trim();
    if (format == 'hijri') {
      final y = tahun.isEmpty ? '' : ' $tahun H';
      // return '$hari-$bulan-$y';
      return '$hari ${_hijriMonthMmm(bulan).toUpperCase()}$y';
    }
    return '$hari ${_masihiMonthMmm(bulan).toUpperCase()}';
  }

  @override
  Widget build(BuildContext context) {
    final event = (row['event']?.toString() ?? '').trim();
    final windowDays = (row['windowDays']?.toString() ?? '').trim();
    final format = (row['format']?.toString() ?? 'date').toLowerCase();

    final leading = Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(color: Color(0xFFF0F0F0), shape: BoxShape.circle),
      child: Center(
        child: Text(
          format == 'hijri' ? '🕌' : (format == 'masihi' ? '📅' : '⏳'),
          style: const TextStyle(fontSize: 22),
        ),
      ),
    );

    final titleText = event.isEmpty ? '(Tanpa tajuk)' : event;
    // final row1 = 'ID $id • ${_formatLabel(format)} • ${_dateLabel()}';
    final row1 = '${_formatLabel(format)} • ${_dateLabel()}';
    final row2 = 'Disiar ${windowDays.isEmpty ? '0' : windowDays} hari';

    return Padding(
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
                // Title full width
                Text(
                  titleText.toUpperCase(),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                // Subtitle 2 row
                // Text(
                //   row1,
                //   style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.2),
                //   maxLines: 1,
                //   overflow: TextOverflow.ellipsis,
                // ),
                // const SizedBox(height: 2),
                // 2 column: kiri 2 row, kanan action
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row1,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.2),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            row2,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.2),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          // constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                          icon: const Icon(Icons.edit, color: Color(0xFF2563EB), size: 20),
                          onPressed: onEdit,
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          // constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                          icon: const Icon(Icons.delete, color: Color(0xFFDC2626), size: 20),
                          onPressed: onDelete,
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
  }
}

class _CountdownDraft {
  const _CountdownDraft({
    this.format = 'date',
    this.date = '',
    this.tahun = '',
    this.bulan = '',
    this.hari = '',
    this.event = '',
    this.windowDays = '',
  });

  final String format;
  final String date;
  final String tahun;
  final String bulan;
  final String hari;
  final String event;
  final String windowDays;

  _CountdownDraft copyWith({
    String? format,
    String? date,
    String? tahun,
    String? bulan,
    String? hari,
    String? event,
    String? windowDays,
  }) {
    return _CountdownDraft(
      format: format ?? this.format,
      date: date ?? this.date,
      tahun: tahun ?? this.tahun,
      bulan: bulan ?? this.bulan,
      hari: hari ?? this.hari,
      event: event ?? this.event,
      windowDays: windowDays ?? this.windowDays,
    );
  }

  static _CountdownDraft fromRow(Map<String, dynamic> row) {
    return _CountdownDraft(
      format: (row['format']?.toString() ?? 'date').toLowerCase(),
      date: row['date']?.toString() ?? '',
      tahun: row['tahun']?.toString() ?? '',
      bulan: row['bulan']?.toString() ?? '',
      hari: row['hari']?.toString() ?? '',
      event: row['event']?.toString() ?? '',
      windowDays: row['windowDays']?.toString() ?? '',
    );
  }

  static String? buildRaw(_CountdownDraft d) {
    final event = d.event.trim();
    if (event.isEmpty) return null;
    final format = d.format.toLowerCase();
    final windowDays = d.windowDays.trim();
    if (format == 'hijri') {
      final tahun = d.tahun.trim();
      final bulan = d.bulan.trim();
      final hari = d.hari.trim();
      if (bulan.isEmpty || hari.isEmpty) return null;
      return 'COUNTDOWN_HIJRI|$tahun|$bulan|$hari|$event|$windowDays';
    }
    if (format == 'masihi') {
      final bulan = d.bulan.trim();
      final hari = d.hari.trim();
      if (bulan.isEmpty || hari.isEmpty) return null;
      return 'COUNTDOWN_MASIHI|$bulan|$hari|$event|$windowDays';
    }
    final date = d.date.trim();
    if (date.isEmpty) return null;
    return 'COUNTDOWN|$date|$event|$windowDays';
  }
}

class _CountdownDialog extends StatefulWidget {
  const _CountdownDialog({
    required this.title,
    required this.initial,
  });

  final String title;
  final _CountdownDraft initial;

  @override
  State<_CountdownDialog> createState() => _CountdownDialogState();
}

class _CountdownDialogState extends State<_CountdownDialog> {
  late String _format;
  late final TextEditingController _dateCtrl;
  late final TextEditingController _tahunCtrl;
  late final TextEditingController _bulanCtrl;
  late final TextEditingController _hariCtrl;
  late final TextEditingController _eventCtrl;
  late final TextEditingController _windowDaysCtrl;

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (pickedDate == null) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now),
    );

    final dt = (pickedTime == null)
        ? DateTime(pickedDate.year, pickedDate.month, pickedDate.day)
        : DateTime(pickedDate.year, pickedDate.month, pickedDate.day, pickedTime.hour, pickedTime.minute);

    final yyyy = dt.year.toString().padLeft(4, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    if (pickedTime == null) {
      _dateCtrl.text = '$yyyy-$mm-$dd';
      return;
    }
    final hh = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    _dateCtrl.text = '$yyyy-$mm-$dd $hh:$mi';
  }

  @override
  void initState() {
    super.initState();
    _format = widget.initial.format;
    _dateCtrl = TextEditingController(text: widget.initial.date);
    _tahunCtrl = TextEditingController(text: widget.initial.tahun);
    _bulanCtrl = TextEditingController(text: widget.initial.bulan);
    _hariCtrl = TextEditingController(text: widget.initial.hari);
    _eventCtrl = TextEditingController(text: widget.initial.event);
    _windowDaysCtrl = TextEditingController(text: widget.initial.windowDays);
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _tahunCtrl.dispose();
    _bulanCtrl.dispose();
    _hariCtrl.dispose();
    _eventCtrl.dispose();
    _windowDaysCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDate = _format == 'date';
    final isHijri = _format == 'hijri';
    final isMasihi = _format == 'masihi';

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                key: ValueKey(_format),
                initialValue: _format,
                items: const [
                  DropdownMenuItem(value: 'date', child: Text('Tarikh tetap')),
                  DropdownMenuItem(value: 'masihi', child: Text('Masihi (ulang)')),
                  DropdownMenuItem(value: 'hijri', child: Text('Hijri (ulang)')),
                ],
                onChanged: (v) => setState(() => _format = v ?? 'date'),
                decoration: const InputDecoration(
                  labelText: 'Format',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 10),
              if (isDate)
                TextField(
                  controller: _dateCtrl,
                  readOnly: true,
                  onTap: _pickDateTime,
                  decoration: const InputDecoration(
                    labelText: 'Tarikh & Masa',
                    hintText: 'Tekan untuk pilih',
                    isDense: true,
                    suffixIcon: Icon(Icons.calendar_month_rounded, size: 20),
                  ),
                ),
              if (isHijri)
                Row(
                  children: [
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
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _bulanCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Bulan',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _hariCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Hari',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
              if (isMasihi)
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _bulanCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Bulan',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _hariCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Hari',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 10),
              TextField(
                controller: _eventCtrl,
                decoration: const InputDecoration(
                  labelText: 'Acara',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _windowDaysCtrl,
                decoration: const InputDecoration(
                  labelText: 'Disiar (hari) (0 = bila-bila)',
                  isDense: true,
                ),
                keyboardType: TextInputType.number,
              ),
              if (isDate || isHijri || isMasihi) const SizedBox(height: 2),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
        FilledButton(
          onPressed: () {
            final draft = _CountdownDraft(
              format: _format,
              date: _dateCtrl.text,
              tahun: _tahunCtrl.text,
              bulan: _bulanCtrl.text,
              hari: _hariCtrl.text,
              event: _eventCtrl.text,
              windowDays: _windowDaysCtrl.text,
            );
            Navigator.pop(context, draft);
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}

