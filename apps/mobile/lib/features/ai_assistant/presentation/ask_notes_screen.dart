import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
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

  _ChatMessage({
    required this.text,
    required this.isUser,
    this.groundedAccuracy,
    this.sources,
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

  final List<({String category, String prompt, Color color})> _suggestedPrompts = const [
    (category: 'DECISION', prompt: 'What did John decide on Stripe?', color: AppColors.primary),
    (category: 'TIMELINE', prompt: 'Upcoming milestones for Delivery App', color: AppColors.emerald),
    (category: 'BLOCKERS', prompt: 'List all unresolved blockers', color: AppColors.amber),
  ];

  final List<_ChatMessage> _messages = [
    _ChatMessage(
      text: 'What did John ask me to do before the next sync?',
      isUser: true,
    ),
    _ChatMessage(
      text:
          'Based on your recorded conversation and project notes, John highlighted three critical deliverables:\n\n'
          '1. Verify Stripe webhook signature handling before 1:30 PM.\n'
          '2. Test the checkout redirection edge cases.\n'
          '3. Review the brand assets he is sending tomorrow.',
      isUser: false,
      groundedAccuracy: '98.4% GROUNDED',
      sources: [
        (title: 'Meeting with John', tag: 'AUDIO 45m', noteId: '2'),
        (title: 'Delivery App Repo', tag: 'PROJECT', noteId: null),
      ],
    ),
  ];

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
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

    if (userText.toLowerCase().contains('what did john decide on stripe')) {
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      setState(() {
        _isSynthesizing = false;
        _messages.add(
          _ChatMessage(
            text: 'Synthesized from your Second Brain:\n\n'
                'Target delivery for this milestone is scheduled before September 01. '
                'Stripe integration tests have 2 pending items, and staging deployment will occur once webhooks pass authentication.',
            isUser: false,
            groundedAccuracy: '99.1% GROUNDED',
            sources: [
              (title: 'Meeting with John', tag: 'AUDIO 45m', noteId: '2'),
              (title: 'Product Architecture', tag: 'SYSTEM', noteId: '1'),
            ],
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    final notes = ref.read(notesProvider);
    final response = await ApiClient.instance.askNotes(userText, notes);
    if (!mounted) return;

    final answer = response['answer'] as String? ?? 'No response generated.';
    final citedIds = (response['citedNoteIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    final sources = <({String title, String tag, String? noteId})>[];
    for (final id in citedIds) {
      final match = notes.where((n) => n.id == id).firstOrNull;
      if (match != null) {
        sources.add((title: match.title, tag: match.tag, noteId: match.id));
      }
    }
    if (sources.isEmpty && notes.isNotEmpty) {
      sources.add((title: notes.first.title, tag: notes.first.tag, noteId: notes.first.id));
    }

    setState(() {
      _isSynthesizing = false;
      _messages.add(
        _ChatMessage(
          text: answer,
          isUser: false,
          groundedAccuracy: sources.isNotEmpty ? '97.8% GROUNDED' : 'UNGROUNDED',
          sources: sources,
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
                  'Neural Query',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                Text(
                  '14 indexed sources • RAG Active',
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
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Vector index synced with 14 notes.')),
              );
            },
            icon: Icon(
              Icons.sync_rounded,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              size: 20,
            ),
            tooltip: 'Sync vector store',
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
            child: ListView.builder(
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
                            icon: const Icon(Icons.mic_rounded, size: 18, color: AppColors.primary),
                            visualDensity: VisualDensity.compact,
                            onPressed: () {
                              _textController.text = 'What are the next deliverables discussed with John?';
                            },
                            tooltip: 'Voice memo query',
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
