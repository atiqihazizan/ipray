import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:http/http.dart' as http;

import '../../config/app_config.dart';
import '../../services/cloud_socket_service.dart';
import '../../widgets/panel_tab_screen.dart';
import '../../widgets/stepper_field.dart';

/// Screen sub-config: memaparkan kandungan satu tab Konfigurasi (ada Back).
///
/// Semua logic sub-config (socket, load config/hebahan/slides/takwim, dan UI panel)
/// berada di sini. `ConfigScreen` hanya senarai tab/menu.
class ConfigSubScreen extends StatefulWidget {
  const ConfigSubScreen({
    super.key,
    required this.config,
    this.socketService,
    this.initialConfigData,
    this.configLoading = false,
    required this.tabId,
    required this.title,
    this.refreshTrigger = 0,
  });

  final AppConfig? config;
  final CloudSocketService? socketService;
  final Map<String, String>? initialConfigData;
  final bool configLoading;
  final String tabId;
  final String title;
  final int refreshTrigger;

  static Future<void> push(
    BuildContext context, {
    required AppConfig? config,
    CloudSocketService? socketService,
    Map<String, String>? initialConfigData,
    bool configLoading = false,
    required String tabId,
    required String title,
    int refreshTrigger = 0,
  }) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ConfigSubScreen(
          config: config,
          socketService: socketService,
          initialConfigData: initialConfigData,
          configLoading: configLoading,
          tabId: tabId,
          title: title,
          refreshTrigger: refreshTrigger,
        ),
      ),
    );
  }

  @override
  State<ConfigSubScreen> createState() => _ConfigSubScreenState();
}

class _ConfigSubScreenState extends State<ConfigSubScreen> {
  /// Susunan slides: A, B, atau C (rujukan slides panel).
  String _slidesOrder = 'A';

  /// Paparan page: type → visible. Dibina dari fetchData('slides') — bukan hardcoded.
  final Map<String, bool> _slidesVisible = <String, bool>{};
  bool _slidesLoaded = false;

  /// Pemisah mesej marquee (simbol/emoji terpilih).
  String _marqueeSeparator = '•';

  Map<String, String> _configData = {};
  List<_HebahanRow> _hebahanData = [];
  CloudSocketService? _socketService;
  StreamSubscription<void>? _onReadySub;

  /// State untuk home overlay checkboxes
  Map<String, bool> _homeOverlayOptions = {};
  bool _homeOverlayLoaded = false;

  String _takwimZone = 'PNG01';
  Map<String, String> _takwimZoneMap = const {'PNG01': 'PNG01'};
  bool _takwimSyncing = false;

  bool _configLoading = false;
  bool _hebahanLoading = false;
  bool _hebahanLoaded = false;

  @override
  void initState() {
    super.initState();
    // _applyConfigDefaults();
    _loadTakwimZones();
    _socketService = widget.socketService;
    _configData = Map<String, String>.from(widget.initialConfigData ?? const {});
    _configLoading = widget.configLoading;
    if (_configData.isNotEmpty) _applyConfigDefaults();

    // Fallback: jika skrin ini dipanggil tanpa `socketService` dari ConfigScreen.
    if (_socketService == null && widget.config != null) {
      _configLoading = true;
      _socketService = CloudSocketService(config: widget.config!);
      _socketService!.connect();
    }

    // Listen "ready" untuk:
    // - bebaskan loading jika parent masih loading ketika user masuk sub
    // - load data tab yang perlukan socket (slides/hebahan) bila socket sudah siap
    if (_socketService != null) {
      _onReadySub = _socketService!.onReadyStream.listen((_) {
        if (!mounted) return;
        if (_configLoading) setState(() => _configLoading = false);

        // Jika config belum dipass dari ConfigScreen, barulah fetch di sini.
        if (_configData.isEmpty) _loadConfigData();

        if (widget.tabId == 'hebahan') _loadHebahanData();
        if (widget.tabId == 'slides') _loadSlidesData();
        if (widget.tabId == 'title-home') _loadHomeOverlayData();
      });

      // Penting: `onReadyStream` tidak replay. Kalau socket dah ready sebelum screen ini subscribe,
      // terus load data tab (slides/hebahan) supaya list tidak kosong.
      if (_socketService!.isReady) {
        Future.microtask(() {
          if (!mounted) return;
          if (_configLoading) setState(() => _configLoading = false);
          if (widget.tabId == 'hebahan') _loadHebahanData();
          if (widget.tabId == 'slides') _loadSlidesData();
          if (widget.tabId == 'title-home') _loadHomeOverlayData();
        });
      }
    }
  }

