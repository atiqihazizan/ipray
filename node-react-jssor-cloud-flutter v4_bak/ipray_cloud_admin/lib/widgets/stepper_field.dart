import 'package:flutter/material.dart';

/// Widget stepper nombor dengan butang plus/minus — tiada input keyboard.
/// Boleh dikongsi di seluruh skrin.
class StepperField extends StatelessWidget {
  const StepperField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.min = 0,
    this.max,
    this.step = 1,
  });

  /// Nilai semasa.
  final int value;

  /// Dipanggil bila nilai berubah: (nilaiBaharu).
  final ValueChanged<int> onChanged;

  /// Label di sebelah kiri (e.g. 'Tempoh (s)').
  final String? label;

  /// Nilai minimum (default 0).
  final int min;

  /// Nilai maksimum (null = tiada had).
  final int? max;

  /// Langkah tambah/kurang (default 1).
  final int step;

  @override
  Widget build(BuildContext context) {
    final canDecrease = value > min;
    final canIncrease = max == null || value < max!;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
          const SizedBox(width: 8),
        ],
        Material(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.remove),
                onPressed: canDecrease
                    ? () {
                        final next = value - step;
                        if (next >= min) onChanged(next);
                      }
                    : null,
                style: IconButton.styleFrom(
                  padding: const EdgeInsets.all(4),
                  minimumSize: const Size(32, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              SizedBox(
                width: 40,
                child: Text(
                  '$value',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: canIncrease
                    ? () {
                        final next = value + step;
                        if (max == null || next <= max!) onChanged(next);
                      }
                    : null,
                style: IconButton.styleFrom(
                  padding: const EdgeInsets.all(4),
                  minimumSize: const Size(32, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
