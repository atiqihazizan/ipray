import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ─── Gaya seragam panel tab (selari webmobile config-tab-panel) ─────────────
// Warna & tipografi wajib kekal untuk konsistensi.

/// Skrin panel tab standard: butang Kembali + kawasan skrol kandungan.
/// Boleh digunakan untuk Config sub-tab, Countdowns, Announcements, dll.
class PanelTabScreen extends StatelessWidget {
  const PanelTabScreen({
    super.key,
    required this.onBack,
    required this.body,
  });

  final VoidCallback onBack;
  final List<Widget> body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(
            children: [
              _BackButton(onTap: onBack),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: body,
          ),
        ),
      ],
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.arrow_back, size: 18, color: Colors.grey.shade700),
              const SizedBox(width: 6),
              Text(
                'Kembali',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.grey.shade800),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Building blocks (gaya webmobile: config-group-title, config-group-items) ─

/// Tajuk bahagian (ALL CAPS), selari .config-group-title di webmobile.
class PanelTabSectionHeader extends StatelessWidget {
  const PanelTabSectionHeader(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.04,
          color: Color(0xFF6B7280),
        ),
      ),
    );
  }
}

/// Kad putih dengan baris tetapan, selari .config-group-items di webmobile.
class PanelTabCard extends StatelessWidget {
  const PanelTabCard({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: List.generate(children.length * 2 - 1, (i) {
            if (i.isOdd) {
              return Divider(height: 1, thickness: 1, color: Colors.grey.shade100);
            }
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: children[i ~/ 2],
            );
          }),
        ),
      ),
    );
  }
}

/// Baris label sahaja.
class PanelTabRowLabel extends StatelessWidget {
  const PanelTabRowLabel(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
        ),
      ],
    );
  }
}

/// Baris: label + Switch.
class PanelTabRowToggle extends StatelessWidget {
  const PanelTabRowToggle({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        Switch(value: value, onChanged: onChanged),
      ],
    );
  }
}

/// Baris: label + medan input + unit (e.g. "1" + "s").
class PanelTabRowInput extends StatefulWidget {
  const PanelTabRowInput({
    super.key,
    required this.label,
    required this.initialValue,
    required this.unit,
    this.onChanged,
    this.isNumeric = false,
  });

  final String label;
  final String initialValue;
  final String unit;
  final ValueChanged<String>? onChanged;
   /// Jika true, gunakan papan kekunci nombor.
  final bool isNumeric;

  @override
  State<PanelTabRowInput> createState() => _PanelTabRowInputState();
}

class _PanelTabRowInputState extends State<PanelTabRowInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    widget.onChanged?.call(_controller.text);
  }

  @override
  void didUpdateWidget(PanelTabRowInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue && _controller.text != widget.initialValue) {
      _controller.text = widget.initialValue;
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    super.dispose();
  }

  Future<void> _showNumberDialog() async {
    int value = int.tryParse(_controller.text.trim()) ?? 0;
    final result = await showDialog<int>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(widget.label),
          content: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline),
                onPressed: () {
                  value = value > 0 ? value - 1 : 0;
                  (ctx as Element).markNeedsBuild();
                },
              ),
              Text(
                '$value',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline),
                onPressed: () {
                  value++;
                  (ctx as Element).markNeedsBuild();
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, value), child: const Text('OK')),
          ],
        );
      },
    );
    if (result != null) {
      _controller.text = result.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          widget.label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 64,
              child: widget.isNumeric
                  ? InkWell(
                      onTap: _showNumberDialog,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                        decoration: const BoxDecoration(
                          border: Border(
                            bottom: BorderSide(color: Color(0xFF9CA3AF)),
                          ),
                        ),
                        alignment: Alignment.centerRight,
                        child: Text(
                          _controller.text,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    )
                  : TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                        border: UnderlineInputBorder(),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF6366F1))),
                      ),
                      style: const TextStyle(fontSize: 12),
                      textAlign: TextAlign.right,
                    ),
            ),
            const SizedBox(width: 4),
            Text(
              widget.unit,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ],
    );
  }
}

/// Baris: label + dropdown.
class PanelTabRowDropdown extends StatelessWidget {
  const PanelTabRowDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        DropdownButton<String>(
          value: value,
          isDense: true,
          underline: const SizedBox(),
          items: items
              .map((o) => DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 12))))
              .toList(),
          onChanged: onChanged,
        ),
      ],
    );
  }
}

/// Baris: label + color box + medan hex.
class PanelTabRowColor extends StatefulWidget {
  const PanelTabRowColor({
    super.key,
    required this.label,
    required this.initialColor,
    required this.initialHex,
    this.onChanged,
  });

  final String label;
  final Color initialColor;
  final String initialHex;
  final ValueChanged<Color>? onChanged;

  @override
  State<PanelTabRowColor> createState() => _PanelTabRowColorState();
}

class _PanelTabRowColorState extends State<PanelTabRowColor> {
  late Color _color;
  late TextEditingController _hexController;

  @override
  void initState() {
    super.initState();
    _color = widget.initialColor;
    _hexController = TextEditingController(text: widget.initialHex);
  }

  @override
  void dispose() {
    _hexController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          widget.label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: () async {
                await _showColorDialog();
              },
              child: Container(
                width: 28,
                height: 24,
                decoration: BoxDecoration(
                  color: _color,
                  border: Border.all(color: Colors.grey.shade300),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _showColorDialog() async {
    const options = <Color>[
      Color(0xFFFFEB3B),
      Color(0xFF4CAF50),
      Color(0xFF2196F3),
      Color(0xFFFF9800),
      Color(0xFFF44336),
      Color(0xFF9C27B0),
      Color(0xFF000000),
      Color(0xFFFFFFFF),
    ];
    final result = await showDialog<Color>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(widget.label),
          content: SizedBox(
            width: 260,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: options
                  .map(
                    (c) => GestureDetector(
                      onTap: () => Navigator.pop(ctx, c),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: c,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ],
        );
      },
    );
    if (result != null) {
      setState(() {
        _color = result;
        final hex = '#${result.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
        _hexController.text = hex;
      });
      widget.onChanged?.call(result);
    }
  }
}