  @override
  void dispose() {
    _onReadySub?.cancel();
    // Jika socket datang dari ConfigScreen, ConfigScreen yang akan dispose.
    if (widget.socketService == null) _socketService?.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant ConfigSubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialConfigData != widget.initialConfigData && widget.initialConfigData != null) {
      setState(() {
        _configData = Map<String, String>.from(widget.initialConfigData!);
        _applyConfigDefaults();
      });
    }
    if (oldWidget.configLoading != widget.configLoading) {
      setState(() => _configLoading = widget.configLoading);
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      // Dalam flow baru, ConfigScreen patut reload dan pass semula.
      // Fallback jika tiada data dipass.
      if (widget.initialConfigData == null) _loadConfigData();
      if (widget.tabId == 'hebahan') _loadHebahanData();
      if (widget.tabId == 'slides') _loadSlidesData();
    }
  }

  Future<void> _loadConfigData() async {
    if (_socketService == null) return;
    setState(() => _configLoading = true);
    try {
      final result = await _socketService!.fetchData('config');
      final map = <String, String>{};
      for (final row in result.data) {
        final k = row['key']?.toString();
        final v = row['value']?.toString();
        if (k != null && k.isNotEmpty) map[k] = v ?? '';
      }
      if (!mounted) return;
      setState(() {
        _configData = map;
        _configLoading = false;
        _applyConfigDefaults();
      });
      _loadTakwimZones();
      _loadSlidesData(); // selaras SLIDES_VISIBLE/ORDER
    } catch (_) {
      if (mounted) setState(() => _configLoading = false);
    }
  }

  void _applyConfigDefaults() {
    _configData['MARQUEE_DURATION'] ??= '25';
    _configData['MARQUEE_SEPARATOR'] ??= '•';
    _configData['MARQUEE_SHOW_MOSQUE_NAME'] ??= 'true';
    _configData['HOME_TITLE_VISIBLE'] ??= 'true';
    _configData['HOME_TITLE_DURATION_SEC'] ??= '10';
    _configData['HOME_TITLE1_TOP'] ??= '480';
    _configData['HOME_TITLE_LEFT'] ??= '28';
    _configData['HOME_TITLE_RIGHT'] ??= '0';
    _configData['HOME_TITLE_GAP'] ??= '30';
    _configData['HOME_TITLE_ALIGN'] ??= 'center';
    _configData['HOME_TITLE1_SIZE'] ??= '68';
    _configData['HOME_TITLE1_COLOR'] ??= '#00FFFF';
    _configData['HOME_TITLE2_SIZE'] ??= '68';
    _configData['HOME_TITLE2_COLOR'] ??= '#00FFFF';
    _configData['WARNING_START_MINUTES'] ??= '5';
    _configData['IQAMAH_DURATION_MIN'] ??= '10';
    _configData['SOLAT_DURATION_MIN'] ??= '10';
    _takwimZone = _configData['TAKWIM_ZONE'] ?? _takwimZone;
    if ((_configData['MARQUEE_SEPARATOR'] ?? '').isNotEmpty) {
      _marqueeSeparator = _configData['MARQUEE_SEPARATOR']!;
    }
    final order = _configData['SLIDES_ORDER'] ?? 'A';
    if (order.isNotEmpty) _slidesOrder = order;
  }

  Future<void> _loadSlidesData() async {
    if (_socketService == null) return;
    try {
      final result = await _socketService!.fetchData('slides');
      final types = <String>[];
      for (final row in result.data) {
        final type = (row['type']?.toString() ?? '').trim();
        if (type.isNotEmpty) types.add(type);
      }
      if (types.isEmpty) return;
      if (!mounted) return;

      final visibleRaw = _configData['SLIDES_VISIBLE'];
      List<int>? visibleArray;
      if (visibleRaw != null && visibleRaw.isNotEmpty) {
        try {
          final parsed = jsonDecode(visibleRaw);
          if (parsed is List && parsed.length == types.length) {
            visibleArray = parsed.map<int>((v) => (v == 1 || v == '1') ? 1 : 0).toList();
          }
        } catch (_) {}
      }
      visibleArray ??= List.generate(types.length, (_) => 1);
      if (visibleArray.isNotEmpty) visibleArray[0] = 1;

      setState(() {
        _slidesVisible
          ..clear()
          ..addEntries([
            for (var i = 0; i < types.length; i++)
              MapEntry(types[i], visibleArray![i] == 1),
          ]);
        _slidesLoaded = true;
      });
    } catch (_) {}
  }

  Future<void> _loadHebahanData() async {
    if (_socketService == null) return;
    if (_hebahanLoading) return;
    setState(() => _hebahanLoading = true);
    try {
      final result = await _socketService!.fetchData('hebahan');
      final list = <_HebahanRow>[];
      for (final row in result.data) {
        final id = row['id'];
        final idInt = id is int ? id : int.tryParse(id?.toString() ?? '0');
        list.add(_HebahanRow(
          id: idInt ?? list.length + 1,
          teks: row['text']?.toString() ?? '',
          tarikhMula: row['startDate']?.toString(),
          tarikhAkhir: row['endDate']?.toString(),
        ));
      }
      if (!mounted) return;
      setState(() {
        _hebahanData = list;
        _hebahanLoading = false;
        _hebahanLoaded = true;
      });
    } catch (_) {
      if (mounted) setState(() => _hebahanLoading = false);
    } finally {
      if (mounted && _hebahanLoading) setState(() => _hebahanLoading = false);
    }
  }

  Future<void> _loadTakwimZones() async {
    const jakimZonesUrl = 'https://api.waktusolat.app/zones';
    try {
      final resp = await http.get(Uri.parse(jakimZonesUrl));
      if (resp.statusCode != 200) return;
      final List<dynamic> zones = jsonDecode(resp.body) as List<dynamic>;
      final map = <String, String>{};
      for (final z in zones) {
        if (z is! Map<String, dynamic>) continue;
        final code = (z['jakimCode'] ?? z['code'] ?? z['zone'])?.toString();
        if (code == null || code.isEmpty) continue;
        final negeri = (z['negeri'] ?? z['state'] ?? '').toString();
        final daerah = (z['daerah'] ?? z['district'] ?? z['name'] ?? '').toString();
        final label = daerah.isNotEmpty ? '$code - $negeri - $daerah' : '$code - $negeri';
        map[code] = label.trim().isEmpty ? code : label;
      }
      if (map.isEmpty) return;
      if (!mounted) return;
      setState(() => _takwimZoneMap = map);
    } catch (_) {}
  }

  String _config(String key, [String fallback = '']) => _configData[key] ?? fallback;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Container(
        color: const Color(0xFFF5F5F5),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: _buildConfigPanelContent(widget.tabId, widget.title),
        ),
      ),
    );
  }

  List<Widget> _buildConfigPanelContent(String selectedTabId, String selectedTitle) {
    if (selectedTabId == 'hebahan' && _socketService != null && !_hebahanLoaded && !_hebahanLoading) {
      _loadHebahanData();
    }
    switch (selectedTabId) {
      case 'title-home':
        return _buildTitleHomePanelContent();
      case 'waktu-solat':
        return _buildWaktuSolatPanelContent();
      case 'slides':
        return _buildSlidesPanelContent();
      case 'hebahan':
        return _buildHebahanPanelContent();
      case 'takwim':
        return _buildTakwimPanelContent();
      case 'masa-sistem':
        return _buildMasaSistemPanelContent();
      case 'system':
        return _buildSystemPanelContent();
      default:
        return [
          PanelTabSectionHeader('KANDUNGAN'),
          PanelTabCard(
            children: [
              PanelTabRowLabel('Tetapan untuk "$selectedTitle" akan dipaparkan di sini.'),
            ],
          ),
        ];
    }
  }

  List<Widget> _buildTitleHomePanelContent() {
    if (_configLoading) {
      return [
        const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ),
        ),
      ];
    }

    if (!_slidesLoaded && _socketService != null) {
      _loadSlidesData();
    }

    final homeTitleVisible = _config('HOME_TITLE_VISIBLE', 'true') == 'true' || _config('HOME_TITLE_VISIBLE') == '1';
    final homeTitleTop = _config('HOME_TITLE1_TOP', '480');
    final homeTitleLeft = _config('HOME_TITLE_LEFT', '28');
    final homeTitleRight = _config('HOME_TITLE_RIGHT', '0');
    final homeTitleGap = _config('HOME_TITLE_GAP', '30');
    final homeTitleAlignRaw = _config('HOME_TITLE_ALIGN', 'center');
    final homeTitle1Size = _config('HOME_TITLE1_SIZE', '68');
    final homeTitle1ColorHex = _config('HOME_TITLE1_COLOR', '#00FFFF');
    final homeTitle2Size = _config('HOME_TITLE2_SIZE', '68');
    final homeTitle2ColorHex = _config('HOME_TITLE2_COLOR', '#00FFFF');

    String _alignLabelFromValue(String value) {
      switch (value) {
        case 'left':
          return 'Kiri';
        case 'right':
          return 'Kanan';
        case 'center':
        default:
          return 'Tengah';
      }
    }

    String _alignValueFromLabel(String label) {
      switch (label) {
        case 'Kiri':
          return 'left';
        case 'Kanan':
          return 'right';
        case 'Tengah':
        default:
          return 'center';
      }
    }

    final homeTitleAlignLabel = _alignLabelFromValue(homeTitleAlignRaw);

    return [
      PanelTabSectionHeader('PAPARAN TAJUK HOME'),
      PanelTabCard(
        children: [
          PanelTabRowToggle(
            label: 'Tajuk Home',
            value: homeTitleVisible,
            onChanged: (value) {
              final stringValue = value ? 'true' : 'false';
              setState(() {
                _configData['HOME_TITLE_VISIBLE'] = stringValue;
              });
              _socketService?.saveConfigItem('HOME_TITLE_VISIBLE', stringValue);
            },
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tempoh Paparan (saat)',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                ),
                StepperField(
                  label: null,
                  value: int.tryParse(_config('HOME_TITLE_DURATION_SEC', '10')) ?? 10,
                  min: 1,
                  onChanged: (v) {
                    final value = v.toString();
                    setState(() {
                      _configData['HOME_TITLE_DURATION_SEC'] = value;
                    });
                    _socketService?.saveConfigItem('HOME_TITLE_DURATION_SEC', value);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('PAPARAN TEKS SKRIN UTAMA - KOTAK TEKS'),
      PanelTabCard(
        children: [
          PanelTabRowInput(
            label: 'Posisi Atas (px)',
            initialValue: homeTitleTop,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '480' : text.trim();
              setState(() {
                _configData['HOME_TITLE1_TOP'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE1_TOP', value);
            },
          ),
          PanelTabRowInput(
            label: 'Posisi Kiri (px)',
            initialValue: homeTitleLeft,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '28' : text.trim();
              setState(() {
                _configData['HOME_TITLE_LEFT'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE_LEFT', value);
            },
          ),
          PanelTabRowInput(
            label: 'Posisi Kanan (px)',
            initialValue: homeTitleRight,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '0' : text.trim();
              setState(() {
                _configData['HOME_TITLE_RIGHT'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE_RIGHT', value);
            },
          ),
          PanelTabRowInput(
            label: 'Gap Teks (px)',
            initialValue: homeTitleGap,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '30' : text.trim();
              setState(() {
                _configData['HOME_TITLE_GAP'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE_GAP', value);
            },
          ),
          PanelTabRowDropdown(
            label: 'Penjajaran',
            value: homeTitleAlignLabel,
            items: const ['Kiri', 'Tengah', 'Kanan'],
            onChanged: (label) {
              final alignValue = _alignValueFromLabel(label ?? 'Tengah');
              setState(() {
                _configData['HOME_TITLE_ALIGN'] = alignValue;
              });
              _socketService?.saveConfigItem('HOME_TITLE_ALIGN', alignValue);
            },
          ),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('PAPARAN TEKS SKRIN UTAMA - TEKS PERTAMA'),
      PanelTabCard(
        children: [
          PanelTabRowInput(
            label: 'Saiz Font (px)',
            initialValue: homeTitle1Size,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '68' : text.trim();
              setState(() {
                _configData['HOME_TITLE1_SIZE'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE1_SIZE', value);
            },
          ),
          PanelTabRowColor(
            label: 'Warna Teks',
            initialColor: _parseHexColor(homeTitle1ColorHex),
            initialHex: homeTitle1ColorHex,
            onChanged: (color) {
              final hex = '#${color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
              setState(() {
                _configData['HOME_TITLE1_COLOR'] = hex;
              });
              _socketService?.saveConfigItem('HOME_TITLE1_COLOR', hex);
            },
          ),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('PAPARAN TEKS SKRIN UTAMA - TEKS KEDUA'),
      PanelTabCard(
        children: [
          PanelTabRowInput(
            label: 'Saiz Font (px)',
            initialValue: homeTitle2Size,
            unit: 'px',
            isNumeric: true,
            onChanged: (text) {
              final value = text.trim().isEmpty ? '68' : text.trim();
              setState(() {
                _configData['HOME_TITLE2_SIZE'] = value;
              });
              _socketService?.saveConfigItem('HOME_TITLE2_SIZE', value);
            },
          ),
          PanelTabRowColor(
            label: 'Warna Teks',
            initialColor: _parseHexColor(homeTitle2ColorHex),
            initialHex: homeTitle2ColorHex,
            onChanged: (color) {
              final hex = '#${color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
              setState(() {
                _configData['HOME_TITLE2_COLOR'] = hex;
              });
              _socketService?.saveConfigItem('HOME_TITLE2_COLOR', hex);
            },
          ),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('PAPARAN OVERLAY SKRIN HOME'),
      _buildHomeOverlayCheckboxesCard(),
    ];
  }

  /// Panel Waktu Solat (rujukan: webmobile config-tabs/waktu-solat.html).
  List<Widget> _buildWaktuSolatPanelContent() {
    return [
      if (_configLoading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
      PanelTabSectionHeader('WAKTU SOLAT - KONFIGURASI MASA'),
      PanelTabCard(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Durasi Sebelum Azan',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                ),
                StepperField(
                  label: null,
                  value: int.tryParse(_config('WARNING_START_MINUTES', '5')) ?? 5,
                  min: 1,
                  onChanged: (v) {
                    final value = v.toString();
                    setState(() => _configData['WARNING_START_MINUTES'] = value);
                    _socketService?.saveConfigItem('WARNING_START_MINUTES', value);
                  },
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Durasi Sebelum Iqamah',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                ),
                StepperField(
                  label: null,
                  value: int.tryParse(_config('IQAMAH_DURATION_MIN', '10')) ?? 10,
                  min: int.tryParse(_config('WARNING_START_MINUTES', '1')) ?? 1,
                  onChanged: (v) {
                    final value = v.toString();
                    setState(() => _configData['IQAMAH_DURATION_MIN'] = value);
                    _socketService?.saveConfigItem('IQAMAH_DURATION_MIN', value);
                  },
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Durasi Solat',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                ),
                StepperField(
                  label: null,
                  value: int.tryParse(_config('SOLAT_DURATION_MIN', '10')) ?? 10,
                  min: int.tryParse(_config('IQAMAH_DURATION_MIN', '1')) ?? 1,
                  onChanged: (v) {
                    final value = v.toString();
                    setState(() => _configData['SOLAT_DURATION_MIN'] = value);
                    _socketService?.saveConfigItem('SOLAT_DURATION_MIN', value);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('WAKTU SOLAT - WARNA'),
      PanelTabCard(
        children: [
          PanelTabRowColor(
            label: 'Masa Semasa',
            initialColor: _parseHexColor(_config('COLOR_CURRENT_TIME', '#FFFF00')),
            initialHex: _config('COLOR_CURRENT_TIME', '#FFFF00'),
            onChanged: (c) => _handleColorChanged('COLOR_CURRENT_TIME', c),
          ),
          PanelTabRowColor(
            label: 'Waktu Solat',
            initialColor: _parseHexColor(_config('COLOR_DEFAULT', '#FFFF00')),
            initialHex: _config('COLOR_DEFAULT', '#FFFF00'),
            onChanged: (c) => _handleColorChanged('COLOR_DEFAULT', c),
          ),
          PanelTabRowColor(
            label: 'Next Prayer Color',
            initialColor: _parseHexColor(_config('COLOR_NEXT_PRAYER', '#000000')),
            initialHex: _config('COLOR_NEXT_PRAYER', '#000000'),
            onChanged: (c) => _handleColorChanged('COLOR_NEXT_PRAYER', c),
          ),
          PanelTabRowColor(
            label: 'Warning Prayer Color',
            initialColor: _parseHexColor(_config('COLOR_WARNING_PRAYER', '#000000')),
            initialHex: _config('COLOR_WARNING_PRAYER', '#000000'),
            onChanged: (c) => _handleColorChanged('COLOR_WARNING_PRAYER', c),
          ),
          _buildOverlayBgColorRow(),
        ],
      ),
    ];
  }

  /// Panel Paparan/Slides — gaya seperti imej: kad A/B/C + checkbox paparan page.
  List<Widget> _buildSlidesPanelContent() {
    return [
      PanelTabSectionHeader('TETAPAN SUSUNAN SLIDES'),
      _buildSlidesOrderCard('A', 'Home → Pengumuman → Kuliah → Slideshow'),
      const SizedBox(height: 10),
      _buildSlidesOrderCard('B', 'Home → [Kumpulan Diacak]'),
      const SizedBox(height: 10),
      _buildSlidesOrderCard('C', 'Home → [Semua Slides Diacak]'),
      const SizedBox(height: 20),
      PanelTabSectionHeader('PAPARAN PAGE'),
      _buildSlidesVisibleCard(),
    ];
  }

  Widget _buildSlidesOrderCard(String option, String description) {
    final isActive = _slidesOrder == option;
    return Material(
      color: isActive ? const Color(0xFF3B82F6) : Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.08),
      child: InkWell(
        onTap: () => _handleSelectSlidesOrder(option),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: isActive ? null : Border.all(color: const Color(0xFF374151), width: 2),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    option,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isActive ? Colors.white : const Color(0xFF374151),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12,
                      color: isActive ? Colors.white.withOpacity(0.95) : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
              if (isActive)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.15),
                          offset: const Offset(3, 5),
                          blurRadius: 0,
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check, size: 12, color: Colors.white),
                        SizedBox(width: 4),
                        Text('Aktif', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.03)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSlidesVisibleCard() {
    if (!_slidesLoaded || _slidesVisible.isEmpty) {
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Text('Memuatkan senarai slides...', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
        ),
      );
    }
    final entries = _slidesVisible.entries.toList();
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            for (var i = 0; i < entries.length; i++) ...[
              if (i == 0) const SizedBox.shrink()
              else ...[
                Divider(height: 1, thickness: 1, color: Colors.grey.shade100),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: Checkbox(
                          value: entries[i].value,
                          onChanged: (v) => _handleToggleSlidesVisible(entries[i].key, v ?? false),
                          activeColor: const Color(0xFF212121),
                          fillColor: WidgetStateProperty.resolveWith((states) {
                            if (states.contains(WidgetState.selected)) return const Color(0xFF212121);
                            return null;
                          }),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        entries[i].key,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  void _handleSelectSlidesOrder(String option) {
    if (_socketService == null) {
      setState(() => _slidesOrder = option);
      return;
    }
    setState(() => _slidesOrder = option);
    _socketService!.saveConfigItem('SLIDES_ORDER', option);
  }

  void _handleToggleSlidesVisible(String key, bool value) {
    setState(() => _slidesVisible[key] = value);
    if (_socketService == null) return;
    final keys = _slidesVisible.keys.toList();
    final list = <int>[];
    for (final k in keys) {
      list.add(_slidesVisible[k] == true ? 1 : 0);
    }
    final raw = '[${list.join(',')}]';
    _socketService!.saveConfigItem('SLIDES_VISIBLE', raw);
  }

  /// Panel Hebahan (rujukan: webmobile config-tabs/hebahan.html).
  List<Widget> _buildHebahanPanelContent() {
    final showMosque = _config('MARQUEE_SHOW_MOSQUE_NAME', 'true') == 'true' || _config('MARQUEE_SHOW_MOSQUE_NAME') == '1';
    return [
      PanelTabSectionHeader('TETAPAN MARQUEE'),
      PanelTabCard(
        children: [
          PanelTabRowToggle(
            label: 'Tunjuk nama masjid',
            value: showMosque,
            onChanged: _handleToggleShowMosque,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Kelajuan (saat per pusingan)',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                ),
                StepperField(
                  label: null,
                  value: int.tryParse(_config('MARQUEE_DURATION', '25')) ?? 25,
                  min: 1,
                  onChanged: (v) {
                    final value = v.toString();
                    setState(() => _configData['MARQUEE_DURATION'] = value);
                    _socketService?.saveConfigItem('MARQUEE_DURATION', value);
                  },
                ),
              ],
            ),
          ),
          _buildPemisahMesejRow(),
        ],
      ),
      const SizedBox(height: 20),
      PanelTabSectionHeader('DATA HEBAHAN'),
      _buildDataHebahanCard(),
    ];
  }

  void _handleToggleShowMosque(bool value) {
    final stringValue = value ? 'true' : 'false';
    setState(() {
      _configData['MARQUEE_SHOW_MOSQUE_NAME'] = stringValue;
    });
    _socketService?.saveConfigItem('MARQUEE_SHOW_MOSQUE_NAME', stringValue);
  }

  void _handleMarqueeDurationChanged(String text) {
    final trimmed = text.trim();
    final value = trimmed.isEmpty ? '25' : trimmed;
    setState(() {
      _configData['MARQUEE_DURATION'] = value;
    });
    _socketService?.saveConfigItem('MARQUEE_DURATION', value);
  }

  void _handleWarningStartMinutesChanged(String text) {
    final trimmed = text.trim();
    if (_socketService == null) {
      setState(() => _configData['WARNING_START_MINUTES'] = trimmed);
      return;
    }
    final n = double.tryParse(trimmed);
    final value = (n == null || n < 1) ? '1' : n.toString();
    setState(() => _configData['WARNING_START_MINUTES'] = value);
    _socketService!.saveConfigItem('WARNING_START_MINUTES', value);
  }

  // void _handleIqamahDurationChanged(String text) {
  //   final trimmed = text.trim();
  //   final warning = double.tryParse(_config('WARNING_START_MINUTES', '1')) ?? 1;
  //   final n = double.tryParse(trimmed) ?? warning;
  //   final value = n < warning ? warning.toString() : n.toString();
  //   setState(() => _configData['IQAMAH_DURATION_MIN'] = value);
  //   _socketService?.saveConfigItem('IQAMAH_DURATION_MIN', value);
  // }

  // void _handleSolatDurationChanged(String text) {
  //   final trimmed = text.trim();
  //   final iqamah = double.tryParse(_config('IQAMAH_DURATION_MIN', '1')) ?? 1;
  //   final n = double.tryParse(trimmed) ?? iqamah;
  //   final value = n < iqamah ? iqamah.toString() : n.toString();
  //   setState(() => _configData['SOLAT_DURATION_MIN'] = value);
  //   _socketService?.saveConfigItem('SOLAT_DURATION_MIN', value);
  // }

  Color _parseHexColor(String hex) {
    var v = hex.trim();
    if (!v.startsWith('#')) v = '#$v';
    if (v.length == 7) {
      v = '#FF${v.substring(1)}';
    }
    try {
      return Color(int.parse(v.substring(1), radix: 16));
    } catch (_) {
      return const Color(0xFFFFEB3B); // fallback kuning
    }
  }

  void _handleColorChanged(String key, Color color) {
    final hex = '#${color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    setState(() => _configData[key] = hex);
    _socketService?.saveConfigItem(key, hex);
  }

  Widget _buildPemisahMesejRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Pemisah Mesej',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        Material(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            onTap: () => _showEmojiPicker(context),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Text(_marqueeSeparator, style: const TextStyle(fontSize: 22)),
            ),
          ),
        ),
      ],
    );
  }

  void _showEmojiPicker(BuildContext context) {
    final controller = TextEditingController(text: _marqueeSeparator);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(ctx).size.height * 0.6,
        decoration: const BoxDecoration(
          color: Color(0xFFF2F2F2),
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Pilih emoji', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            Expanded(
              child: EmojiPicker(
                textEditingController: controller,
                onEmojiSelected: (category, emoji) {
                  final value = emoji.emoji;
                  setState(() {
                    _marqueeSeparator = value;
                    _configData['MARQUEE_SEPARATOR'] = value;
                  });
                  _socketService?.saveConfigItem('MARQUEE_SEPARATOR', value);
                  Navigator.pop(ctx);
                },
                config: const Config(
                  height: 280,
                  checkPlatformCompatibility: false,
                  emojiViewConfig: EmojiViewConfig(
                    columns: 7,
                    emojiSizeMax: 28,
                    backgroundColor: Color(0xFFF2F2F2),
                  ),
                  categoryViewConfig: CategoryViewConfig(
                    initCategory: Category.SMILEYS,
                    indicatorColor: Color(0xFF3B82F6),
                    iconColor: Colors.grey,
                    iconColorSelected: Color(0xFF3B82F6),
                    backgroundColor: Color(0xFFF2F2F2),
                  ),
                  bottomActionBarConfig: BottomActionBarConfig(
                    showBackspaceButton: false,
                    showSearchViewButton: true,
                    backgroundColor: Color(0xFF3B82F6),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ).whenComplete(controller.dispose);
  }


  /// Kad DATA HEBAHAN: tajuk + butang Tambah/Muat Semula + jadual (ID, TEKS, TARIKH MULA, TARIKH AKHIR, TINDAKAN).
  Widget _buildDataHebahanCard() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.06),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 0),
              child: Row(
                children: [
                  const Text(
                    'DATA HEBAHAN',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  const Spacer(),
                  Material(
                    color: const Color(0xFF22C55E),
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      onTap: _showAddHebahanDialog,
                      borderRadius: BorderRadius.circular(8),
                      child: const Padding(
                        padding: EdgeInsets.all(3),
                        child: Icon(Icons.add, color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: const Color(0xFF374151),
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: () => _loadHebahanData(),
                      customBorder: const CircleBorder(),
                      child: const Padding(
                        padding: EdgeInsets.all(3),
                        child: Icon(Icons.refresh, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (_hebahanLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              SizedBox(
                height: 260,
                child: ReorderableListView.builder(
                  itemCount: _hebahanData.length,
                  onReorder: _onReorderHebahan,
                  buildDefaultDragHandles: true,
                  padding: const EdgeInsets.only(bottom: 8),
                  itemBuilder: (ctx, index) {
                    final row = _hebahanData[index];
                    return ListTile(
                      key: ValueKey(row.id),
                      dense: true,
                      title: Text(
                        '${row.id}. ${row.teks}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF1F2937)),
                      ),
                      subtitle: Text(
                        '${row.tarikhMula ?? '-'}  →  ${row.tarikhAkhir ?? '-'}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, color: Color(0xFF2563EB), size: 20),
                            onPressed: () => _showEditHebahanDialog(row),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Color(0xFFDC2626), size: 20),
                            onPressed: () => _confirmDeleteHebahan(row),
                          ),
                          const ReorderableDragStartListener(
                            index: 0, // nilai ini akan diabaikan oleh builder
                            child: Icon(Icons.drag_handle, color: Color(0xFF9CA3AF)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      // child: Padding(
      //   padding: const EdgeInsets.all(16),
      // ),
    );
  }

  /// Panel Takwim (rujukan: webmobile config-tabs/takwim.html).
  List<Widget> _buildTakwimPanelContent() {
    final zoneMap = _takwimZoneMap;
    final selectedCode = zoneMap.containsKey(_takwimZone) ? _takwimZone : zoneMap.keys.first;
    final selectedLabel = zoneMap[selectedCode] ?? selectedCode;
    final detailText = selectedLabel.replaceFirst('$selectedCode - ', '');
    return [
      PanelTabSectionHeader('ZON JAKIM'),
      PanelTabCard(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _showZonePicker(zoneMap, selectedCode),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F7FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      selectedCode,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      detailText != selectedCode ? detailText : '',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF374151), height: 1.3),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  // const Icon(Icons.unfold_more_rounded, size: 20, color: Color(0xFF6B7280)),
                ],
              ),
            ),
          ),
          // const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _handleSyncTakwimFromJakim,
                  icon: const Icon(Icons.sync_rounded, size: 18),
                  label: Text(_takwimSyncing ? 'Sedang sync...' : 'Kemaskini Zon', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ];
  }

  void _showZonePicker(Map<String, String> zoneMap, String currentCode) {
    final searchController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final query = searchController.text.toLowerCase();
            final filtered = zoneMap.entries.where((e) {
              if (query.isEmpty) return true;
              return e.key.toLowerCase().contains(query) || e.value.toLowerCase().contains(query);
            }).toList();
            return DraggableScrollableSheet(
              initialChildSize: 0.65,
              maxChildSize: 0.9,
              minChildSize: 0.4,
              expand: false,
              builder: (ctx, scrollController) {
                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Column(
                        children: [
                          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                          const SizedBox(height: 12),
                          const Text('Pilih Zon JAKIM', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 10),
                          TextField(
                            controller: searchController,
                            onChanged: (_) => setSheetState(() {}),
                            decoration: InputDecoration(
                              hintText: 'Cari zon...',
                              hintStyle: const TextStyle(fontSize: 13),
                              prefixIcon: const Icon(Icons.search, size: 20),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.separated(
                        controller: scrollController,
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (ctx, i) {
                          final entry = filtered[i];
                          final isSelected = entry.key == currentCode;
                          return ListTile(
                            dense: true,
                            selected: isSelected,
                            selectedTileColor: const Color(0xFFEFF6FF),
                            leading: Text(
                              entry.key,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF1F2937),
                              ),
                            ),
                            title: Text(
                              entry.value.replaceFirst('${entry.key} - ', ''),
                              style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
                            ),
                            trailing: isSelected ? const Icon(Icons.check_circle, color: Color(0xFF2563EB), size: 20) : null,
                            onTap: () {
                              setState(() => _takwimZone = entry.key);
                              Navigator.of(ctx).pop();
                            },
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  /// Panel Masa Sistem (rujukan: webmobile config-tabs/masa-sistem.html).
  List<Widget> _buildMasaSistemPanelContent() {
    final now = DateTime.now();
    final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}T${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    return [
      PanelTabSectionHeader('MASA SISTEM (RASPBERRY PI)'),
      PanelTabCard(
        children: [
          PanelTabRowLabel('Update tarikh & masa pada mesin. Selepas berjaya, paparan kiosk akan dimuat semula.'),
          PanelTabRowInput(label: 'Tarikh & Masa', initialValue: dateStr, unit: ''),
          _panelRowButton(label: 'Set Masa Mesin', buttonLabel: 'Set Masa Mesin', onPressed: () {}),
          _panelRowButton(label: 'Sync dengan Internet', buttonLabel: 'Sync dengan Internet', onPressed: () {}),
        ],
      ),
    ];
  }

  /// Panel Sistem — gaya kad amber dengan header + kandungan (rujukan image).
  List<Widget> _buildSystemPanelContent() {
    return [
      _buildSystemControlCard(
        headerIcon: Icons.volume_up_rounded,
        headerTitle: 'TEST SOUND',
        contentTitle: 'Test Audio on Kiosk',
        contentDescription: 'Mainkan bunyi ujian pada paparan kiosk untuk memastikan output audio berfungsi dengan betul.',
        buttonLabel: 'Play Sound',
        buttonIcon: Icons.play_circle_outline_rounded,
        buttonColor: const Color(0xFF2563EB),
        onPressed: _handleTestSound,
      ),
      const SizedBox(height: 20),
      _buildSystemControlCard(
        headerIcon: Icons.settings_rounded,
        headerTitle: 'SYSTEM CONTROL',
        contentTitle: 'Muat Semula Paparan Kiosk',
        contentDescription: 'Muat semula skrin kiosk untuk memastikan paparan kembali normal selepas perubahan tetapan.',
        buttonLabel: 'Reload Kiosk',
        buttonIcon: Icons.refresh_rounded,
        buttonColor: const Color(0xFFEA580C),
        onPressed: _handleRebootKiosk,
      ),
    ];
  }

  void _handleTestSound() {
    if (_socketService == null) return;
    _socketService!.emitTestSound();
  }

  void _handleRebootKiosk() {
    if (_socketService == null) return;
    _socketService!.emitRebootKiosk();
  }

  Future<void> _handleSyncTakwimFromJakim() async {
    if (_socketService == null || _takwimSyncing) return;
    setState(() => _takwimSyncing = true);
    try {
      const jakimApiBase = 'https://api.waktusolat.app/v2/solat';
      const jakimZonesUrl = 'https://api.waktusolat.app/zones';
      const hijriDataHex =
          '2B75A5B654A76A55D5AA5CA56DD495DA525DAA4DD5AA6A95B652576A4B76C93665ABAC56D94A5DA92DD525BBA49BB255D52A6DA5B65497F4926ED25669ABB495DA525DD22BBA495BA9ABB4955A4B6DA936E916EDA4AED4966A4BB5A5DAA49BB493BA525BAA4DB5AA6A556DD256EA4A6DA92ED5AA6A55B54A5BA92BB525BB549BAA55D52A6DA5AED496EC925DD255D92A6D95B6525BB24B7A493729';

      final zone = _takwimZone.isNotEmpty ? _takwimZone : 'PNG01';
      final year = DateTime.now().year;

      // Dapatkan nama zon dari API zones (jika berjaya).
      String zoneName = zone;
      try {
        final zonesResp = await http.get(Uri.parse(jakimZonesUrl));
        if (zonesResp.statusCode == 200) {
          final List<dynamic> zones = jsonDecode(zonesResp.body) as List<dynamic>;
          for (final z in zones) {
            if (z is Map<String, dynamic>) {
              final code = (z['jakimCode'] ?? z['code'] ?? z['zone'])?.toString();
              if (code == zone) {
                final negeri = (z['negeri'] ?? z['state'] ?? '').toString();
                final daerah = (z['daerah'] ?? z['district'] ?? z['name'] ?? '').toString();
                if (daerah.isNotEmpty) {
                  zoneName = '$negeri - $daerah';
                } else if (negeri.isNotEmpty) {
                  zoneName = negeri;
                }
                break;
              }
            }
          }
        }
      } catch (_) {
        // fallback kekal code sahaja
      }

      final lines = <String>[];
      lines.add('$zone - $zoneName');
      lines.add('HIJRI_DATA=$hijriDataHex');

      String _timestampToTime(int ts) {
        final d = DateTime.fromMillisecondsSinceEpoch(ts * 1000, isUtc: false);
        final h = d.hour.toString();
        final m = d.minute.toString().padLeft(2, '0');
        return '$h:$m';
      }

      for (var month = 1; month <= 12; month++) {
        final url = '$jakimApiBase/$zone?year=$year&month=$month';
        final resp = await http.get(Uri.parse(url));
        if (resp.statusCode != 200) {
          throw Exception('Gagal fetch bulan $month: HTTP ${resp.statusCode}');
        }
        final json = jsonDecode(resp.body) as Map<String, dynamic>;
        final prayers = (json['prayers'] ?? json['data'] ?? []) as List<dynamic>;
        if (prayers.isEmpty) {
          throw Exception('Tiada data untuk bulan $month');
        }
        for (final p in prayers) {
          if (p is! Map<String, dynamic>) continue;
          final day = (p['day'] ?? 1) as int;
          final dayStr = day.toString().padLeft(2, '0');
          final monthStr = month.toString().padLeft(2, '0');
          final dateGreg = '$dayStr-$monthStr-$year';
          final hijri = p['hijri'];
          String hijriStr;
          if (hijri is String && RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(hijri)) {
            final parts = hijri.split('-');
            hijriStr = '${parts[2]}-${parts[1]}-${parts[0]}';
          } else {
            final s = hijri?.toString() ?? '';
            final padded = s.padLeft(8, '0');
            hijriStr = '${padded.substring(0, 2)}-${padded.substring(2, 4)}-${padded.substring(4)}';
          }

          final imsak = _timestampToTime((p['fajr'] as int) - 10 * 60);
          final subuh = _timestampToTime(p['fajr'] as int);
          final syuruk = _timestampToTime(p['syuruk'] as int);
          final zohor = _timestampToTime(p['dhuhr'] as int);
          final asar = _timestampToTime(p['asr'] as int);
          final maghrib = _timestampToTime(p['maghrib'] as int);
          final isyak = _timestampToTime(p['isha'] as int);

          lines.add('$dateGreg $hijriStr\t$imsak\t$subuh\t$syuruk\t$zohor\t$asar\t$maghrib\t$isyak');
        }
      }

      final content = lines.join('\n');
      await _socketService!.emitWithResponse('cloud:file:save', {
        'fileName': 'takwim',
        'content': content,
      });
    } catch (_) {
      // Biar UI tetap hidup; log boleh ditambah kemudian jika perlu.
    } finally {
      if (mounted) {
        setState(() => _takwimSyncing = false);
      }
    }
  }

  Widget _buildSystemControlCard({
    required IconData headerIcon,
    required String headerTitle,
    String? contentTitle,
    String? contentDescription,
    required String buttonLabel,
    required IconData buttonIcon,
    required Color buttonColor,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDBA74), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFFEF3C7),
              borderRadius: BorderRadius.vertical(top: Radius.circular(10.5)),
            ),
            child: Row(
              children: [
                Icon(headerIcon, size: 22, color: const Color(0xFF78350F)),
                const SizedBox(width: 10),
                Text(
                  headerTitle,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF78350F),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contentTitle ?? '',
                        style: contentTitle != null ? const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ) : null,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        contentDescription ?? '',
                        style: contentDescription != null ? TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                          height: 1.4,
                        ) : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Material(
                  color: buttonColor,
                  borderRadius: BorderRadius.circular(10),
                  child: InkWell(
                    onTap: onPressed,
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(buttonIcon, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            buttonLabel,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddHebahanDialog() async {
    if (_socketService == null) return;
    final textController = TextEditingController();
    final startController = TextEditingController();
    final endController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Tambah Hebahan'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: textController,
                decoration: const InputDecoration(labelText: 'Teks hebahan'),
              ),
              TextField(
                controller: startController,
                decoration: const InputDecoration(labelText: 'Tarikh mula (YYYY-MM-DD)'),
              ),
              TextField(
                controller: endController,
                decoration: const InputDecoration(labelText: 'Tarikh akhir (YYYY-MM-DD)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        );
      },
    );
    if (result != true) return;
    final text = textController.text.trim();
    if (text.isEmpty) return;
    await _socketService!.insertHebahanRow(
      text,
      startController.text.trim(),
      endController.text.trim(),
    );
    await _loadHebahanData();
  }

  Future<void> _showEditHebahanDialog(_HebahanRow row) async {
    if (_socketService == null) return;
    final textController = TextEditingController(text: row.teks);
    final startController = TextEditingController(text: row.tarikhMula ?? '');
    final endController = TextEditingController(text: row.tarikhAkhir ?? '');
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Kemaskini Hebahan'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: textController,
                decoration: const InputDecoration(labelText: 'Teks hebahan'),
              ),
              TextField(
                controller: startController,
                decoration: const InputDecoration(labelText: 'Tarikh mula (YYYY-MM-DD)'),
              ),
              TextField(
                controller: endController,
                decoration: const InputDecoration(labelText: 'Tarikh akhir (YYYY-MM-DD)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        );
      },
    );
    if (result != true) return;
    final text = textController.text.trim();
    if (text.isEmpty) return;
    await _socketService!.updateHebahanRow(
      row.id,
      text,
      startController.text.trim(),
      endController.text.trim(),
    );
    await _loadHebahanData();
  }

  Future<void> _confirmDeleteHebahan(_HebahanRow row) async {
    if (_socketService == null) return;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Padam Hebahan'),
          content: Text('Padam hebahan ID ${row.id}?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Padam')),
          ],
        );
      },
    );
    if (result != true) return;
    await _socketService!.deleteRow('hebahan', row.id);
    await _loadHebahanData();
  }

  void _onReorderHebahan(int oldIndex, int newIndex) async {
    if (newIndex > oldIndex) newIndex -= 1;
    setState(() {
      final item = _hebahanData.removeAt(oldIndex);
      _hebahanData.insert(newIndex, item);
    });
    if (_socketService == null) return;
    // Simpan susunan baru ke fail hebahan.txt
    final lines = _hebahanData
        .map((r) => '${r.teks}|${r.tarikhMula ?? ''}|${r.tarikhAkhir ?? ''}')
        .join('\n');
    await _socketService!.saveFile('hebahan', lines);
  }

  Widget _panelRowButton({
    required String label,
    required String buttonLabel,
    required VoidCallback onPressed,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF3B82F6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          child: Text(buttonLabel, style: const TextStyle(fontSize: 12)),
        ),
      ],
    );
  }

  Widget _buildOverlayBgColorRow() {
    final overlayBgRaw = _config('OVERLAY_BG_COLOR', 'rgba(16, 16, 16, 0.1)');
    final parsedColor = _parseRgbaColor(overlayBgRaw);
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Latar Belakang Panel',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              GestureDetector(
                onTap: () => _showOverlayBgColorPicker(parsedColor),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: parsedColor['color'],
                    border: Border.all(color: Colors.grey.shade300, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Opacity: ${parsedColor['opacity'].toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    ),
                    Slider(
                      value: parsedColor['opacity'],
                      min: 0.0,
                      max: 1.0,
                      divisions: 20,
                      onChanged: (value) {
                        final rgb = parsedColor['color'] as Color;
                        final newRgba = 'rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${value.toStringAsFixed(2)})';
                        setState(() => _configData['OVERLAY_BG_COLOR'] = newRgba);
                        _socketService?.saveConfigItem('OVERLAY_BG_COLOR', newRgba);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          Text(
            overlayBgRaw,
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> _parseRgbaColor(String rgba) {
    final match = RegExp(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)').firstMatch(rgba);
    if (match != null) {
      final r = int.parse(match.group(1)!);
      final g = int.parse(match.group(2)!);
      final b = int.parse(match.group(3)!);
      final a = match.group(4) != null ? double.parse(match.group(4)!) : 1.0;
      return {
        'color': Color.fromARGB((a * 255).round(), r, g, b),
        'opacity': a,
        'r': r,
        'g': g,
        'b': b,
      };
    }
    return {
      'color': const Color.fromARGB(25, 16, 16, 16),
      'opacity': 0.1,
      'r': 16,
      'g': 16,
      'b': 16,
    };
  }

  void _showOverlayBgColorPicker(Map<String, dynamic> currentColor) {
    showDialog(
      context: context,
      builder: (ctx) {
        Color selectedColor = currentColor['color'];
        return AlertDialog(
          title: const Text('Pilih Warna Latar Belakang Panel'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final color in [
                      Colors.black,
                      Colors.grey.shade800,
                      Colors.grey.shade600,
                      Colors.grey.shade400,
                      Colors.white,
                      Colors.red.shade900,
                      Colors.blue.shade900,
                      Colors.green.shade900,
                    ])
                      GestureDetector(
                        onTap: () {
                          selectedColor = color;
                          final opacity = currentColor['opacity'];
                          final newRgba = 'rgba(${color.red}, ${color.green}, ${color.blue}, ${opacity.toStringAsFixed(2)})';
                          setState(() => _configData['OVERLAY_BG_COLOR'] = newRgba);
                          _socketService?.saveConfigItem('OVERLAY_BG_COLOR', newRgba);
                          Navigator.of(ctx).pop();
                        },
                        child: Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: color,
                            border: Border.all(
                              color: selectedColor == color ? Colors.blue : Colors.grey.shade300,
                              width: selectedColor == color ? 3 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Tutup'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHomeOverlayCheckboxesCard() {
    if (!_slidesLoaded) {
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Text('Memuatkan data slides...', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
        ),
      );
    }

    if (!_homeOverlayLoaded) {
      _loadHomeOverlayData();
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    final options = [
      {'value': 'date', 'label': 'Tarikh'},
      {'value': 'solat-time', 'label': 'Waktu Solat Penuh'},
      {'value': 'solat-time-small', 'label': 'Waktu Solat Seterusnya'},
      {'value': 'marquee', 'label': 'Hebahan Bar'},
    ];

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            for (var i = 0; i < options.length; i++) ...[
              if (i > 0) Divider(height: 1, thickness: 1, color: Colors.grey.shade100),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: Checkbox(
                        value: _homeOverlayOptions[options[i]['value']] ?? false,
                        onChanged: (v) => _handleToggleHomeOverlay(options[i]['value']!, v ?? false),
                        activeColor: const Color(0xFF212121),
                        fillColor: WidgetStateProperty.resolveWith((states) {
                          if (states.contains(WidgetState.selected)) return const Color(0xFF212121);
                          return null;
                        }),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      options[i]['label']!,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _loadHomeOverlayData() async {
    if (_socketService == null) return;
    
    try {
      final result = await _socketService!.fetchData('slides');
      final homeRow = result.data.firstWhere(
        (r) => (r['type']?.toString() ?? '').toLowerCase() == 'home',
        orElse: () => <String, dynamic>{},
      );
      
      if (homeRow.isEmpty) {
        if (mounted) {
          setState(() {
            _homeOverlayOptions = {
              'date': false,
              'solat-time': false,
              'solat-time-small': false,
              'marquee': false,
            };
            _homeOverlayLoaded = true;
          });
        }
        return;
      }
      
      final checkboxStr = (homeRow['checkbox']?.toString() ?? '').trim();
      final selectedSet = checkboxStr.isNotEmpty 
          ? checkboxStr.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toSet()
          : <String>{};
      
      if (mounted) {
        setState(() {
          _homeOverlayOptions = {
            'date': selectedSet.contains('date'),
            'solat-time': selectedSet.contains('solat-time'),
            'solat-time-small': selectedSet.contains('solat-time-small'),
            'marquee': selectedSet.contains('marquee'),
          };
          _homeOverlayLoaded = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _homeOverlayOptions = {
            'date': false,
            'solat-time': false,
            'solat-time-small': false,
            'marquee': false,
          };
          _homeOverlayLoaded = true;
        });
      }
    }
  }

  Future<void> _handleToggleHomeOverlay(String key, bool value) async {
    if (_socketService == null) return;
    
    setState(() {
      _homeOverlayOptions[key] = value;
    });
    
    try {
      final result = await _socketService!.fetchData('slides');
      final homeRow = result.data.firstWhere(
        (r) => (r['type']?.toString() ?? '').toLowerCase() == 'home',
        orElse: () => <String, dynamic>{},
      );
      
      if (homeRow.isEmpty) return;
      
      final selectedValues = _homeOverlayOptions.entries
          .where((e) => e.value)
          .map((e) => e.key)
          .join(',');
      
      final updatedRow = Map<String, dynamic>.from(homeRow);
      updatedRow['checkbox'] = selectedValues;
      updatedRow['raw'] = '${updatedRow['type'] ?? ''}|${updatedRow['image'] ?? ''}|${updatedRow['duration'] ?? ''}|$selectedValues|${updatedRow['hide'] ?? '0'}';
      
      await _socketService!.emitWithResponse('cloud:data:update', {
        'fileName': 'slides',
        'id': homeRow['id'],
        'row': updatedRow,
      });
    } catch (e) {
      setState(() {
        _homeOverlayOptions[key] = !value;
      });
    }
  }
}

class _HebahanRow {
  const _HebahanRow({
    required this.id,
    required this.teks,
    this.tarikhMula,
    this.tarikhAkhir,
  });
  final int id;
  final String teks;
  final String? tarikhMula;
  final String? tarikhAkhir;
}


