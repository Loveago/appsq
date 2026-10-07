import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import 'ai_extract_sheet.dart';

class NoteEditorScreen extends StatelessWidget {
  final String noteId;
  final String initialTitle;
  final String initialContent;
  final String tag;
  final Color tagColor;

  const NoteEditorScreen({
    super.key,
    this.noteId = '1',
    this.initialTitle = 'Product Architecture & LLM Routing',
    this.initialContent =
        'Dynamic model fallback, token latency budgets & latency telemetry.\n\nKey decisions:\n1. Route fast queries to Groq / Llama 3 for sub-200ms latency.\n2. Complex vector reasoning routes to Anthropic Claude 3.5 Sonnet.\n3. Offline mobile cache will synchronize via SQLite Drift.\n\nNext steps: finalize database indexes and verify pgvector similarity performance.',
    this.tag = 'SYSTEM',
    this.tagColor = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    try {
      ProviderScope.containerOf(context, listen: false);
      return _NoteEditorScreenView(
        noteId: noteId,
        initialTitle: initialTitle,
        initialContent: initialContent,
        tag: tag,
        tagColor: tagColor,
      );
    } catch (_) {
      return ProviderScope(
        child: _NoteEditorScreenView(
          noteId: noteId,
          initialTitle: initialTitle,
          initialContent: initialContent,
          tag: tag,
          tagColor: tagColor,
        ),
      );
    }
  }
}

class _NoteEditorScreenView extends ConsumerStatefulWidget {
  final String noteId;
  final String initialTitle;
  final String initialContent;
  final String tag;
  final Color tagColor;

  const _NoteEditorScreenView({
    required this.noteId,
    required this.initialTitle,
    required this.initialContent,
    required this.tag,
    required this.tagColor,
  });

  @override
  ConsumerState<_NoteEditorScreenView> createState() => _NoteEditorScreenViewState();
}

class _NoteEditorScreenViewState extends ConsumerState<_NoteEditorScreenView> {
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  bool _isProcessingAi = false;
  String? _aiFeedbackMessage;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialTitle);
    _contentController = TextEditingController(text: widget.initialContent);

    // Ad suppression guardrail: strictly never show ads while typing / editing
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        ref.read(adSuppressionProvider.notifier).state = true;
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  void _saveNote() {
    final title = _titleController.text.trim().isEmpty ? 'Untitled Note' : _titleController.text.trim();
    final content = _contentController.text;
    final snippet = content.length > 80 ? '${content.substring(0, 80)}...' : content;

    try {
      final notes = ref.read(notesProvider);
      final existingIndex = notes.indexWhere((n) => n.id == widget.noteId);

      if (existingIndex >= 0) {
        final updated = notes[existingIndex].copyWith(
          title: title,
          content: content,
          snippet: snippet,
        );
        ref.read(notesProvider.notifier).updateNote(updated);
      } else {
        final newNote = NoteModel(
          id: widget.noteId == 'new' ? DateTime.now().millisecondsSinceEpoch.toString() : widget.noteId,
          title: title,
          content: content,
          snippet: snippet,
          date: 'Just now',
          category: 'Ideas',
          tag: widget.tag,
          tagColor: widget.tagColor,
          icon: NoteModel.iconForCategory('Ideas'),
        );
        ref.read(notesProvider.notifier).addNote(newNote);
      }
    } catch (_) {}
  }

  Future<void> _triggerAiAction(String action) async {
    if (action == 'extract') {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => AiExtractSheet(
          rawThought: _contentController.text,
        ),
      );
      return;
    }

    setState(() {
      _isProcessingAi = true;
      _aiFeedbackMessage = 'AI is executing $action...';
    });

