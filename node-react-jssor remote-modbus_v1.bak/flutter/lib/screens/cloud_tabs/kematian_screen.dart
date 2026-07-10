import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/stepper_field.dart';

/// Sub-skrin Kematian (1 page sahaja, tiada sub page).
class KematianScreen extends StatefulWidget {
  const KematianScreen({
    super.key,
    required this.config,
    this.socketService,
  });

  final AppConfig config;
  final CloudSocketService? socketService;

  @override
  State<KematianScreen> createState() => _KematianScreenState();
}

class _KematianScreenState extends State<KematianScreen> {
  final _namaCtrl = TextEditingController();
  final _tarikhCtrl = TextEditingController();
  final _masaCtrl = TextEditingController();
  final _tempatCtrl = TextEditingController();
  final _masaSolatCtrl = TextEditingController();
  final _maklumatCtrl = TextEditingController();
  int _durasiMinit = 0;

  bool _showTarikh = true;
  bool _showJamKecil = true;
  bool _showMarquee = true;

  bool _isActive = false;
  bool _saving = false;
  int? _kematianEndMs;
  Timer? _countdownTimer;
  int _remainingSec = 0;

  CloudSocketService? _socketService;
  bool _ownsSocket = false;
  StreamSubscription<void>? _readySub;
  StreamSubscription<Map<String, dynamic>>? _kematianUpdatedSub;
  StreamSubscription<Map<String, dynamic>>? _kematianClearedSub;
  StreamSubscription<Map<String, dynamic>>? _kematianOverlayConfigSub;
  StreamSubscription<bool>? _cloudConnSub;
  Timer? _reconnectTimer;

  Future<bool> _ensureSocketReady() async {
    final svc = _socketService;
    if (svc == null) return false;
    if (!svc.isConnected) {
      svc.connect();
    }
    if (svc.isReady) return true;
    try {
      await svc.onReadyStream.first.timeout(const Duration(seconds: 8));
    } catch (_) {}
    return svc.isReady;
  }

  @override
  void initState() {
    super.initState();
    _initSocket();
  }

