import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/models/notification_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../notes/presentation/note_editor_screen.dart';
import '../../tasks/presentation/tasks_screen.dart';
import '../../reminders/presentation/reminders_screen.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _selectedFilter = 'ALL'; // ALL, UNREAD, REMINDERS, ANNOUNCEMENTS

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationsProvider);
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    final filteredList = notifications.where((n) {
      if (_selectedFilter == 'UNREAD') return !n.isRead;
      if (_selectedFilter == 'REMINDERS') return n.category == 'REMINDER' || n.category == 'TASK_DUE';
      if (_selectedFilter == 'ANNOUNCEMENTS') return n.category == 'ANNOUNCEMENT';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        backgroundColor: AppColors.darkBackground,
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'Notification Center',
              style: TextStyle(
                color: AppColors.darkTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.done_all_rounded, color: AppColors.primary, size: 20),
              tooltip: 'Mark all as read',
              onPressed: () => ref.read(notificationsProvider.notifier).markAllAsRead(),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.darkTextSecondary, size: 20),
            tooltip: 'Refresh',
            onPressed: () => ref.read(notificationsProvider.notifier).loadNotifications(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildFilterChip('ALL', 'All (${notifications.length})'),
                const SizedBox(width: 8),
                _buildFilterChip('UNREAD', 'Unread ($unreadCount)'),
                const SizedBox(width: 8),
                _buildFilterChip('REMINDERS', 'Reminders & Tasks'),
                const SizedBox(width: 8),
                _buildFilterChip('ANNOUNCEMENTS', 'Announcements'),
              ],
            ),
          ),
          const Divider(color: AppColors.darkBorder, height: 1),

          // Notification List
          Expanded(
            child: filteredList.isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    color: AppColors.primary,
                    backgroundColor: AppColors.darkSurfaceElevated,
                    onRefresh: () => ref.read(notificationsProvider.notifier).loadNotifications(),
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      itemCount: filteredList.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = filteredList[index];
                        return _buildNotificationCard(item);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.darkSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.darkBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppColors.primary : AppColors.darkTextSecondary,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.darkBorder),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                color: AppColors.darkTextMuted,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Notifications',
              style: TextStyle(
                color: AppColors.darkTextPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _selectedFilter == 'UNREAD'
                  ? 'You have caught up with all your notifications.'
                  : 'You will receive reminders, system alerts, and note reviews here.',
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

  Widget _buildNotificationCard(NotificationModel item) {
    final isUnread = !item.isRead;

    IconData icon;
    Color iconColor;
    switch (item.category) {
      case 'REMINDER':
        icon = Icons.alarm_rounded;
        iconColor = AppColors.phosphorCyan;
        break;
      case 'TASK_DUE':
        icon = Icons.check_circle_outline_rounded;
        iconColor = AppColors.matrixEmerald;
        break;
      case 'NOTE_REVIEW':
        icon = Icons.menu_book_rounded;
        iconColor = AppColors.electricViolet;
        break;
      case 'MEETING':
        icon = Icons.groups_rounded;
        iconColor = AppColors.amberFilament;
        break;
      case 'VOICE_NOTE':
        icon = Icons.mic_rounded;
        iconColor = AppColors.phosphorCyan;
        break;
      case 'ANNOUNCEMENT':
        icon = Icons.campaign_rounded;
        iconColor = AppColors.solarOrange;
        break;
      default:
        icon = Icons.notifications_rounded;
        iconColor = AppColors.primary;
    }

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
        ref.read(notificationsProvider.notifier).deleteNotification(item.id);
      },
      child: GestureDetector(
        onTap: () => _handleNotificationTap(item),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isUnread ? AppColors.darkSurfaceElevated : AppColors.darkSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isUnread ? AppColors.primary.withValues(alpha: 0.3) : AppColors.darkBorder,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              color: AppColors.darkTextPrimary,
                              fontSize: 14,
                              fontWeight: isUnread ? FontWeight.bold : FontWeight.w500,
                            ),
                          ),
                        ),
                        if (isUnread) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: AppColors.phosphorCyan,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      style: const TextStyle(
                        color: AppColors.darkTextSecondary,
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _formatTimestamp(item.createdAt),
                      style: const TextStyle(
                        color: AppColors.darkTextMuted,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleNotificationTap(NotificationModel item) {
    if (!item.isRead) {
      ref.read(notificationsProvider.notifier).markAsRead(item.id);
    }

    final targetType = item.targetType?.toUpperCase() ?? '';
    final targetId = item.targetId;
    final deepLink = item.deepLink ?? '';

    if (targetType == 'NOTE' || deepLink.contains('/notes/')) {
      final noteId = targetId ?? (deepLink.split('/notes/').length > 1 ? deepLink.split('/notes/')[1] : null);
      if (noteId != null && noteId.isNotEmpty) {
        final notes = ref.read(notesProvider);
        final found = notes.where((n) => n.id == noteId).toList();
        if (found.isNotEmpty) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => NoteEditorScreen.fromNote(found.first)),
          );
        }
      }
    } else if (targetType == 'TASK' || deepLink.contains('/tasks')) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const TasksScreen()),
      );
    } else if (targetType == 'REMINDER' || deepLink.contains('/reminders')) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const RemindersScreen()),
      );
    }
  }

  String _formatTimestamp(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat.MMMd().format(time);
  }
}