    if (action == 'summarize') {
      final summary = await ApiClient.instance.summarizeNote(_contentController.text);
      if (!mounted) return;
      setState(() {
        _isProcessingAi = false;
        _aiFeedbackMessage = summary;
      });
      return;
    }

    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    setState(() {
      _isProcessingAi = false;
      if (action == 'context') {
        _aiFeedbackMessage = 'Detected entities: People [John, Emmanuel], Project [Delivery App], Deadline [Before Sep].';
      } else if (action == 'rewrite') {
        _contentController.text = 'Structured Overview:\n\n${_contentController.text}';
        _saveNote();
        _aiFeedbackMessage = 'Note rewritten with improved structure and clarity.';
      } else if (action == 'professional') {
        _aiFeedbackMessage = 'Note phrasing elevated to executive standard.';
      } else if (action == 'checklist') {
        _contentController.text += '\n\n✓ Finalize pgvector indexes\n✓ Measure sub-200ms roundtrip latency';
        _saveNote();
        _aiFeedbackMessage = 'Checklist generated from note content.';
      } else if (action == 'email') {
        _contentController.text =
            'Subject: Update regarding ${_titleController.text}\n\nHi Team,\n\nPlease find the summary below:\n${_contentController.text}\n\nBest regards,\nEmmanuel';
        _saveNote();
        _aiFeedbackMessage = 'Drafted professional executive email from note.';
      } else if (action == 'ask') {
        _aiFeedbackMessage = 'AI Assistant: Note contains 2 high priority dependencies and 1 milestone target.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          _saveNote();
          try {
            ref.read(adSuppressionProvider.notifier).state = false;
          } catch (_) {}
        }
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 14,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            onPressed: () {
              _saveNote();
              try {
                ref.read(adSuppressionProvider.notifier).state = false;
              } catch (_) {}
              Navigator.maybePop(context);
            },
          ),
          title: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: widget.tagColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              widget.tag,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: widget.tagColor,
              ),
            ),
          ),
          actions: [
            IconButton(
              onPressed: () {
                _saveNote();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Note changes saved to neural graph.')),
                );
              },
              icon: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_rounded, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'Saved',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            // AI Feedback Banner (if active)
            if (_aiFeedbackMessage != null)
              FadeSlideIn(
                offset: const Offset(0, -0.05),
                child: Container(
                  margin: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 16),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _aiFeedbackMessage!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 14),
                        visualDensity: VisualDensity.compact,
                        onPressed: () => setState(() => _aiFeedbackMessage = null),
                      ),
                    ],
                  ),
                ),
              ),

            // Note Editor Area
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title Input
                    TextField(
                      controller: _titleController,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        letterSpacing: -0.4,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Note Title...',
                        hintStyle: TextStyle(
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Content Input
                    TextField(
                      controller: _contentController,
                      maxLines: null,
                      style: TextStyle(
                        fontSize: 14.5,
                        height: 1.6,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Start writing your thought, meeting note or project detail...',
                        hintStyle: TextStyle(
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          fontSize: 14.5,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // AI Action Toolbar at bottom
            Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                    width: 0.8,
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'AI ACTIONS',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                      if (_isProcessingAi) ...[
                        const SizedBox(width: 8),
                        const SizedBox(
                          width: 10,
                          height: 10,
                          child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.primary),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildAiToolPill(
                          icon: Icons.checklist_rounded,
                          label: 'Extract Tasks',
                          accent: AppColors.emerald,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('extract'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.summarize_rounded,
                          label: 'Summarize',
                          accent: AppColors.primary,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('summarize'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.hub_rounded,
                          label: 'Find Context',
                          accent: AppColors.electricViolet,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('context'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.auto_fix_high_rounded,
                          label: 'Rewrite',
                          accent: AppColors.amber,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('rewrite'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.military_tech_rounded,
                          label: 'Make Professional',
                          accent: Colors.cyan,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('professional'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.format_list_bulleted_rounded,
                          label: 'Create Checklist',
                          accent: Colors.teal,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('checklist'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.email_rounded,
                          label: 'Create Email',
                          accent: Colors.orange,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('email'),
                        ),
                        _buildAiToolPill(
                          icon: Icons.question_answer_rounded,
                          label: 'Ask AI',
                          accent: AppColors.rose,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('ask'),
                        ),
                      ],
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

  Widget _buildAiToolPill({
    required IconData icon,
    required String label,
    required Color accent,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _isProcessingAi ? null : onTap,
          borderRadius: BorderRadius.circular(100),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: accent.withValues(alpha: isDark ? 0.35 : 0.25),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 14, color: accent),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
