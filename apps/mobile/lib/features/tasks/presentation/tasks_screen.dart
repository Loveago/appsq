import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/task_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import 'widgets/smart_lists_view.dart';

class TasksScreen extends StatelessWidget {
  final VoidCallback? onBack;
  final Function(String sourceId)? onOpenSource;
  final int initialTab;

  const TasksScreen({
    super.key,
    this.onBack,
    this.onOpenSource,
    this.initialTab = 0,
  });

  @override
  Widget build(BuildContext context) {
    try {
      ProviderScope.containerOf(context, listen: false);
      return _TasksScreenView(
        onBack: onBack,
        onOpenSource: onOpenSource,
        initialTab: initialTab,
      );
    } catch (_) {
      return ProviderScope(
        child: _TasksScreenView(
          onBack: onBack,
          onOpenSource: onOpenSource,
          initialTab: initialTab,
        ),
      );
    }
  }
}

class _TasksScreenView extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final Function(String sourceId)? onOpenSource;
  final int initialTab;

  const _TasksScreenView({
    this.onBack,
    this.onOpenSource,
    this.initialTab = 0,
  });

  @override
  ConsumerState<_TasksScreenView> createState() => _TasksScreenViewState();
}

class _TasksScreenViewState extends ConsumerState<_TasksScreenView> {
  late int _mainTab; // 0: Tasks, 1: Smart Lists
  int _selectedFilterIndex = 0; // 0: All, 1: Urgent, 2: AI Extracted, 3: Completed
  final TextEditingController _newTaskController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _mainTab = widget.initialTab;
  }

  @override
  void dispose() {
    _newTaskController.dispose();
    super.dispose();
  }

  List<TaskModel> _filterTasks(List<TaskModel> tasks) {
    switch (_selectedFilterIndex) {
      case 1:
        return tasks.where((t) => t.priority == 'high' && !t.isCompleted).toList();
      case 2:
        return tasks.where((t) => t.isAiExtracted && !t.isCompleted).toList();
      case 3:
        return tasks.where((t) => t.isCompleted).toList();
      default:
        return tasks;
    }
  }

  void _addNewTask(String text) {
    if (text.trim().isEmpty) return;
    final newTask = TaskModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: text.trim(),
      project: 'Quick Capture',
      priority: 'medium',
      dueTime: 'Today',
      isAiExtracted: false,
      isCompleted: false,
    );
    ref.read(tasksProvider.notifier).addTask(newTask);
    _newTaskController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allTasks = ref.watch(tasksProvider);
    final filteredTasks = _filterTasks(allTasks);
    final activeCount = allTasks.where((t) => !t.isCompleted).length;
    final urgentCount = allTasks.where((t) => t.priority == 'high' && !t.isCompleted).length;
    final aiCount = allTasks.where((t) => t.isAiExtracted && !t.isCompleted).length;

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
                color: AppColors.emerald.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.emerald, size: 16),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Action Items',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                Text(
                  '$activeCount active tasks • AI Synced',
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
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('AI re-analyzed your notes and extracted 1 new task.'),
                  duration: Duration(milliseconds: 1400),
                ),
              );
            },
            icon: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 16),
            ),
            tooltip: 'Sync AI Tasks',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Segmented Switch: Action Items vs Smart Lists
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _mainTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      decoration: BoxDecoration(
                        color: _mainTab == 0
                            ? (isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _mainTab == 0
                              ? AppColors.primary
                              : (isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                          width: 0.8,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'My Tasks',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: _mainTab == 0 ? FontWeight.w700 : FontWeight.w500,
                          color: _mainTab == 0
                              ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                              : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _mainTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      decoration: BoxDecoration(
                        color: _mainTab == 1
                            ? (isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _mainTab == 1
                              ? AppColors.primary
                              : (isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                          width: 0.8,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '✦ Smart Lists',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: _mainTab == 1 ? FontWeight.w700 : FontWeight.w500,
                          color: _mainTab == 1
                              ? AppColors.primary
                              : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_mainTab == 1)
            const Expanded(child: SmartListsView())
          else ...[
            // Filter Chips
            Container(
              height: 38,
              margin: const EdgeInsets.fromLTRB(20, 6, 20, 12),
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                children: [
                  _buildFilterChip(0, 'All (${allTasks.length})', isDark),
                  _buildFilterChip(1, 'Urgent ($urgentCount)', isDark),
                  _buildFilterChip(2, '✦ AI Extracted ($aiCount)', isDark),
                  _buildFilterChip(3, 'Completed', isDark),
                ],
              ),
            ),

            // Quick Add Input Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
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
                    const Icon(Icons.add_task_rounded, color: AppColors.primary, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _newTaskController,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Add an action or type raw thought...',
                          hintStyle: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          ),
                          border: InputBorder.none,
                        ),
                        onSubmitted: _addNewTask,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => _addNewTask(_newTaskController.text),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.arrow_upward_rounded, size: 14, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Task List
            Expanded(
              child: filteredTasks.isEmpty
                  ? Center(
                      child: Text(
                        'No tasks in this category',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                      physics: const BouncingScrollPhysics(),
                      itemCount: filteredTasks.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final task = filteredTasks[index];
                        return _buildTaskCard(task, isDark, index);
                      },
                    ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterChip(int index, String label, bool isDark) {
    final isSelected = _selectedFilterIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilterIndex = index),
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

  Widget _buildTaskCard(TaskModel task, bool isDark, int index) {
    Color priorityColor;
    if (task.priority == 'high') {
      priorityColor = AppColors.danger;
    } else if (task.priority == 'medium') {
      priorityColor = AppColors.amber;
    } else {
      priorityColor = AppColors.emerald;
    }

    return FadeSlideIn(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            ref.read(tasksProvider.notifier).toggleTask(task.id);
          },
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: task.isCompleted
                    ? (isDark ? AppColors.darkBorder : AppColors.surfaceBorder)
                    : (isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder),
                width: 0.8,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Checkbox indicator
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: task.isCompleted
                          ? AppColors.emerald
                          : (isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: task.isCompleted
                            ? AppColors.emerald
                            : (isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder),
                        width: 1.2,
                      ),
                    ),
                    child: task.isCompleted
                        ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                        : null,
                  ),
                ),

                const SizedBox(width: 14),

                // Task Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // Priority Dot
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: priorityColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          // Project Tag
                          Text(
                            task.project.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                          if (task.isAiExtracted) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.auto_awesome_rounded, size: 8, color: AppColors.primary),
                                  SizedBox(width: 3),
                                  Text(
                                    'AI EXTRACTED',
                                    style: TextStyle(
                                      fontSize: 8,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const Spacer(),
                          Text(
                            task.dueTime,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 6),

                      // Title
                      Text(
                        task.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                          color: task.isCompleted
                              ? (isDark ? AppColors.darkTextMuted : AppColors.textMuted)
                              : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                        ),
                      ),

                      if (task.sourceNote != null) ...[
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () => widget.onOpenSource?.call(task.id),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.link_rounded, size: 11, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text(
                                  task.sourceNote!,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
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
