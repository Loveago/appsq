import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/models/reminder_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../notes/presentation/note_editor_screen.dart';

class RemindersScreen extends ConsumerStatefulWidget {
  const RemindersScreen({super.key});

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reminders = ref.watch(remindersProvider);

    final upcoming = reminders.where((r) => !r.isCompleted && !r.isCancelled && !r.isOverdue).toList();
    final overdue = reminders.where((r) => r.isOverdue).toList();
    final completed = reminders.where((r) => r.isCompleted).toList();

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        backgroundColor: AppColors.darkBackground,
        elevation: 0,
        title: const Text(
          'Reminders & Follow-ups',
          style: TextStyle(
            color: AppColors.darkTextPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.darkTextSecondary, size: 20),
            tooltip: 'Refresh',
            onPressed: () => ref.read(remindersProvider.notifier).loadReminders(),
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 2,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.darkTextSecondary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.normal),
          tabs: [
            Tab(text: 'Upcoming (${upcoming.length})'),
            Tab(text: 'Overdue (${overdue.length})'),
            Tab(text: 'Done (${completed.length})'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_alarm_rounded, color: Colors.white, size: 20),
        label: const Text(
          'New Reminder',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
        ),
        onPressed: () => _showCreateReminderDialog(context),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildReminderList(upcoming, 'No upcoming reminders. Set a reminder for notes, tasks, or follow-ups.'),
          _buildReminderList(overdue, 'No overdue reminders! You are completely on track.'),
          _buildReminderList(completed, 'No completed reminders yet.'),
        ],
      ),
    );
  }

  Widget _buildReminderList(List<ReminderModel> items, String emptyMessage) {
    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: const Icon(Icons.access_time_rounded, color: AppColors.darkTextMuted, size: 28),
              ),
              const SizedBox(height: 16),
              Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.darkTextSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.darkSurfaceElevated,
      onRefresh: () => ref.read(remindersProvider.notifier).loadReminders(),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = items[index];
          return _buildReminderCard(item);
        },
      ),
    );
  }

  Widget _buildReminderCard(ReminderModel item) {
    final effectiveTime = item.snoozedUntil ?? item.remindAt;
    final isOverdue = item.isOverdue;

    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.red.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 24),
      ),
      onDismissed: (_) {
        ref.read(remindersProvider.notifier).deleteReminder(item.id);
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.darkSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isOverdue ? AppColors.rose.withValues(alpha: 0.4) : AppColors.darkBorder,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Completion checkbox
                GestureDetector(
                  onTap: () {
                    if (!item.isCompleted) {
                      ref.read(remindersProvider.notifier).completeReminder(item.id);
                    }
                  },
                  child: Container(
                    width: 22,
                    height: 22,
                    margin: const EdgeInsets.only(top: 2, right: 10),
                    decoration: BoxDecoration(
                      color: item.isCompleted ? AppColors.matrixEmerald : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: item.isCompleted ? AppColors.matrixEmerald : AppColors.darkTextMuted,
                        width: 1.8,
                      ),
                    ),
                    child: item.isCompleted
                        ? const Icon(Icons.check, size: 14, color: AppColors.darkBackground)
                        : null,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          color: AppColors.darkTextPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      if (item.description != null && item.description!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          item.description!,
                          style: const TextStyle(
                            color: AppColors.darkTextSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (!item.isCompleted)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded, color: AppColors.darkTextMuted, size: 18),
                    color: AppColors.darkSurfaceElevated,
                    onSelected: (action) {
                      if (action == 'snooze_15') {
                        ref.read(remindersProvider.notifier).snoozeReminder(item.id, minutes: 15);
                      } else if (action == 'snooze_60') {
                        ref.read(remindersProvider.notifier).snoozeReminder(item.id, minutes: 60);
                      } else if (action == 'snooze_tomorrow') {
                        ref.read(remindersProvider.notifier).snoozeReminder(item.id, minutes: 1440);
                      } else if (action == 'delete') {
                        ref.read(remindersProvider.notifier).deleteReminder(item.id);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'snooze_15',
                        child: Text('Snooze 15 minutes', style: TextStyle(color: AppColors.darkTextPrimary, fontSize: 13)),
                      ),
                      const PopupMenuItem(
                        value: 'snooze_60',
                        child: Text('Snooze 1 hour', style: TextStyle(color: AppColors.darkTextPrimary, fontSize: 13)),
                      ),
                      const PopupMenuItem(
                        value: 'snooze_tomorrow',
                        child: Text('Snooze to tomorrow', style: TextStyle(color: AppColors.darkTextPrimary, fontSize: 13)),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Text('Delete reminder', style: TextStyle(color: AppColors.rose, fontSize: 13)),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                // Scheduled time chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isOverdue ? AppColors.rose.withValues(alpha: 0.12) : AppColors.darkSurfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isOverdue ? AppColors.rose.withValues(alpha: 0.3) : AppColors.darkBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.access_time_rounded,
                        size: 12,
                        color: isOverdue ? AppColors.rose : AppColors.phosphorCyan,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        DateFormat('MMM d, h:mm a').format(effectiveTime),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isOverdue ? AppColors.rose : AppColors.darkTextPrimary,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                if (item.recurrenceRule != 'NONE') ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.electricViolet.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.electricViolet.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      item.recurrenceRule,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.electricViolet,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                // Linked note chip if present
                if (item.noteId != null && item.noteId!.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      final notes = ref.read(notesProvider);
                      final matches = notes.where((n) => n.id == item.noteId).toList();
                      if (matches.isNotEmpty) {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => NoteEditorScreen.fromNote(matches.first)),
                        );
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.notes_rounded, size: 12, color: AppColors.primary),
                          SizedBox(width: 4),
                          Text(
                            'Linked Note',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateReminderDialog(BuildContext context, {String? defaultNoteId, String? defaultTitle}) {
    final titleController = TextEditingController(text: defaultTitle ?? '');
    final descriptionController = TextEditingController();
    final aiInputController = TextEditingController();
    DateTime selectedDateTime = DateTime.now().add(const Duration(hours: 1));
    String recurrence = 'NONE';
    bool isAiParsing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Set a Reminder',
                        style: TextStyle(
                          color: AppColors.darkTextPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: AppColors.darkTextSecondary, size: 20),
                        onPressed: () => Navigator.of(modalCtx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // AI Natural Language input bar
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 14),
                            SizedBox(width: 6),
                            Text(
                              'AI Natural Language Parser',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: aiInputController,
                                style: const TextStyle(color: AppColors.darkTextPrimary, fontSize: 12),
                                decoration: const InputDecoration(
                                  isDense: true,
                                  hintText: 'e.g., "Remind me to call John tomorrow at 3pm"',
                                  hintStyle: TextStyle(color: AppColors.darkTextMuted, fontSize: 12),
                                  border: InputBorder.none,
                                ),
                              ),
                            ),
                            if (isAiParsing)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                              )
                            else
                              IconButton(
                                icon: const Icon(Icons.arrow_forward_rounded, color: AppColors.primary, size: 18),
                                onPressed: () async {
                                  final text = aiInputController.text.trim();
                                  if (text.isEmpty) return;
                                  setModalState(() => isAiParsing = true);
                                  final result = await ApiClient.instance.aiParseReminder(text);
                                  setModalState(() => isAiParsing = false);
                                  if (result != null) {
                                    if (result['title'] != null) {
                                      titleController.text = result['title'].toString();
                                    }
                                    if (result['remindAt'] != null) {
                                      final parsed = DateTime.tryParse(result['remindAt'].toString());
                                      if (parsed != null) {
                                        setModalState(() => selectedDateTime = parsed);
                                      }
                                    }
                                    if (result['recurrenceRule'] != null) {
                                      setModalState(() => recurrence = result['recurrenceRule'].toString());
                                    }
                                  }
                                },
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title field
                  TextField(
                    controller: titleController,
                    style: const TextStyle(color: AppColors.darkTextPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Reminder Title',
                      labelStyle: const TextStyle(color: AppColors.darkTextSecondary, fontSize: 13),
                      filled: true,
                      fillColor: AppColors.darkSurfaceElevated,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.darkBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.darkBorder),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Description field
                  TextField(
                    controller: descriptionController,
                    style: const TextStyle(color: AppColors.darkTextPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Notes or details (optional)',
                      labelStyle: const TextStyle(color: AppColors.darkTextSecondary, fontSize: 13),
                      filled: true,
                      fillColor: AppColors.darkSurfaceElevated,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.darkBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.darkBorder),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Date and time picker
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.darkBorder),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primary),
                          label: Text(
                            DateFormat('MMM d, y').format(selectedDateTime),
                            style: const TextStyle(color: AppColors.darkTextPrimary, fontSize: 12),
                          ),
                          onPressed: () async {
                            final date = await showDatePicker(
                              context: modalCtx,
                              initialDate: selectedDateTime,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (date != null) {
                              setModalState(() {
                                selectedDateTime = DateTime(
                                  date.year,
                                  date.month,
                                  date.day,
                                  selectedDateTime.hour,
                                  selectedDateTime.minute,
                                );
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.darkBorder),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.access_time_rounded, size: 16, color: AppColors.phosphorCyan),
                          label: Text(
                            DateFormat('h:mm a').format(selectedDateTime),
                            style: const TextStyle(color: AppColors.darkTextPrimary, fontSize: 12),
                          ),
                          onPressed: () async {
                            final time = await showTimePicker(
                              context: modalCtx,
                              initialTime: TimeOfDay.fromDateTime(selectedDateTime),
                            );
                            if (time != null) {
                              setModalState(() {
                                selectedDateTime = DateTime(
                                  selectedDateTime.year,
                                  selectedDateTime.month,
                                  selectedDateTime.day,
                                  time.hour,
                                  time.minute,
                                );
                              });
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Recurrence selector
                  Row(
                    children: [
                      const Text(
                        'Repeat:',
                        style: TextStyle(color: AppColors.darkTextSecondary, fontSize: 13),
                      ),
                      const SizedBox(width: 12),
                      DropdownButton<String>(
                        value: recurrence,
                        dropdownColor: AppColors.darkSurfaceElevated,
                        underline: const SizedBox(),
                        style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold),
                        items: const [
                          DropdownMenuItem(value: 'NONE', child: Text('Does not repeat')),
                          DropdownMenuItem(value: 'DAILY', child: Text('Daily')),
                          DropdownMenuItem(value: 'WEEKLY', child: Text('Weekly')),
                          DropdownMenuItem(value: 'MONTHLY', child: Text('Monthly')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => recurrence = val);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Create button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        final title = titleController.text.trim();
                        if (title.isEmpty) return;

                        await ref.read(remindersProvider.notifier).addReminder(
                              title: title,
                              description: descriptionController.text.trim().isNotEmpty
                                  ? descriptionController.text.trim()
                                  : null,
                              remindAt: selectedDateTime,
                              noteId: defaultNoteId,
                              recurrenceRule: recurrence,
                            );

                        if (context.mounted) {
                          Navigator.of(modalCtx).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Reminder set successfully')),
                          );
                        }
                      },
                      child: const Text(
                        'Save Reminder',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
