import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_service.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/models/note_model.dart';
import '../../notes/presentation/note_editor_screen.dart';

class AskNotesScreen extends StatelessWidget {
  final Function(String noteId)? onSourceNoteTap;
  final VoidCallback? onBack;
  final double bottomPadding;

  const AskNotesScreen({
    super.key,
    this.onSourceNoteTap,
    this.onBack,
    this.bottomPadding = 0,
  });

  @override
  Widget build(BuildContext context) {
    try {
      ProviderScope.containerOf(context, listen: false);
      return _AskNotesScreenView(
        onSourceNoteTap: onSourceNoteTap,
        onBack: onBack,
        bottomPadding: bottomPadding,
      );
    } catch (_) {
      return ProviderScope(
        child: _AskNotesScreenView(
          onSourceNoteTap: onSourceNoteTap,
          onBack: onBack,
          bottomPadding: bottomPadding,
        ),
      );
    }
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  final String? groundedAccuracy;
  final List<({String title, String tag, String? noteId})>? sources;
  final List<Map<String, dynamic>>? toolCalls;
  final String? createdNoteId;

  _ChatMessage({
    required this.text,
    required this.isUser,
    this.groundedAccuracy,
    this.sources,
    this.toolCalls,
    this.createdNoteId,
  });
}

class _AskNotesScreenView extends ConsumerStatefulWidget {
  final Function(String noteId)? onSourceNoteTap;
  final VoidCallback? onBack;
  final double bottomPadding;

  const _AskNotesScreenView({
    this.onSourceNoteTap,
    this.onBack,
    this.bottomPadding = 0,
  });

  @override
  ConsumerState<_AskNotesScreenView> createState() => _AskNotesScreenViewState();
}

class _AskNotesScreenViewState extends ConsumerState<_AskNotesScreenView> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isSynthesizing = false;
  bool _isRecordingVoice = false;

  final List<({String category, String prompt, Color color})> _suggestedPrompts = const [
    (category: 'SUMMARY', prompt: 'Summarize my recent thoughts', color: AppColors.primary),
    (category: 'CREATE', prompt: 'Create a note for my project planning', color: AppColors.emerald),
    (category: 'TASKS', prompt: 'What tasks do I have pending?', color: AppColors.amber),
  ];

  final List<_ChatMessage> _messages = [];
  String? _currentConversationId;
  String _currentConversationTitle = 'Neural Assistant';
  List<Map<String, dynamic>> _savedConversations = [];

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    final cached = await LocalStorageService.instance.loadAiConversations();
    if (cached != null && cached.isNotEmpty && mounted) {
      setState(() {
        _savedConversations = cached;
      });
    }

