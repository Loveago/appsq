import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';

class DailyBriefingCard extends StatefulWidget {
  final String? headline;
  final String? insight;
  final VoidCallback? onViewBriefing;
  final VoidCallback? onPlayAudio;

  const DailyBriefingCard({
    super.key,
    this.headline,
    this.insight,
    this.onViewBriefing,
    this.onPlayAudio,
  });

  @override
  State<DailyBriefingCard> createState() => _DailyBriefingCardState();
}

class _DailyBriefingCardState extends State<DailyBriefingCard> {
  bool _isPlaying = false;
  bool _isDismissed = false;

  @override
  Widget build(BuildContext context) {
    if (_isDismissed) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeSlideIn(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
            width: 0.8,
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
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
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'AI SYNTHESIS',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2,
                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Subtle dismiss affordance
                GestureDetector(
                  onTap: () => setState(() => _isDismissed = true),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.all(2),
                    child: Icon(
                      Icons.close_rounded,
                      size: 15,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            Text(
              widget.headline ?? 'Welcome to Mindora! Your Second Brain is ready.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                height: 1.35,
                letterSpacing: -0.2,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: 4),

            Text(
              widget.insight ?? 'Capture a quick thought or audio note below to populate your daily executive brief.',
              style: TextStyle(
                fontSize: 12,
                height: 1.35,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
            ),

            const SizedBox(height: 12),

            // Minimalist Audio Scrubber
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.6,
                ),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() => _isPlaying = !_isPlaying);
                      widget.onPlayAudio?.call();
                    },
                    child: Icon(
                      _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      size: 18,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [4, 8, 14, 7, 12, 17, 10, 15, 6, 12, 9, 14, 7, 10, 4].map((h) {
                        final dynamicHeight = _isPlaying ? (h * 1.15).clamp(4.0, 20.0) : h.toDouble();
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          width: 2,
                          height: dynamicHeight,
                          decoration: BoxDecoration(
                            color: h > 10
                                ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                                : (isDark ? AppColors.darkTextMuted : AppColors.surfaceBorder),
                            borderRadius: BorderRadius.circular(1),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _isPlaying ? '00:58 / 01:45' : '00:42 / 01:45',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 9.5,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Modern Action Row
            GestureDetector(
              onTap: widget.onViewBriefing,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 6.5),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white : AppColors.textPrimary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Open Full Brief',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.black : Colors.white,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 13,
                      color: isDark ? Colors.black : Colors.white,
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
