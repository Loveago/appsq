import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';

class AiExtractSheet extends StatefulWidget {
  final String rawThought;
  final VoidCallback? onApply;

  const AiExtractSheet({
    super.key,
    this.rawThought = 'Met John today about the website. He wants it live before September. Need to finish payment integration and he will send the new logo tomorrow.',
    this.onApply,
  });

  @override
  State<AiExtractSheet> createState() => _AiExtractSheetState();
}

class _AiExtractSheetState extends State<AiExtractSheet> {
  final List<bool> _checkedTasks = [true, false];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeSlideIn(
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
          width: 0.8,
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),

              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'NEURAL THOUGHT EXTRACTION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Raw Input Card
              Text(
                'RAW CAPTURE',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                    width: 0.8,
                  ),
                ),
                child: Text(
                  '“${widget.rawThought}”',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    fontStyle: FontStyle.italic,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Synthesized Entities
              Text(
                'STRUCTURED GRAPH ENTITIES',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),

              Row(
                children: [
                  Expanded(
                    child: _buildEntityPill(
                      label: 'Stakeholder',
                      value: 'John Doe',
                      icon: Icons.person_outline_rounded,
                      accentColor: AppColors.primary,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildEntityPill(
                      label: 'Target',
                      value: 'Website',
                      icon: Icons.folder_outlined,
                      accentColor: AppColors.electricViolet,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildEntityPill(
                      label: 'Target Date',
                      value: 'Sep 01',
                      icon: Icons.event_outlined,
                      accentColor: AppColors.amber,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Extracted Action Items
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                    width: 0.8,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.checklist_rounded, size: 16, color: AppColors.emerald),
                        const SizedBox(width: 8),
                        Text(
                          'ACTION ITEMS (2 DETECTED)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildTaskItem(
                      index: 0,
                      title: 'Finish payment integration before staging sync',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 8),
                    _buildTaskItem(
                      index: 1,
                      title: 'Follow up with John regarding new brand logo assets',
                      isDark: isDark,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Action Buttons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (widget.onApply != null) {
                      widget.onApply!();
                    } else {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Entities & tasks committed to your neural graph.'),
                          duration: Duration(milliseconds: 1400),
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Sync & Commit to Neural Brain',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildEntityPill({
    required String label,
    required String value,
    required IconData icon,
    required Color accentColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: accentColor),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskItem({
    required int index,
    required String title,
    required bool isDark,
  }) {
    final isChecked = _checkedTasks[index];

    return InkWell(
      onTap: () {
        setState(() {
          _checkedTasks[index] = !_checkedTasks[index];
        });
      },
      borderRadius: BorderRadius.circular(10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isChecked ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            size: 18,
            color: isChecked ? AppColors.emerald : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 13,
                decoration: isChecked ? TextDecoration.lineThrough : null,
                color: isChecked
                    ? (isDark ? AppColors.darkTextMuted : AppColors.textMuted)
                    : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                fontWeight: isChecked ? FontWeight.normal : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
