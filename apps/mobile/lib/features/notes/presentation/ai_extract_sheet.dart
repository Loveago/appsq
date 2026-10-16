import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/models/smart_list_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/ocr_service.dart';

class AiExtractSheet extends ConsumerStatefulWidget {
  final String rawThought;
  final String? imagePath;
  final SmartScanResult? scanResult;
  final VoidCallback? onApply;

  const AiExtractSheet({
    super.key,
    this.rawThought = 'Meeting discussion and deliverables note.',
    this.imagePath,
    this.scanResult,
    this.onApply,
  });

  @override
  ConsumerState<AiExtractSheet> createState() => _AiExtractSheetState();
}

class _AiExtractSheetState extends ConsumerState<AiExtractSheet> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  String _documentType = 'GENERAL_NOTE';
  String _suggestedTitle = 'Scanned Document';
  String _summary = '';
  double _confidenceScore = 0.95;

  // Recipe specific states
  bool _isRecipe = false;
  List<Map<String, dynamic>> _ingredients = [];
  List<String> _shoppingList = [];
  List<Map<String, dynamic>> _prepTasks = [];
  List<Map<String, dynamic>> _cookingTasks = [];
  List<Map<String, dynamic>> _detectedRecipes = [];
  int _selectedRecipeIndex = 0;

  // General Actionable Tasks
  List<Map<String, dynamic>> _actionableTasks = [];
  List<bool> _checkedTasks = [];

  // Uncertain Items for review
  List<Map<String, dynamic>> _uncertainItems = [];

  // Active Tab for Recipes
  late TabController _tabController;

  final List<String> _availableDocTypes = [
    'GENERAL_NOTE',
    'RECIPE',
    'COOKBOOK',
    'SHOPPING_LIST',
    'MEETING_NOTES',
    'STUDY_NOTES',
    'PROJECT_PLAN',
    'RECEIPT_EXPENSES',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _performExtraction();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _performExtraction() async {
    final text = widget.rawThought.trim();
    if (text.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final hint = {
        'ocrConfidence': widget.scanResult?.confidenceScore ?? 0.9,
        'detectedType': widget.scanResult?.documentType ?? 'GENERAL',
        'isHandwritten': widget.scanResult?.isHandwritten ?? false,
      };

      final res = await ApiClient.instance.extractSmartDocument(text, imageHint: hint);

      if (mounted) {
        setState(() {
          _documentType = res['documentType']?.toString() ?? 'GENERAL_NOTE';
          _suggestedTitle = res['title']?.toString() ?? 'Scanned Document';
          _summary = res['summary']?.toString() ?? '';
          _confidenceScore = (res['confidenceScore'] is num) ? (res['confidenceScore'] as num).toDouble() : 0.9;
          _isRecipe = res['isRecipe'] == true || _documentType == 'RECIPE' || _documentType == 'COOKBOOK';

          _ingredients = (res['ingredients'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          _shoppingList = (res['shoppingListItems'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
          _prepTasks = (res['prepTasks'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          _cookingTasks = (res['cookingTasks'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          _detectedRecipes = (res['detectedRecipes'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

          final rawTasks = (res['actionableTasks'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
          _actionableTasks = rawTasks.isNotEmpty ? rawTasks : [
            {
              'title': 'Review and verify extracted document',
              'priority': 'MEDIUM',
              'isExplicitCommitment': true,
              'category': 'GENERAL',
            }
          ];
          _checkedTasks = List.filled(_actionableTasks.length, true);

          _uncertainItems = (res['uncertainItems'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

          // Also check OCR uncertain words
          if (widget.scanResult != null && widget.scanResult!.uncertainWords.isNotEmpty && _uncertainItems.isEmpty) {
            for (final word in widget.scanResult!.uncertainWords.take(4)) {
              _uncertainItems.add({
                'originalSnippet': word,
                'bestGuess': word,
                'field': 'OCR Handwriting',
                'reason': 'Low confidence handwritten word. Please verify.',
              });
            }
          }

          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _documentType = widget.scanResult?.documentType ?? 'GENERAL_NOTE';
          _suggestedTitle = 'Scanned Document';
          _actionableTasks = [
            {'title': 'Review captured document', 'priority': 'MEDIUM', 'isExplicitCommitment': true}
          ];
          _checkedTasks = [true];
          _isLoading = false;
        });
      }
    }
  }

  void _commitToSecondBrain() {
    final selectedTasks = <String>[];
    final selectedTaskObjects = <Map<String, dynamic>>[];
    for (int i = 0; i < _actionableTasks.length; i++) {
      if (i < _checkedTasks.length && _checkedTasks[i]) {
        final t = _actionableTasks[i];
        selectedTaskObjects.add(t);
        selectedTasks.add(t['title']?.toString() ?? 'Action item');
      }
    }

    try {
      // 1. Create Note in notesProvider
      final note = NoteModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: _suggestedTitle,
        content: widget.rawThought,
        snippet: _isRecipe
            ? 'Recipe with ${_ingredients.length} ingredients & ${_prepTasks.length + _cookingTasks.length} steps'
            : (selectedTasks.isNotEmpty ? '${selectedTasks.length} task(s): ${selectedTasks.first}' : widget.rawThought),
        date: 'Just now',
        category: _isRecipe ? 'Cooking' : 'Ideas',
        tag: widget.imagePath != null ? 'SCAN' : 'NOTE',
        tagColor: _isRecipe ? AppColors.amber : (widget.imagePath != null ? AppColors.matrixEmerald : AppColors.primary),
        icon: _isRecipe ? Icons.restaurant_menu_rounded : (widget.imagePath != null ? Icons.document_scanner_rounded : Icons.auto_awesome_rounded),
        extractedTasks: selectedTasks,
        imagePaths: widget.imagePath != null ? [widget.imagePath!] : const [],
      );
      ref.read(notesProvider.notifier).addNote(note);

      // 2. If Shopping List exists, create a SmartListModel
      if (_shoppingList.isNotEmpty) {
        final smartList = SmartListModel(
          id: 'list_${DateTime.now().millisecondsSinceEpoch}',
          title: 'Shopping List: $_suggestedTitle',
          isAiGenerated: true,
          items: _shoppingList.map((item) => SmartListItemModel(
            id: 'item_${item.hashCode}_${DateTime.now().millisecondsSinceEpoch}',
            content: item,
            isCompleted: false,
          )).toList(),
        );
        ref.read(smartListsProvider.notifier).addList(smartList);
      }

      // 3. Add committed tasks to tasksProvider (deduplicating against existing)
      if (selectedTaskObjects.isNotEmpty) {
        ref.read(tasksProvider.notifier).addExtractedTasks(
          selectedTaskObjects,
          project: _isRecipe ? 'Kitchen & Recipe' : 'General',
          sourceNote: _suggestedTitle,
        );
      }

      // 4. Also add preparation and cooking tasks if user has recipe
      if (_isRecipe) {
        final recipeSteps = <String>[];
        for (final pt in _prepTasks) {
          recipeSteps.add('[Prep] ${pt['instruction']}');
        }
        for (final ct in _cookingTasks) {
          recipeSteps.add('[Cook] ${ct['instruction']}');
        }
        if (recipeSteps.isNotEmpty) {
          ref.read(tasksProvider.notifier).addExtractedTasks(
            recipeSteps,
            project: 'Cooking: $_suggestedTitle',
            sourceNote: _suggestedTitle,
          );
        }
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
          content: Text(_isRecipe
              ? 'Saved Recipe! Created shopping list & tasks in Second Brain.'
              : 'Saved to Second Brain! ${selectedTasks.length} task(s) created.'),
          duration: const Duration(milliseconds: 2200),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeSlideIn(
      child: Container(
        height: MediaQuery.of(context).size.height * 0.88,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border.all(
            color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
            width: 0.8,
          ),
        ),
        child: SafeArea(
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
              const SizedBox(height: 14),

              // Header bar with Doc Type Selector
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _isRecipe ? Icons.restaurant_menu_rounded : Icons.document_scanner_rounded,
                      color: AppColors.primary,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SECOND BRAIN DOCUMENT INTELLIGENCE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Confidence: ${(_confidenceScore * 100).toInt()}% • Dynamic Classification',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Document type badge / selector
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _availableDocTypes.contains(_documentType) ? _documentType : 'GENERAL_NOTE',
                        isDense: true,
                        icon: const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.primary),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                        dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _documentType = val;
                              _isRecipe = val == 'RECIPE' || val == 'COOKBOOK';
                            });
                          }
                        },
                        items: _availableDocTypes.map((t) => DropdownMenuItem(
                          value: t,
                          child: Text(t.replaceAll('_', ' ')),
                        )).toList(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Title Header
              Text(
                _suggestedTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              if (_summary.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  _summary,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ],
              const SizedBox(height: 10),

              // Main Body Content
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(color: AppColors.primary),
                            SizedBox(height: 14),
                            Text(
                              'Analyzing handwriting, recipe structures & commitments...',
                              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      )
                    : SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Cookbook multi-recipe selector if present
                            if (_detectedRecipes.length > 1) ...[
                              _buildCookbookSelector(isDark),
                              const SizedBox(height: 14),
                            ],

                            // Uncertain Items Review Card (Flagged low-confidence handwriting)
                            if (_uncertainItems.isNotEmpty) ...[
                              _buildUncertainItemsCard(isDark),
                              const SizedBox(height: 14),
                            ],

                            // Dedicated Recipe View vs General Task View
                            if (_isRecipe) ...[
                              _buildRecipeTabs(isDark),
                              const SizedBox(height: 14),
                              _buildRecipeTabContent(isDark),
                            ] else ...[
                              _buildActionableTasksCard(isDark),
                            ],
                          ],
                        ),
                      ),
              ),

              const SizedBox(height: 12),

              // Commit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _commitToSecondBrain,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    _isRecipe
                        ? 'Save Recipe & Generate Smart Shopping List'
                        : 'Commit (${_actionableTasks.where((t) => _checkedTasks.isNotEmpty && _checkedTasks[_actionableTasks.indexOf(t)]).length}) Tasks to Second Brain',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCookbookSelector(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.amber.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.menu_book_rounded, color: AppColors.amber, size: 16),
              const SizedBox(width: 8),
              Text(
                'COOKBOOK DETECTED (${_detectedRecipes.length} RECIPES)',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.amber),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Select which recipe you want to import into your personal recipe collection:',
            style: TextStyle(fontSize: 11),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: List.generate(_detectedRecipes.length, (i) {
              final r = _detectedRecipes[i];
              final isSel = i == _selectedRecipeIndex;
              return ChoiceChip(
                label: Text(r['title']?.toString() ?? 'Recipe ${i + 1}'),
                selected: isSel,
                onSelected: (val) {
                  if (val) setState(() => _selectedRecipeIndex = i);
                },
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isSel ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildUncertainItemsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.rose.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.rose, size: 16),
              SizedBox(width: 8),
              Text(
                'UNCERTAIN HANDWRITING / ITEMS FLAGGED',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.rose),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'The following text was ambiguous or smudged. Tap to confirm or edit:',
            style: TextStyle(fontSize: 11),
          ),
          const SizedBox(height: 8),
          for (final unc in _uncertainItems)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurfaceSubtle : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '“${unc['originalSnippet']}”',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Best guess: ${unc['bestGuess']} (${unc['reason']})',
                      style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRecipeTabs(bool isDark) {
    return Container(
      height: 38,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: Colors.white,
        unselectedLabelColor: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
        labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        tabs: [
          Tab(text: 'Ingredients (${_ingredients.length})'),
          Tab(text: 'Shopping (${_shoppingList.length})'),
          Tab(text: 'Prep & Cook (${_prepTasks.length + _cookingTasks.length})'),
        ],
      ),
    );
  }

  Widget _buildRecipeTabContent(bool isDark) {
    return AnimatedBuilder(
      animation: _tabController,
      builder: (context, _) {
        final index = _tabController.index;
        if (index == 0) {
          // Ingredients
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final ing in _ingredients)
                Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.circle, size: 6, color: AppColors.amber),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          ing['raw']?.toString() ?? '',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (ing['isOptional'] == true)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text('Optional', style: TextStyle(fontSize: 9, color: AppColors.emerald)),
                        ),
                    ],
                  ),
                ),
            ],
          );
        } else if (index == 1) {
          // Shopping List
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final shop in _shoppingList)
                Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shopping_bag_outlined, size: 14, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          shop,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        } else {
          // Prep & Cook tasks
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_prepTasks.isNotEmpty) ...[
                const Text('PREPARATION PHASE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.electricViolet)),
                const SizedBox(height: 6),
                for (final pt in _prepTasks)
                  _buildRecipeStepItem(pt['stepNumber']?.toString() ?? '•', pt['instruction']?.toString() ?? '', 'Prep', isDark),
                const SizedBox(height: 10),
              ],
              if (_cookingTasks.isNotEmpty) ...[
                const Text('COOKING PHASE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.amber)),
                const SizedBox(height: 6),
                for (final ct in _cookingTasks)
                  _buildRecipeStepItem(ct['stepNumber']?.toString() ?? '•', ct['instruction']?.toString() ?? '', 'Cook', isDark),
              ],
            ],
          );
        }
      },
    );
  }

  Widget _buildRecipeStepItem(String num, String instruction, String phase, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: phase == 'Prep' ? AppColors.electricViolet.withValues(alpha: 0.2) : AppColors.amber.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              num,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: phase == 'Prep' ? AppColors.electricViolet : AppColors.amber,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              instruction,
              style: const TextStyle(fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionableTasksCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.checklist_rounded, size: 16, color: AppColors.emerald),
              const SizedBox(width: 8),
              Text(
                'ACTIONABLE COMMITMENTS (${_actionableTasks.length} DETECTED)',
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
          for (int i = 0; i < _actionableTasks.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _checkedTasks[i] = !_checkedTasks[i];
                  });
                },
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _checkedTasks[i] ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                      size: 18,
                      color: _checkedTasks[i] ? AppColors.emerald : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _actionableTasks[i]['title']?.toString() ?? '',
                            style: TextStyle(
                              fontSize: 13,
                              decoration: _checkedTasks[i] ? TextDecoration.lineThrough : null,
                              color: _checkedTasks[i]
                                  ? (isDark ? AppColors.darkTextMuted : AppColors.textMuted)
                                  : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                              fontWeight: _checkedTasks[i] ? FontWeight.normal : FontWeight.w600,
                            ),
                          ),
                          if (_actionableTasks[i]['category'] != null)
                            Text(
                              'Category: ${_actionableTasks[i]['category']} • Explicit Commitment',
                              style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                            ),
                        ],
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
}
