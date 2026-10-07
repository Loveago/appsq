import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';

class AiExtractSheet extends ConsumerStatefulWidget {
  final String rawThought;
  final String? imagePath;
  final VoidCallback? onApply;

  const AiExtractSheet({
    super.key,
    this.rawThought = 'Meeting discussion and deliverables note.',
    this.imagePath,
    this.onApply,
  });

  @override
  ConsumerState<AiExtractSheet> createState() => _AiExtractSheetState();
}

class _AiExtractSheetState extends ConsumerState<AiExtractSheet> {
  bool _isLoading = true;
  String _stakeholder = 'Self';
  String _target = 'General';
  String _targetDate = 'Today';
  String _suggestedTitle = 'Quick Capture';
  List<String> _detectedTasks = [];
  List<bool> _checkedTasks = [];

  @override
  void initState() {
    super.initState();
    _performExtraction();
  }

  Future<void> _performExtraction() async {
    final text = widget.rawThought.trim();
    if (text.isEmpty) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      return;
    }

    try {
      final res = await ApiClient.instance.extractContext(text);
      if (mounted) {
        final people = (res['people'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final projects = (res['projects'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final deadlines = (res['deadlines'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final tasksRaw = (res['tasks'] as List<dynamic>?) ?? [];

        final tasksList = <String>[];
        for (final t in tasksRaw) {
          if (t is Map && t['title'] != null) {
            tasksList.add(t['title'].toString());
          } else if (t is String) {
            tasksList.add(t);
          }
        }

        setState(() {
          _stakeholder = people.isNotEmpty ? people.first : 'Self';
          _target = projects.isNotEmpty ? projects.first : 'General';
          _targetDate = deadlines.isNotEmpty ? deadlines.first : 'Today';
          _suggestedTitle = res['suggestedTitle']?.toString() ?? (_stakeholder != 'Self' ? 'Sync: $_stakeholder' : 'Thought Note');
          _detectedTasks = tasksList.isNotEmpty ? tasksList : ['Follow up on extracted thought'];
          _checkedTasks = List.filled(_detectedTasks.length, true);
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _detectedTasks = ['Review captured note'];
          _checkedTasks = [true];
          _isLoading = false;
        });
      }
    }
  }

  void _saveEntities() {
    final selectedTasks = <String>[];
    for (int i = 0; i < _detectedTasks.length; i++) {
      if (i < _checkedTasks.length && _checkedTasks[i]) {
        selectedTasks.add(_detectedTasks[i]);
      }
    }

    // 1. Add note to notesProvider
    try {
      final note = NoteModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: _suggestedTitle,
        content: widget.rawThought,
        snippet: selectedTasks.isNotEmpty
            ? '${selectedTasks.length} action item(s) extracted: ${selectedTasks.first}'
            : widget.rawThought,
        date: 'Just now',
        category: 'Ideas',
        tag: widget.imagePath != null ? 'SCAN' : 'NOTE',
        tagColor: widget.imagePath != null ? AppColors.matrixEmerald : AppColors.primary,
        icon: widget.imagePath != null ? Icons.document_scanner_rounded : Icons.auto_awesome_rounded,
        extractedTasks: selectedTasks,
      );
      ref.read(notesProvider.notifier).addNote(note);

      // 2. Add tasks to tasksProvider
      if (selectedTasks.isNotEmpty) {
        ref.read(tasksProvider.notifier).addExtractedTasks(
          selectedTasks,
          project: _target,
          sourceNote: _suggestedTitle,
        );
      }
    } catch (_) {}

    if (widget.onApply != null) {
      widget.onApply!();
    } else {
      if (Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saved to Second Brain! ${selectedTasks.length} task(s) created.'),
          duration: const Duration(milliseconds: 1800),
        ),
      );
    }
  }

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

              if (_isLoading) ...[
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              ] else ...[
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
                        value: _stakeholder,
                        icon: Icons.person_outline_rounded,
                        accentColor: AppColors.primary,
                        isDark: isDark,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildEntityPill(
                        label: 'Target',
                        value: _target,
                        icon: Icons.folder_outlined,
                        accentColor: AppColors.electricViolet,
                        isDark: isDark,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildEntityPill(
                        label: 'Target Date',
                        value: _targetDate,
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
                            'ACTION ITEMS (${_detectedTasks.length} DETECTED)',
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
                      for (int i = 0; i < _detectedTasks.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _buildTaskItem(
                            index: i,
                            title: _detectedTasks[i],
                            isDark: isDark,
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Action Buttons
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saveEntities,
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
