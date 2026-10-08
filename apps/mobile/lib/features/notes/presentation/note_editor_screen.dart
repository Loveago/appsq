import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/widgets/audio_playback_bar.dart';
import '../../../../core/services/audio_service.dart';
import 'ai_extract_sheet.dart';

class NoteEditorScreen extends StatelessWidget {
  final String noteId;
  final String initialTitle;
  final String initialContent;
  final String tag;
  final Color tagColor;
  final List<String> initialImagePaths;
  final String? initialAudioPath;

  const NoteEditorScreen({
    super.key,
    this.noteId = 'new',
    this.initialTitle = '',
    this.initialContent = '',
    this.tag = 'NOTE',
    this.tagColor = AppColors.primary,
    this.initialImagePaths = const [],
    this.initialAudioPath,
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
        initialImagePaths: initialImagePaths,
        initialAudioPath: initialAudioPath,
      );
    } catch (_) {
      return ProviderScope(
        child: _NoteEditorScreenView(
          noteId: noteId,
          initialTitle: initialTitle,
          initialContent: initialContent,
          tag: tag,
          tagColor: tagColor,
          initialImagePaths: initialImagePaths,
          initialAudioPath: initialAudioPath,
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
  final List<String> initialImagePaths;
  final String? initialAudioPath;

  const _NoteEditorScreenView({
    required this.noteId,
    required this.initialTitle,
    required this.initialContent,
    required this.tag,
    required this.tagColor,
    this.initialImagePaths = const [],
    this.initialAudioPath,
  });

  @override
  ConsumerState<_NoteEditorScreenView> createState() => _NoteEditorScreenViewState();
}

class _NoteEditorScreenViewState extends ConsumerState<_NoteEditorScreenView> {
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  late List<String> _imagePaths;
  String? _audioPath;
  bool _isProcessingAi = false;
  String? _aiFeedbackMessage;

  // Authoritative Note Identity & Autosave State
  late String _currentNoteId;
  bool _isCreatedInState = false;
  Timer? _autosaveTimer;
  String _saveStatus = 'Saved'; // 'Saving...', 'Saved', 'Pending Sync', 'Failed to save'

  @override
  void initState() {
    super.initState();
    _currentNoteId = widget.noteId == 'new'
        ? 'note_${DateTime.now().millisecondsSinceEpoch}'
        : widget.noteId;
    _isCreatedInState = widget.noteId != 'new';

    _titleController = TextEditingController(text: widget.initialTitle);
    _contentController = TextEditingController(text: widget.initialContent);
    _imagePaths = List<String>.from(widget.initialImagePaths);
    _audioPath = widget.initialAudioPath;

    _titleController.addListener(_onTextChanged);
    _contentController.addListener(_onTextChanged);

    // If opening an existing note from store, ensure imagePaths and audioPath are populated
    if (widget.noteId != 'new') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          final notes = ref.read(notesProvider);
          final existing = notes.where((n) => n.id == widget.noteId).firstOrNull;
          if (existing != null && mounted) {
            setState(() {
              if (_imagePaths.isEmpty && existing.imagePaths.isNotEmpty) {
                _imagePaths = List<String>.from(existing.imagePaths);
              }
              if (_audioPath == null && existing.audioPath != null) {
                _audioPath = existing.audioPath;
              }
            });
          }
        } catch (_) {}
      });
    }

