import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/app_state_providers.dart';

class SmartListsView extends ConsumerStatefulWidget {
  const SmartListsView({super.key});

  @override
  ConsumerState<SmartListsView> createState() => _SmartListsViewState();
}

class _SmartListsViewState extends ConsumerState<SmartListsView> {
  final TextEditingController _aiPromptController = TextEditingController();
  final TextEditingController _addItemController = TextEditingController();
  bool _isGenerating = false;

  @override
  void dispose() {
    _aiPromptController.dispose();
    _addItemController.dispose();
    super.dispose();
  }

  void _triggerAiListGeneration(String prompt) {
    if (prompt.trim().isEmpty) return;

    setState(() => _isGenerating = true);

    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;

      final input = prompt.trim();
      List<String> items = [];
      String title = input;

      if (input.toLowerCase().contains('office') || input.toLowerCase().contains('shopping')) {
        title = 'Office Setup Checklist';
        items = [
          'Ergonomic Monitor Arm',
          'USB-C Docking Station 100W',
          'Noise Canceling Headphones',
          'Surge Protector Power Strip',
          'Desk Mat & Wrist Rest',
        ];
      } else if (input.toLowerCase().contains('pack') || input.toLowerCase().contains('trip')) {
        title = 'Conference Trip Packing';
        items = [
          'Passport & Flight Confirmation',
          'Laptop & MagSafe Charger',
          'Universal Power Adapter',
          'Business Cards',
          'Casual & Business Attire',
        ];
      } else {
        title = 'AI Curated: $input';
        items = [
          'Core Deliverable 1',
          'Review specifications with stakeholders',
          'Draft implementation milestones',
          'Verify edge cases and fallback rules',
        ];
      }

      ref.read(smartListsProvider.notifier).generateAiList(title, items);
      _aiPromptController.clear();
      setState(() => _isGenerating = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final smartLists = ref.watch(smartListsProvider);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      physics: const BouncingScrollPhysics(),
      children: [
        // AI Natural Language List Creator Bar
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(16),
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
                  const Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    'AI SMART LIST GENERATOR',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _aiPromptController,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: 'e.g. "Create a shopping list for my new office"',
                        hintStyle: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                      onSubmitted: _triggerAiListGeneration,
                    ),
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton(
                    onPressed: _isGenerating ? null : () => _triggerAiListGeneration(_aiPromptController.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _isGenerating
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            'Generate',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        if (smartLists.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'No smart lists yet. Use the prompt above to generate your first checklist.',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
            ),
          ),

        // Lists Rendering
        for (final list in smartLists) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // List Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.format_list_bulleted_rounded, size: 14, color: AppColors.primary),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          list.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (list.isAiGenerated)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '✦ AI',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                // Checklist Items
                for (final item in list.items)
                  GestureDetector(
                    onTap: () => ref.read(smartListsProvider.notifier).toggleItem(list.id, item.id),
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        children: [
                          Icon(
                            item.isCompleted ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                            size: 18,
                            color: item.isCompleted ? AppColors.emerald : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              item.content,
                              style: TextStyle(
                                fontSize: 13,
                                color: item.isCompleted
                                    ? (isDark ? AppColors.darkTextMuted : AppColors.textMuted)
                                    : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                                decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Quick Add Item
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Add an item to ${list.title}...',
                            hintStyle: TextStyle(
                              fontSize: 11.5,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                            border: InputBorder.none,
                            isDense: true,
                          ),
                          onSubmitted: (val) {
                            if (val.trim().isNotEmpty) {
                              ref.read(smartListsProvider.notifier).addItem(list.id, val.trim());
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
