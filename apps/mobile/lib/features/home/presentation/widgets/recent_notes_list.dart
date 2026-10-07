import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';

class RecentNotesList extends StatelessWidget {
  final VoidCallback? onSeeAll;
  final Function(String noteId)? onNoteTap;

  const RecentNotesList({
    super.key,
    this.onSeeAll,
    this.onNoteTap,
  });

  @override
  Widget build(BuildContext context) {
    try {
      ProviderScope.containerOf(context, listen: false);
      return _RecentNotesListView(onSeeAll: onSeeAll, onNoteTap: onNoteTap);
    } catch (_) {
      return ProviderScope(
        child: _RecentNotesListView(onSeeAll: onSeeAll, onNoteTap: onNoteTap),
      );
    }
  }
}

class _RecentNotesListView extends ConsumerWidget {
  final VoidCallback? onSeeAll;
  final Function(String noteId)? onNoteTap;

  const _RecentNotesListView({this.onSeeAll, this.onNoteTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allNotes = ref.watch(notesProvider);
    final notes = allNotes.take(3).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'INDEXED NOTES',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              GestureDetector(
                onTap: onSeeAll,
                child: Text(
                  'View all →',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.6,
              ),
            ),
            child: notes.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        'No notes captured yet',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: EdgeInsets.zero,
                    itemCount: notes.length,
                    separatorBuilder: (context, index) => Divider(
                      height: 1,
                      thickness: 0.5,
                      color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                    ),
                    itemBuilder: (context, index) {
                      final note = notes[index];

                      return FadeSlideIn(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => onNoteTap?.call(note.id),
                            borderRadius: index == 0
                                ? const BorderRadius.vertical(top: Radius.circular(14))
                                : index == notes.length - 1
                                    ? const BorderRadius.vertical(bottom: Radius.circular(14))
                                    : BorderRadius.zero,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Icon(
                                    note.icon,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                note.title,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w600,
                                                  letterSpacing: -0.2,
                                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              note.date,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w400,
                                                color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Row(
                                          children: [
                                            Text(
                                              note.tag,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                              ),
                                            ),
                                            Text(
                                              ' · ',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                              ),
                                            ),
                                            Expanded(
                                              child: Text(
                                                note.snippet,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 11.5,
                                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