  void _initSocket() {
    _socketService = widget.socketService;
    if (_socketService == null) {
      _ownsSocket = true;
      _socketService = CloudSocketService(config: widget.config);
      _socketService!.connect();
    }

    _bindConnectionListener();

    if (_socketService!.isReady) {
      _loadOverlayConfig();
      _bindKematianStatusListeners();
      _socketService?.requestKematianStatus();
    } else {
      _readySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        _loadOverlayConfig();
        _bindKematianStatusListeners();
        _socketService?.requestKematianStatus();
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
      // Sambung semula secara automatik (debounce) bila disconnect/failed.
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        svc.reconnect();
      });
    });
  }

  Future<void> _reloadKematian() async {
    await _ensureSocketReady();
    await _loadOverlayConfig();
    _socketService?.requestKematianStatus();
  }

  void _bindKematianStatusListeners() {
    _kematianUpdatedSub?.cancel();
    _kematianClearedSub?.cancel();
    _kematianOverlayConfigSub?.cancel();
    final svc = _socketService;
    if (svc == null) return;

    _kematianUpdatedSub = svc.kematianUpdatedStream.listen((payload) {
      if (!mounted) return;
      setState(() => _isActive = true);

      // Isi semula form jika payload ada (snapshot/status dari nodejs).
      final nama = payload['nama']?.toString();
      if ((nama ?? '').trim().isNotEmpty) _namaCtrl.text = nama!.trim();
      _tarikhCtrl.text = payload['tarikhMeninggal']?.toString() ?? _tarikhCtrl.text;
      _masaCtrl.text = payload['masaMeninggal']?.toString() ?? _masaCtrl.text;
      _tempatCtrl.text = payload['tempatJenazah']?.toString() ?? _tempatCtrl.text;
      _masaSolatCtrl.text = payload['masaSolat']?.toString() ?? _masaSolatCtrl.text;
      _maklumatCtrl.text = payload['maklumatTambahan']?.toString() ?? _maklumatCtrl.text;

      final durasiSaat = payload['durasiSaat'];
      final durasiInt = durasiSaat is int ? durasiSaat : int.tryParse(durasiSaat?.toString() ?? '');
      if (durasiInt != null) {
        setState(() => _durasiMinit = (durasiInt <= 0) ? 0 : (durasiInt / 60).round());
      }
      _startCountdownIfNeeded(payload, durasiInt);

      final overlayRaw = payload['overlayConfig'];
      if (overlayRaw is Map) {
        final overlay = Map<String, dynamic>.from(overlayRaw);
        setState(() {
          _showTarikh = overlay['showDate'] == true;
          _showJamKecil = overlay['showSmallTime'] == true;
          _showMarquee = overlay['showMarquee'] == true;
        });
      }
    });

    _kematianClearedSub = svc.kematianClearedStream.listen((payload) {
      if (!mounted) return;
      _stopCountdown();
      setState(() {
        _isActive = false;
        _durasiMinit = 0;
      });
    });

    _kematianOverlayConfigSub = svc.kematianOverlayConfigStream.listen((payload) {
      if (!mounted) return;
      final overlayRaw = payload['overlayConfig'];
      if (overlayRaw is! Map) return;
      final overlay = Map<String, dynamic>.from(overlayRaw);
      setState(() {
        _showTarikh = overlay['showDate'] == true;
        _showJamKecil = overlay['showSmallTime'] == true;
        _showMarquee = overlay['showMarquee'] == true;
      });
    });
  }

  void _startCountdownIfNeeded(Map<String, dynamic> payload, int? durasiSaat) {
    _stopCountdown();
    if (durasiSaat == null || durasiSaat <= 0) return;
    final tsRaw = payload['timestamp'];
    final ts = tsRaw is int ? tsRaw : int.tryParse(tsRaw?.toString() ?? '');
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    var startMs = (() {
      if (ts == null) return nowMs;
      // Server kadang-kadang hantar timestamp dalam saat (10 digit) bukan ms (13 digit).
      if (ts < 1000000000000) return ts * 1000;
      return ts;
    })();
    // Elak timestamp "ke hadapan" (clock skew) daripada menambah baki.
    if (startMs > nowMs) startMs = nowMs;
    _kematianEndMs = startMs + durasiSaat * 1000;

    void tick() {
      final end = _kematianEndMs;
      if (end == null) return;
      final remainMs = end - DateTime.now().millisecondsSinceEpoch;
      // Paparan countdown biasanya mula pada durasi-1 (cth 60s → papar 00:59).
      final remain = (remainMs / 1000).ceil() ;
      if (remain <= 0) {
        _stopCountdown();
        if (mounted) setState(() => _remainingSec = 0);
        return;
      }
      if (mounted) setState(() => _remainingSec = remain);
    }

    tick();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  void _stopCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    _kematianEndMs = null;
    _remainingSec = 0;
  }

  @override
  void dispose() {
    _readySub?.cancel();
    _kematianUpdatedSub?.cancel();
    _kematianClearedSub?.cancel();
    _kematianOverlayConfigSub?.cancel();
    _cloudConnSub?.cancel();
    _reconnectTimer?.cancel();
    _stopCountdown();
    if (_ownsSocket) {
      _socketService?.dispose();
    }
    _namaCtrl.dispose();
    _tarikhCtrl.dispose();
    _masaCtrl.dispose();
    _tempatCtrl.dispose();
    _masaSolatCtrl.dispose();
    _maklumatCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOverlayConfig() async {
    final svc = _socketService;
    if (svc == null) return;
    try {
      final result = await svc.fetchData('config');
      int bits;

      Map<String, dynamic>? findRow(String key) {
        for (final row in result.data) {
          if (row['key']?.toString() == key) {
            return row;
          }
        }
        return null;
      }

      final kematianRow = findRow('KEMATIAN_SHOW');
      if (kematianRow != null) {
        final raw = kematianRow['value']?.toString();
        final n = int.tryParse(raw ?? '');
        if (n != null && n >= 0 && n <= 7) {
          bits = n;
        } else {
          bits = 7;
        }
      } else {
        bool flag(String key) {
          final row = findRow(key);
          final v = row?['value']?.toString() ?? '';
          return v == 'true' || v == '1';
        }

        int tempBits = 0;
        if (flag('KEMATIAN_SHOW_DATE')) tempBits |= 1;
        if (flag('KEMATIAN_SHOW_SMALLTIME')) tempBits |= 2;
        if (flag('KEMATIAN_SHOW_MARQUEE')) tempBits |= 4;
        bits = tempBits == 0 ? 7 : tempBits;
      }

      if (!mounted) return;
      setState(() {
        _showTarikh = (bits & 1) != 0;
        _showJamKecil = (bits & 2) != 0;
        _showMarquee = (bits & 4) != 0;
      });
    } catch (_) {
      // Jika gagal, kekalkan default (semua true).
    }
  }

  Future<void> _saveOverlayConfig() async {
    final svc = _socketService;
    if (svc == null) return;
    int bits = 0;
    if (_showTarikh) bits |= 1;
    if (_showJamKecil) bits |= 2;
    if (_showMarquee) bits |= 4;
    try {
      await svc.saveConfigItem('KEMATIAN_SHOW', bits.toString());
    } catch (_) {}
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final initial = now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      _tarikhCtrl.text = '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
    }
  }

  Future<void> _pickTime() async {
    final now = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: now,
    );
    if (picked != null) {
      final hour = picked.hourOfPeriod == 0 ? 12 : picked.hourOfPeriod;
      final minute = picked.minute.toString().padLeft(2, '0');
      final period = picked.period == DayPeriod.am ? 'AM' : 'PM';
      _masaCtrl.text = '${hour.toString().padLeft(2, '0')}:$minute $period';
    }
  }

  Future<void> _handleToggle() async {
    if (_isActive) {
      await _handleClear();
    } else {
      await _handlePublish();
    }
  }

  Future<void> _handlePublish() async {
    if (_saving) return;
    final svc = _socketService;
    final ready = await _ensureSocketReady();
    if (svc == null || !ready) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Socket belum bersedia. Sila tunggu seketika dan cuba semula.')),
      );
      return;
    }
    final nama = _namaCtrl.text.trim();
    if (nama.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sila masukkan nama simati.')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final durasiSaat = (_durasiMinit > 0) ? _durasiMinit * 60 : 0;

      final overlayConfig = <String, dynamic>{
        'showDate': _showTarikh,
        'showSmallTime': _showJamKecil,
        'showMarquee': _showMarquee,
      };

      final data = <String, dynamic>{
        'nama': nama,
        'tarikhMeninggal': _tarikhCtrl.text.trim(),
        'masaMeninggal': _masaCtrl.text.trim(),
        'tempatJenazah': _tempatCtrl.text.trim(),
        'masaSolat': _masaSolatCtrl.text.trim(),
        'maklumatTambahan': _maklumatCtrl.text.trim(),
        'durasiSaat': durasiSaat,
        'overlayConfig': overlayConfig,
      };

      svc.emitKematianUpdate(data);

      if (!mounted) return;
      setState(() {
        _isActive = true;
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _handleClear() async {
    if (_saving) return;
    final svc = _socketService;
    final ready = await _ensureSocketReady();
    if (svc == null || !ready) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Socket belum bersedia. Sila tunggu seketika dan cuba semula.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      svc.emitKematianClear();
      if (!mounted) return;
      setState(() {
        _isActive = false;
        _durasiMinit = 0;
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: RefreshIndicator(
        onRefresh: _reloadKematian,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
          Row(
            children: [
              Text(
                'Status:',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF475569),
                    ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: _isActive ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                ),
                child: Text(
                  _isActive ? 'Aktif — Sedang Dipaparkan' : 'Tidak Aktif',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: _isActive ? const Color(0xFF15803D) : const Color(0xFF64748B),
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTextField(
                  label: 'Nama Simati',
                  controller: _namaCtrl,
                  hintText: 'Allahyarham Hj. Ahmad bin Mohd',
                  enabled: !_isActive,
                ),
                // const SizedBox(height: 16),
                // Row(
                //   children: [
                //     Expanded(
                //       child: _buildTextField(
                //         label: 'Tarikh Meninggal',
                //         controller: _tarikhCtrl,
                //         readOnly: true,
                //         onTap: _pickDate,
                //         suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
                //       ),
                //     ),
                //     const SizedBox(width: 12),
                //     Expanded(
                //       child: _buildTextField(
                //         label: 'Masa Meninggal',
                //         controller: _masaCtrl,
                //         readOnly: true,
                //         onTap: _pickTime,
                //         suffixIcon: const Icon(Icons.schedule, size: 18),
                //       ),
                //     ),
                //   ],
                // ),
                const SizedBox(height: 16),
                _buildTextField(
                  label: 'Tempat Perkuburan',
                  controller: _tempatCtrl,
                  hintText: 'Masjid Tuan Abdullah',
                  enabled: !_isActive,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  label: 'Masa Solat Jenazah',
                  controller: _masaSolatCtrl,
                  hintText: 'Selepas Zohor / 16:00',
                  enabled: !_isActive,
                ),
                // const SizedBox(height: 16),
                // _buildTextField(
                //   label: 'Maklumat Tambahan',
                //   controller: _maklumatCtrl,
                //   hintText: 'Sila hadir untuk solat jenazah',
                //   maxLines: 3,
                // ),
                const SizedBox(height: 20),
                IgnorePointer(
                  ignoring: _isActive,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Durasi Paparan (minit)',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF475569),
                            ),
                      ),
                      StepperField(
                        label: null,
                        value: _durasiMinit,
                        min: 0,
                        onChanged: (v) => setState(() => _durasiMinit = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  '0 = kekal sehingga padam manual',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                if (_isActive && _remainingSec > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Baki: ${(_remainingSec ~/ 60).toString().padLeft(2, '0')}:${(_remainingSec % 60).toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFEF4444)),
                  ),
                ],
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Paparan Overlay Semasa Pengumuman',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 16,
                        runSpacing: 8,
                        children: [
                          _OverlayCheck(
                            label: 'Tarikh',
                            value: _showTarikh,
                            onChanged: (v) {
                              setState(() => _showTarikh = v);
                              unawaited(_saveOverlayConfig());
                            },
                          ),
                          _OverlayCheck(
                            label: 'Jam Kecil',
                            value: _showJamKecil,
                            onChanged: (v) {
                              setState(() => _showJamKecil = v);
                              unawaited(_saveOverlayConfig());
                            },
                          ),
                          _OverlayCheck(
                            label: 'Marquee',
                            value: _showMarquee,
                            onChanged: (v) {
                              setState(() => _showMarquee = v);
                              unawaited(_saveOverlayConfig());
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _saving ? null : _handleToggle,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: _isActive ? const Color(0xFFEF4444) : const Color(0xFF22C55E),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      _isActive ? 'Padam Pengumuman' : 'Papar Pengumuman',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    String? hintText,
    int maxLines = 1,
    bool readOnly = false,
    bool enabled = true,
    VoidCallback? onTap,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: const Color(0xFF475569),
              ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          readOnly: readOnly,
          enabled: enabled,
          maxLines: maxLines,
          onTap: onTap,
          decoration: InputDecoration(
            hintText: hintText,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            suffixIcon: suffixIcon,
          ),
        ),
      ],
    );
  }
}

class _OverlayCheck extends StatelessWidget {
  const _OverlayCheck({
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
                  color: const Color(0xFF475569),
                ),
          ),
        ],
      ),
    );
  }
}