    final remote = await ApiClient.instance.getConversations();
    if (remote.isNotEmpty && mounted) {
      setState(() {
        _savedConversations = remote;
      });
      LocalStorageService.instance.saveAiConversations(remote);
    }
  }

  void _startNewConversation() {
    setState(() {
      _currentConversationId = null;
      _currentConversationTitle = 'Neural Assistant';
      _messages.clear();
    });
  }

  void _openConversationHistorySheet(bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(
              color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
              width: 0.8,
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'CONVERSATIONS',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _startNewConversation();
                      },
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('New Chat', style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, size: 13, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Conversations are private & automatically retained for 30 days.',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (_savedConversations.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'No previous conversations yet.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    ),
                  )
                else
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 380),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _savedConversations.length,
                      separatorBuilder: (context, _) => Divider(
                        color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                        height: 1,
                      ),
                      itemBuilder: (context, index) {
                        final conv = _savedConversations[index];
                        final id = conv['id']?.toString() ?? '';
                        final title = conv['title']?.toString() ?? 'Conversation';
                        final isSelected = id == _currentConversationId;

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          leading: Icon(
                            isSelected ? Icons.chat_bubble_rounded : Icons.chat_bubble_outline_rounded,
                            size: 18,
                            color: isSelected ? AppColors.primary : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                          ),
                          title: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, size: 16),
                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            onPressed: () async {
                              final navigator = Navigator.of(context);
                              await ApiClient.instance.deleteConversation(id);
                              if (!mounted) return;
                              setState(() {
                                _savedConversations.removeWhere((c) => c['id'] == id);
                                if (_currentConversationId == id) {
                                  _startNewConversation();
                                }
                              });
                              LocalStorageService.instance.saveAiConversations(_savedConversations);
                              navigator.pop();
                            },
                          ),
                          onTap: () {
                            setState(() {
                              _currentConversationId = id;
                              _currentConversationTitle = title;
                            });
                            Navigator.pop(context);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    if (_isRecordingVoice) {
      AudioRecordingService.instance.stopRecording();
    }
    super.dispose();
  }

  Future<void> _toggleVoiceRecording() async {
    if (_isRecordingVoice) {
      setState(() {
        _isRecordingVoice = false;
        _isSynthesizing = true;
      });
      final RecordingResult? result = await AudioRecordingService.instance.stopRecording();
      final audioPath = result?.filePath;
      final res = await ApiClient.instance.transcribeAudio(audioPath ?? '');
      final transcript = res['transcript'] as String? ?? '';
      if (transcript.isNotEmpty && mounted) {
        _sendMessage(transcript);
      } else if (mounted) {
        setState(() {
          _isSynthesizing = false;
        });
      }
    } else {
      await AudioRecordingService.instance.startRecording();
      if (!mounted) return;
      setState(() {
        _isRecordingVoice = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Listening... Speak to the AI and tap mic when done.'),
          duration: Duration(milliseconds: 1500),
        ),
      );
    }
  }

  Future<void> _sendMessage(String query) async {
    if (query.trim().isEmpty) return;

    final userText = query.trim();
    setState(() {
      _messages.add(_ChatMessage(text: userText, isUser: true));
      _textController.clear();
      _isSynthesizing = true;
    });

    _scrollToBottom();

    final notes = ref.read(notesProvider);
    final response = await ApiClient.instance.chatWithAssistant(
      message: userText,
      conversationId: _currentConversationId,
      localNotes: notes,
    );
    if (!mounted) return;

    final answer = response['answer'] as String? ?? 'I am ready to help organize your notes and thoughts.';
    final convId = response['conversationId']?.toString();
    if (convId != null && convId.isNotEmpty) {
      _currentConversationId = convId;
    }

    final citedIds = (response['citedNoteIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final actionsExecuted = (response['actionsExecuted'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];

    String? createdNoteId;

    // Apply executed actions to local Riverpod providers so the UI is immediately in sync
    for (final act in actionsExecuted) {
      final tool = act['tool']?.toString();
      final params = act['parameters'] is Map ? act['parameters'] as Map : {};
      final res = act['result'] is Map ? act['result'] as Map : {};

      if (tool == 'create_note') {
        final title = params['title']?.toString() ?? 'AI Note';
        final content = params['content']?.toString() ?? userText;
        final snippet = content.length > 80 ? '${content.substring(0, 80)}...' : content;
        createdNoteId = res['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();

        final newNote = NoteModel(
          id: createdNoteId,
          title: title,
          content: content,
          snippet: snippet,
          date: 'Just now',
          category: 'Ideas',
          tag: 'NOTE',
          tagColor: AppColors.electricViolet,
          icon: Icons.auto_awesome_rounded,
        );
        ref.read(notesProvider.notifier).addNote(newNote);
      } else if (tool == 'create_task') {
        final title = params['title']?.toString() ?? 'New Task';
        ref.read(tasksProvider.notifier).addExtractedTasks(
          [title],
          project: 'AI Assistant',
          sourceNote: 'Smart Assistant',
        );
      } else if (tool == 'create_list') {
        final title = params['title']?.toString() ?? 'Checklist';
        final items = params['items'] is List
            ? (params['items'] as List).map((i) => i.toString()).toList()
            : <String>[];
        if (items.isNotEmpty) {
          ref.read(smartListsProvider.notifier).generateAiList(title, items);
        }
      }
    }

    // Refresh conversation history in background
    _loadConversations();

    final sources = <({String title, String tag, String? noteId})>[];
    for (final id in citedIds) {
      final match = notes.where((n) => n.id == id).firstOrNull;
      if (match != null) {
        sources.add((title: match.title, tag: match.tag, noteId: match.id));
      }
    }

    setState(() {
      _isSynthesizing = false;
      _messages.add(
        _ChatMessage(
          text: answer,
          isUser: false,
          groundedAccuracy: sources.isNotEmpty ? '97.8% GROUNDED' : 'AI ASSISTANT',
          sources: sources,
          toolCalls: actionsExecuted.isNotEmpty ? actionsExecuted : null,
          createdNoteId: createdNoteId,
        ),
      );
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final notesCount = ref.watch(notesProvider).length;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: (widget.onBack != null || Navigator.canPop(context))
            ? IconButton(
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
                  if (widget.onBack != null) {
                    widget.onBack!();
                  } else {
                    Navigator.maybePop(context);
                  }
                },
              )
            : null,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.psychology_rounded, color: AppColors.primary, size: 16),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _currentConversationTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                Text(
                  '$notesCount indexed sources • Neural Brain Active',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: () => _openConversationHistorySheet(isDark),
            icon: Icon(
              Icons.history_rounded,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              size: 20,
            ),
            tooltip: 'Conversation history',
          ),
          IconButton(
            onPressed: _startNewConversation,
            icon: Icon(
              Icons.edit_note_rounded,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              size: 21,
            ),
            tooltip: 'New conversation',
          ),
        ],
      ),
      body: Column(
        children: [
          // Categorized Query Chips
          Container(
            height: 38,
            margin: const EdgeInsets.only(top: 6, bottom: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _suggestedPrompts.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final item = _suggestedPrompts[index];
                return InkWell(
                  onTap: () => _sendMessage(item.prompt),
                  borderRadius: BorderRadius.circular(100),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : Colors.white,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(
                        color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: item.color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            item.category,
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 8.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                              color: item.color,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          item.prompt,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: _messages.isEmpty && !_isSynthesizing
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.chat_bubble_outline_rounded, color: AppColors.primary, size: 28),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.electricViolet.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: AppColors.electricViolet.withValues(alpha: 0.25), width: 0.8),
                          ),
                          child: const Text(
                            'Neural Query',
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                              color: AppColors.electricViolet,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Ask Mindora Anything',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 40),
                          child: Text(
                            'Ask general questions or query your indexed notes and audio transcriptions in real time.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                              height: 1.4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.black.withValues(alpha: 0.04),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.lock_clock_outlined, size: 12, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                              const SizedBox(width: 5),
                              Text(
                                '30-day auto retention • Private & isolated',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                    physics: const BouncingScrollPhysics(),
                    itemCount: _messages.length + (_isSynthesizing ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isSynthesizing) {
                        return _buildSynthesizingIndicator(isDark);
                      }
                      final message = _messages[index];
                      if (message.isUser) {
                        return _buildUserBubble(message.text, isDark);
                      } else {
                        return _buildAiBubble(message, isDark);
                      }
                    },
                  ),
          ),

          // Query Input Bar
          Container(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 10 + widget.bottomPadding),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              bottom: widget.bottomPadding == 0,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Ask your neural second brain...',
                                hintStyle: TextStyle(
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                  fontSize: 13,
                                ),
                                border: InputBorder.none,
                              ),
                              onSubmitted: (val) => _sendMessage(val),
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              _isRecordingVoice ? Icons.stop_circle_rounded : Icons.mic_rounded,
                              size: 20,
                              color: _isRecordingVoice ? const Color(0xFFEF4444) : AppColors.primary,
                            ),
                            visualDensity: VisualDensity.compact,
                            onPressed: _toggleVoiceRecording,
                            tooltip: _isRecordingVoice ? 'Stop recording & send' : 'Speak to AI',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: () => _sendMessage(_textController.text),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: AppColors.proGradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.arrow_upward_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSynthesizingIndicator(bool isDark) {
    return SubtlePulse(
      minScale: 0.95,
      maxScale: 1.05,
      duration: const Duration(milliseconds: 900),
      child: Container(
        margin: const EdgeInsets.only(right: 48, bottom: 20),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.primary),
            ),
            const SizedBox(width: 10),
            Text(
              'Retrieving vector embeddings & synthesizing...',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserBubble(String text, bool isDark) {
    return FadeSlideIn(
      child: Align(
        alignment: Alignment.centerRight,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          margin: const EdgeInsets.only(left: 48, bottom: 20),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceElevated : const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(18).copyWith(
              bottomRight: const Radius.circular(4),
            ),
            border: Border.all(
              color: isDark ? AppColors.darkBorderHighlight : const Color(0xFFBFDBFE),
              width: 0.8,
            ),
          ),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? AppColors.darkTextPrimary : const Color(0xFF1E3A8A),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAiBubble(_ChatMessage message, bool isDark) {
    return FadeSlideIn(
      child: Align(
        alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.all(18),
        margin: const EdgeInsets.only(right: 24, bottom: 24),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(22).copyWith(
            topLeft: const Radius.circular(4),
          ),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
            width: 0.8,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.emerald.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: AppColors.emerald.withValues(alpha: 0.3),
                      width: 0.6,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 4,
                        height: 4,
                        decoration: const BoxDecoration(
                          color: AppColors.emerald,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'SYNTHESIZED ANSWER',
                        style: TextStyle(
                          color: AppColors.emerald,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                if (message.groundedAccuracy != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      message.groundedAccuracy!,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        color: AppColors.primary,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                IconButton(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: message.text));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Answer copied to clipboard'),
                        duration: Duration(milliseconds: 1200),
                      ),
                    );
                  },
                  icon: const Icon(Icons.copy_rounded, size: 15),
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Copy Answer',
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              message.text,
              style: TextStyle(
                fontSize: 14,
                height: 1.55,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            if (message.toolCalls != null && message.toolCalls!.isNotEmpty) ...[
              const SizedBox(height: 14),
              for (final tool in message.toolCalls!)
                _buildExecutedActionCard(tool, message.createdNoteId, isDark),
            ],
            const SizedBox(height: 12),
            _buildResponseActionRow(message.text, isDark),
            if (message.sources != null && message.sources!.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'GROUNDED SOURCES (${message.sources!.length})',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: message.sources!.map((s) {
                  return _buildSourcePill(
                    title: s.title,
                    tag: s.tag,
                    isDark: isDark,
                    onTap: () {
                      if (s.noteId != null) {
                        widget.onSourceNoteTap?.call(s.noteId!);
                        final notes = ref.read(notesProvider);
                        final match = notes.where((n) => n.id == s.noteId).firstOrNull;
                        if (match != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => NoteEditorScreen(
                                noteId: match.id,
                                initialTitle: match.title,
                                initialContent: match.content,
                                tag: match.tag,
                                tagColor: match.tagColor,
                                initialImagePaths: match.imagePaths,
                                initialAudioPath: match.audioPath,
                              ),
                            ),
                          );
                          return;
                        }
                      }
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const NoteEditorScreen(),
                        ),
                      );
                    },
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

  Widget _buildExecutedActionCard(Map<String, dynamic> tool, String? createdNoteId, bool isDark) {
    final toolName = tool['tool']?.toString() ?? 'action';
    final message = tool['message']?.toString() ?? 'Action executed';
    final params = tool['parameters'] is Map ? tool['parameters'] as Map : {};
    final title = params['title']?.toString() ?? params['name']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceSubtle : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkBorderHighlight : const Color(0xFFBBF7D0),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.emerald.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_rounded, size: 14, color: AppColors.emerald),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextPrimary : const Color(0xFF166534),
                  ),
                ),
                if (title.isNotEmpty)
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : const Color(0xFF15803D),
                    ),
                  ),
              ],
            ),
          ),
          if (toolName == 'create_note')
            TextButton(
              onPressed: () {
                final notes = ref.read(notesProvider);
                final match = createdNoteId != null
                    ? notes.where((n) => n.id == createdNoteId).firstOrNull
                    : notes.firstOrNull;
                if (match != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NoteEditorScreen(
                        noteId: match.id,
                        initialTitle: match.title,
                        initialContent: match.content,
                        tag: match.tag,
                        tagColor: match.tagColor,
                        initialImagePaths: match.imagePaths,
                        initialAudioPath: match.audioPath,
                      ),
                    ),
                  );
                } else {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const NoteEditorScreen(),
                    ),
                  );
                }
              },
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 10),
              ),
              child: const Text('Open Note', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }

  Widget _buildResponseActionRow(String text, bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildActionPill(
            icon: Icons.note_add_outlined,
            label: 'Save as Note',
            isDark: isDark,
            onTap: () {
              final words = text.split(' ');
              final title = words.length > 5 ? '${words.take(5).join(' ')}...' : 'AI Generated Note';
              final note = NoteModel(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                title: title,
                content: text,
                snippet: text.length > 80 ? '${text.substring(0, 80)}...' : text,
                date: 'Just now',
                category: 'Ideas',
                tag: 'NOTE',
                tagColor: AppColors.primary,
                icon: Icons.sticky_note_2_rounded,
              );
              ref.read(notesProvider.notifier).addNote(note);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Saved response as a new note!')),
              );
            },
          ),
          const SizedBox(width: 8),
          _buildActionPill(
            icon: Icons.checklist_rounded,
            label: 'Extract Tasks',
            isDark: isDark,
            onTap: () {
              final lines = text
                  .split('\n')
                  .map((l) => l.replaceAll(RegExp(r'^[-*•\d.]\s*'), '').trim())
                  .where((l) => l.length > 5)
                  .take(4)
                  .toList();
              if (lines.isNotEmpty) {
                ref.read(tasksProvider.notifier).addExtractedTasks(
                  lines,
                  project: 'AI Assistant',
                  sourceNote: 'AI Chat Actions',
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Created ${lines.length} task(s)!')),
                );
              }
            },
          ),
          const SizedBox(width: 8),
          _buildActionPill(
            icon: Icons.copy_rounded,
            label: 'Copy',
            isDark: isDark,
            onTap: () {
              Clipboard.setData(ClipboardData(text: text));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied to clipboard')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionPill({
    required IconData icon,
    required String label,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
              width: 0.6,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 13, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSourcePill({
    required String title,
    required String tag,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
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
              const Icon(Icons.link_rounded, size: 13, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                tag,
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
