import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';

class TodayMetricCards extends StatelessWidget {
  final int taskCount;
  final int eventCount;
  final int reminderCount;
  final VoidCallback? onSeeAll;
  final VoidCallback? onTapActions;
  final VoidCallback? onTapAudio;
  final VoidCallback? onTapSynapse;

  const TodayMetricCards({
    super.key,
    this.taskCount = 3,
    this.eventCount = 2,
    this.reminderCount = 1,
    this.onSeeAll,
    this.onTapActions,
    this.onTapAudio,
    this.onTapSynapse,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PULSE METRICS',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: GestureDetector(
                  onTap: onSeeAll,
                  child: Text(
                    'Insights →',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FadeSlideIn(
                  child: _buildBentoCard(
                    context,
                    countDisplay: '$taskCount',
                    label: 'Actions',
                    status: '2 due today',
                    icon: Icons.check_circle_outline_rounded,
                    isDark: isDark,
                    onTap: onTapActions,
                    bottomWidget: ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: SizedBox(
                        height: 2,
                        child: LinearProgressIndicator(
                          value: 0.67,
                          backgroundColor: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isDark ? AppColors.emerald : const Color(0xFF059669),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FadeSlideIn(
                  child: _buildBentoCard(
                    context,
                    countDisplay: '45m',
                    label: 'Audio',
                    status: 'Live Audio',
                    icon: Icons.graphic_eq_rounded,
                    isDark: isDark,
                    onTap: onTapAudio,
                    bottomWidget: Row(
                      children: [4, 7, 12, 7, 4]
                          .map((h) => Container(
                                width: 2,
                                height: h.toDouble(),
                                margin: const EdgeInsets.only(right: 2.5),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                  borderRadius: BorderRadius.circular(1),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FadeSlideIn(
                  child: _buildBentoCard(
                    context,
                    countDisplay: '94%',
                    label: 'Synapse',
                    status: '14 sources',
                    icon: Icons.hub_outlined,
                    isDark: isDark,
                    onTap: onTapSynapse,
                    bottomWidget: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.emerald : const Color(0xFF059669),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            'Optimal',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBentoCard(
    BuildContext context, {
    required String countDisplay,
    required String label,
    required String status,
    required IconData icon,
    required bool isDark,
    Widget? bottomWidget,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
              width: 0.6,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                      ),
                    ),
                  ),
                  Icon(
                    icon,
                    size: 13,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Text(
                countDisplay,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  height: 1.1,
                  letterSpacing: -0.4,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                status,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                ),
              ),
              if (bottomWidget != null) ...[
                const SizedBox(height: 7),
                bottomWidget,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