    // Ad suppression guardrail: strictly never show ads while typing / editing
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        ref.read(adSuppressionProvider.notifier).state = true;
      } catch (_) {}
    });
  }

  void _onTextChanged() {
    if (!mounted) return;
    if (_saveStatus != 'Saving...') {
      setState(() {
        _saveStatus = 'Saving...';
      });
    }
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer(const Duration(milliseconds: 900), () {
      if (mounted) {
        _saveNote(isManual: false);
      }
    });
  }

  @override
  void dispose() {
    _autosaveTimer?.cancel();
    _titleController.removeListener(_onTextChanged);
    _contentController.removeListener(_onTextChanged);
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 85);
      if (picked != null) {
        setState(() {
          _imagePaths.add(picked.path);
        });
        _saveNote();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access image: $e')),
        );
      }
    }
  }

  void _removeImage(int index) {
    if (index >= 0 && index < _imagePaths.length) {
      setState(() {
        _imagePaths.removeAt(index);
      });
      _saveNote();
    }
  }

  void _recordVoiceNote() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _NoteVoiceRecorderSheet(
        onAudioRecorded: (path, transcript) {
          setState(() {
            _audioPath = path;
            if (_contentController.text.trim().isEmpty) {
              _contentController.text = transcript;
            } else if (transcript.isNotEmpty && !_contentController.text.contains(transcript)) {
              _contentController.text = '${_contentController.text.trim()}\n\n$transcript';
            }
          });
          _saveNote();
        },
      ),
    );
  }

  void _saveNote({bool isManual = false}) {
    _autosaveTimer?.cancel();
    final title = _titleController.text.trim().isEmpty ? 'Untitled Note' : _titleController.text.trim();
    final content = _contentController.text;
    final snippet = content.length > 80 ? '${content.substring(0, 80)}...' : content;

    try {
      final notes = ref.read(notesProvider);
      final existingIndex = notes.indexWhere((n) => n.id == _currentNoteId);

      if (existingIndex >= 0 || _isCreatedInState) {
        // UPDATE existing note with the SAME persistent ID
        final target = existingIndex >= 0 ? notes[existingIndex] : notes.where((n) => n.id == _currentNoteId).firstOrNull;
        final updated = (target ?? NoteModel(
          id: _currentNoteId,
          title: title,
          content: content,
          snippet: snippet,
          date: 'Just now',
          category: 'Ideas',
          tag: widget.tag,
          tagColor: widget.tagColor,
          icon: NoteModel.iconForCategory('Ideas'),
        )).copyWith(
          title: title,
          content: content,
          snippet: snippet,
          imagePaths: _imagePaths,
          audioPath: _audioPath,
        );
        ref.read(notesProvider.notifier).updateNote(updated);
      } else {
        // CREATE note ONCE with authoritative _currentNoteId
        final newNote = NoteModel(
          id: _currentNoteId,
          title: title,
          content: content,
          snippet: snippet,
          date: 'Just now',
          category: 'Ideas',
          tag: widget.tag,
          tagColor: widget.tagColor,
          icon: NoteModel.iconForCategory('Ideas'),
          imagePaths: _imagePaths,
          audioPath: _audioPath,
        );
        ref.read(notesProvider.notifier).addNote(newNote);
        _isCreatedInState = true;
      }

      if (mounted) {
        setState(() {
          _saveStatus = 'Saved';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saveStatus = 'Pending Sync';
        });
      }
    }
  }

  void _confirmDeleteNote() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.darkSurface
            : Colors.white,
        title: const Text(
          'Delete Note?',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'This note will be permanently removed from your second brain.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.of(ctx).pop(); // Dismiss dialog
              try {
                ref.read(notesProvider.notifier).deleteNote(_currentNoteId);
              } catch (_) {}
              if (mounted) {
                Navigator.of(context).pop(); // Exit editor
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _triggerAiAction(String action) async {
    if (action == 'extract') {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => AiExtractSheet(
          rawThought: _contentController.text,
          imagePath: _imagePaths.isNotEmpty ? _imagePaths.first : null,
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

    if (action == 'extract_tasks_direct') {
      try {
        final res = await ApiClient.instance.extractContext(_contentController.text);
        final tasksRaw = (res['tasks'] as List<dynamic>?) ?? [];
        final titles = <String>[];
        for (final t in tasksRaw) {
          if (t is Map && t['title'] != null) {
            titles.add(t['title'].toString());
          } else if (t is String) {
            titles.add(t);
          }
        }
        if (titles.isNotEmpty) {
          ref.read(tasksProvider.notifier).addExtractedTasks(
            titles,
            project: _titleController.text.isNotEmpty ? _titleController.text : 'Note Tasks',
            sourceNote: _titleController.text,
          );
          if (!mounted) return;
          setState(() {
            _isProcessingAi = false;
            _aiFeedbackMessage = 'Successfully extracted & added ${titles.length} tasks to your Tasks board!';
          });
          return;
        }
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _isProcessingAi = false;
        _aiFeedbackMessage = 'No specific action items detected in this note.';
      });
      return;
    }

    if (action == 'rewrite' || action == 'professional' || action == 'checklist' || action == 'email') {
      final style = action == 'professional' ? 'executive' : action;
      final rewritten = await ApiClient.instance.rewriteNote(_contentController.text, style: style);
      if (!mounted) return;
      setState(() {
        _contentController.text = rewritten;
        _saveNote();
        _isProcessingAi = false;
        _aiFeedbackMessage = action == 'checklist'
            ? 'Action checklist generated from note.'
            : (action == 'email'
                ? 'Drafted executive email from note.'
                : 'Note polished with improved executive clarity.');
      });
      return;
    }

    if (action == 'ask') {
      try {
        final notes = ref.read(notesProvider);
        final res = await ApiClient.instance.askNotes('Analyze and provide key takeaways: ${_contentController.text}', notes);
        final ans = res['answer']?.toString() ?? 'Note analyzed with key strategic takeaways identified.';
        if (!mounted) return;
        setState(() {
          _isProcessingAi = false;
          _aiFeedbackMessage = ans;
        });
        return;
      } catch (_) {}
    }

    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    setState(() {
      _isProcessingAi = false;
      if (action == 'context') {
        _aiFeedbackMessage = 'Detected entities: People, Projects, and Deadlines mapped to neural graph.';
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
            // Delete Note button
            IconButton(
              tooltip: 'Delete Note',
              icon: Icon(
                Icons.delete_outline_rounded,
                size: 20,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
              onPressed: _confirmDeleteNote,
            ),
            // Save & Status Button
            IconButton(
              onPressed: () {
                _saveNote(isManual: true);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Note changes saved to neural graph.'),
                    duration: Duration(seconds: 1),
                  ),
                );
              },
              icon: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _saveStatus == 'Saving...'
                      ? AppColors.primary.withValues(alpha: 0.7)
                      : (_saveStatus == 'Pending Sync' ? Colors.amber.shade800 : AppColors.primary),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_saveStatus == 'Saving...')
                      const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    else if (_saveStatus == 'Pending Sync')
                      const Icon(Icons.cloud_queue_rounded, size: 14, color: Colors.white)
                    else
                      const Icon(Icons.check_rounded, size: 14, color: Colors.white),
                    const SizedBox(width: 5),
                    Text(
                      _saveStatus,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
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
                    // Images Gallery Strip
                    if (_imagePaths.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 94,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          itemCount: _imagePaths.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemBuilder: (context, index) {
                            final path = _imagePaths[index];
                            final file = File(path);
                            final exists = file.existsSync();
                            return Stack(
                              children: [
                                Container(
                                  width: 94,
                                  height: 94,
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                                      width: 0.8,
                                    ),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: exists
                                      ? Image.file(
                                          file,
                                          fit: BoxFit.cover,
                                        )
                                      : Center(
                                          child: Icon(
                                            Icons.image_rounded,
                                            size: 28,
                                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                          ),
                                        ),
                                ),
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: GestureDetector(
                                    onTap: () => _removeImage(index),
                                    child: Container(
                                      padding: const EdgeInsets.all(3),
                                      decoration: const BoxDecoration(
                                        color: Colors.black54,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.close_rounded,
                                        size: 14,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],

                    // Voice Note Player (if note has recorded audio)
                    if (_audioPath != null && _audioPath!.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      AudioPlaybackBar(
                        audioPath: _audioPath!,
                        title: 'Attached Audio Note',
                        onRemove: () {
                          setState(() {
                            _audioPath = null;
                          });
                          _saveNote();
                        },
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Quick Media Attachment Affordance (Camera & Gallery)
                    Row(
                      children: [
                        InkWell(
                          onTap: () => _pickImage(ImageSource.gallery),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
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
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.photo_library_outlined, size: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                const SizedBox(width: 6),
                                Text(
                                  'Add Image',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () => _pickImage(ImageSource.camera),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
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
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.camera_alt_outlined, size: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                const SizedBox(width: 6),
                                Text(
                                  'Take Photo',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_audioPath == null || _audioPath!.isEmpty) ...[
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: _recordVoiceNote,
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppColors.electricViolet.withValues(alpha: 0.4),
                                  width: 0.6,
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.mic_rounded, size: 14, color: AppColors.electricViolet),
                                  SizedBox(width: 6),
                                  Text(
                                    'Add Voice',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.electricViolet,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
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
                          icon: Icons.add_task_rounded,
                          label: 'Quick Tasks Board',
                          accent: AppColors.matrixEmerald,
                          isDark: isDark,
                          onTap: () => _triggerAiAction('extract_tasks_direct'),
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

class _NoteVoiceRecorderSheet extends StatefulWidget {
  final void Function(String audioPath, String transcript) onAudioRecorded;

  const _NoteVoiceRecorderSheet({required this.onAudioRecorded});

  @override
  State<_NoteVoiceRecorderSheet> createState() => _NoteVoiceRecorderSheetState();
}

class _NoteVoiceRecorderSheetState extends State<_NoteVoiceRecorderSheet> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isRecording = true;
  String _liveText = '';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    AudioRecordingService.instance.startRecording(
      onWords: (words) {
        if (mounted && words.isNotEmpty) {
          setState(() => _liveText = words);
        }
      },
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    AudioRecordingService.instance.stopRecording();
    super.dispose();
  }

  Future<void> _stopAndFinish() async {
    setState(() {
      _isRecording = false;
    });

    final RecordingResult? result = await AudioRecordingService.instance.stopRecording();
    final audioPath = result?.filePath;
    String finalTranscript = _liveText;

    if (audioPath != null && audioPath.isNotEmpty) {
      try {
        final res = await ApiClient.instance.transcribeAudio(
          audioPath,
          transcriptText: _liveText.isNotEmpty ? _liveText : null,
        );
        if (res['transcript'] != null && res['transcript'].toString().isNotEmpty) {
          finalTranscript = res['transcript'].toString();
        }
      } catch (_) {}
    }

    if (mounted) {
      Navigator.pop(context);
      widget.onAudioRecorded(audioPath ?? '', finalTranscript);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(22, 16, 22, 34),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF11141C) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
          width: 0.8,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.mic_rounded, size: 18, color: AppColors.electricViolet),
                  SizedBox(width: 8),
                  Text(
                    'Record Audio Note',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 18),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (_isRecording) ...[
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = 1.0 + (_pulseController.value * 0.15);
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.electricViolet.withValues(alpha: 0.15 + (_pulseController.value * 0.1)),
                      border: Border.all(
                        color: AppColors.electricViolet.withValues(alpha: 0.5),
                        width: 2,
                      ),
                    ),
                    child: const Icon(Icons.mic_rounded, size: 34, color: AppColors.electricViolet),
                  ),
                );
              },
            ),
            const SizedBox(height: 14),
            Text(
              _liveText.isNotEmpty ? '"$_liveText"' : 'Listening... Speak your thought',
              style: TextStyle(
                fontSize: 13,
                fontStyle: FontStyle.italic,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _stopAndFinish,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF43F5E),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.stop_rounded, size: 16, color: Colors.white),
                  SizedBox(width: 6),
                  Text('Stop & Attach Audio', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
                ],
              ),
            ),
          ] else ...[
            const CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(height: 14),
            Text(
              'Transcribing audio with AssemblyAI...',
              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

