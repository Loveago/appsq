import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';

class QuickCaptureBar extends StatelessWidget {
  final Function(String mode)? onCaptureSelected;

  const QuickCaptureBar({super.key, this.onCaptureSelected});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    const items = [
      (
        id: 'write',
        icon: Icons.edit_note_rounded,
        label: 'Write',
      ),
      (
        id: 'voice',
        icon: Icons.mic_rounded,
        label: 'Voice',
      ),
      (
        id: 'scan',
        icon: Icons.document_scanner_rounded,
        label: 'Scan',
      ),
      (
        id: 'photo',
        icon: Icons.camera_alt_rounded,
        label: 'Photo',
      ),
      (
        id: 'list',
        icon: Icons.checklist_rounded,
        label: 'List',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Text(
            'QUICK CAPTURE',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
            ),
          ),
        ),
        SizedBox(
          height: 38,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            physics: const BouncingScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (context, index) => const SizedBox(width: 7),
            itemBuilder: (context, index) {
              final item = items[index];
              return FadeSlideIn(
                offset: const Offset(0.04, 0),
                child: _buildPill(
                  context,
                  icon: item.icon,
                  title: item.label,
                  isDark: isDark,
                  onTap: () => onCaptureSelected?.call(item.id),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPill(
    BuildContext context, {
    required IconData icon,
    required String title,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
              width: 0.6,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                size: 15,
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.1,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
