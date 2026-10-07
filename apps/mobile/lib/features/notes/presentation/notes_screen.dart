import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import 'note_editor_screen.dart';

class NotesScreen extends StatelessWidget {
  final VoidCallback? onBack;

  const NotesScreen({super.key, this.onBack});

  @override
  Widget build(BuildContext context) {
    try {
      ProviderScope.containerOf(context, listen: false);
      return _NotesScreenView(onBack: onBack);
    } catch (_) {
      return ProviderScope(child: _NotesScreenView(onBack: onBack));
    }
  }
}

class _NotesScreenView extends ConsumerStatefulWidget {
  final VoidCallback? onBack;

  const _NotesScreenView({this.onBack});

  @override
  ConsumerState<_NotesScreenView> createState() => _NotesScreenViewState();
}

class _NotesScreenViewState extends ConsumerState<_NotesScreenView> {
  int _selectedCategoryIndex = 0; // 0: All, 1: Meetings, 2: Ideas, 3: Architecture
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<NoteModel> _filterNotes(List<NoteModel> notes) {
    final query = _searchController.text.toLowerCase();
    return notes.where((note) {
      final matchesSearch = note.title.toLowerCase().contains(query) ||
          note.snippet.toLowerCase().contains(query) ||
          note.content.toLowerCase().contains(query);
      if (!matchesSearch) return false;

      if (_selectedCategoryIndex == 1) return note.category.toLowerCase() == 'meetings';
      if (_selectedCategoryIndex == 2) return note.category.toLowerCase() == 'ideas';
      if (_selectedCategoryIndex == 3) return note.category.toLowerCase() == 'architecture';
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allNotes = ref.watch(notesProvider);
    final filteredNotes = _filterNotes(allNotes);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: widget.onBack != null
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
                onPressed: widget.onBack,
              )
            : null,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.description_rounded, color: AppColors.primary, size: 16),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Indexed Notes',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                Text(
                  '${allNotes.length} total • RAG Synced',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NoteEditorScreen(
                    noteId: 'new',
                    initialTitle: 'Untitled Note',
                    initialContent: '',
                    tag: 'NEW',
                    tagColor: AppColors.primary,
                  ),
                ),
              );
            },
            icon: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.add_rounded, color: Colors.white, size: 16),
            ),
            tooltip: 'Create New Note',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded, size: 18, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search indexed notes by content or concept...',
                        hintStyle: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                        border: InputBorder.none,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  if (_searchController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 16),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    ),
                ],
              ),
            ),
          ),

          // Categories Bar
          Container(
            height: 38,
            margin: const EdgeInsets.fromLTRB(20, 6, 20, 10),
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _buildCategoryPill(0, 'All Notes', isDark),
                _buildCategoryPill(1, '🎙️ Meetings', isDark),
                _buildCategoryPill(2, '💡 Ideas', isDark),
                _buildCategoryPill(3, '⚙️ Architecture', isDark),
              ],
            ),
          ),

          // Notes List
          Expanded(
            child: filteredNotes.isEmpty
                ? Center(
                    child: Text(
                      'No notes found',
                      style: TextStyle(
                        color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        fontSize: 13,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 100),
                    physics: const BouncingScrollPhysics(),
                    itemCount: filteredNotes.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final note = filteredNotes[index];
                      return _buildNoteCard(note, isDark, index);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryPill(int index, String label, bool isDark) {
    final isSelected = _selectedCategoryIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategoryIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkSurfaceElevated : AppColors.primary)
              : (isDark ? AppColors.darkSurface : Colors.white),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: isSelected
                ? (isDark ? AppColors.primary : AppColors.primary)
                : (isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
            width: 0.8,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? (isDark ? AppColors.primaryLight : Colors.white)
                : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
          ),
        ),
      ),
    );
  }

  Widget _buildNoteCard(NoteModel note, bool isDark, int index) {
    final tagColor = note.tagColor;

    return FadeSlideIn(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => NoteEditorScreen(
                  noteId: note.id,
                  initialTitle: note.title,
                  initialContent: note.content,
                  tag: note.tag,
                  tagColor: tagColor,
                  initialImagePaths: note.imagePaths,
                  initialAudioPath: note.audioPath,
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: tagColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(note.icon, color: tagColor, size: 18),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: tagColor.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              note.tag,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                                color: tagColor,
                              ),
                            ),
                          ),
                          if (note.imagePaths.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.image_outlined, size: 10, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                  const SizedBox(width: 3),
                                  Text(
                                    '${note.imagePaths.length}',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          if (note.audioPath != null && note.audioPath!.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.electricViolet.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.mic_rounded, size: 10, color: AppColors.electricViolet),
                                  SizedBox(width: 3),
                                  Text(
                                    'VOICE',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.electricViolet,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const Spacer(),
                          Text(
                            note.date,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        note.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        note.snippet,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
