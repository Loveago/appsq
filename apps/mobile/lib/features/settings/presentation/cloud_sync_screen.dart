import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/cloud_sync_service.dart';
import '../../../../core/providers/app_state_providers.dart';
import 'devices_screen.dart';

class CloudSyncScreen extends ConsumerStatefulWidget {
  const CloudSyncScreen({super.key});

  @override
  ConsumerState<CloudSyncScreen> createState() => _CloudSyncScreenState();
}

class _CloudSyncScreenState extends ConsumerState<CloudSyncScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cloudSyncProvider.notifier).refreshStatus();
    });
  }

  Future<void> _handleToggleSync(bool val) async {
    final isPro = ref.read(isProProvider);
    if (!isPro) {
      _showUpgradeDialog();
      return;
    }

    if (val) {
      // Explain upload before enabling
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Theme.of(context).brightness == Brightness.dark
              ? AppColors.darkSurface
              : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Enable Cloud Sync?'),
          content: const Text(
            'Your existing and future text notes will synchronize encrypted across your devices. Voice recordings, meeting audio, and scanned documents remain strictly on your local device.\n\nWould you like to begin synchronization now?',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Enable & Sync'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        await ref.read(cloudSyncProvider.notifier).enableSync(ref: ref);
      }
    } else {
      await ref.read(cloudSyncProvider.notifier).disableSync();
    }
  }

  void _showUpgradeDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.darkSurface
            : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.cloud_sync_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Pro Feature', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Automatic cloud synchronization is available exclusively for VyNotes Pro subscribers. Free users can continue creating, editing, and searching local notes completely offline and export manual backups anytime.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Maybe Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/paywall');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Upgrade to Pro'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDeleteCloudData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.darkSurface
            : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.rose, size: 24),
            SizedBox(width: 8),
            Text('Delete Cloud Notes?'),
          ],
        ),
        content: const Text(
          'This will permanently delete your notes from cloud servers. Local notes currently on this device will NOT be deleted, but other devices will no longer synchronize with this data.\n\nThis action cannot be undone.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.rose,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete Cloud Data'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await ref.read(cloudSyncProvider.notifier).deleteCloudData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'All cloud note data has been deleted. Local notes remain safe on this device.'
                : 'Failed to delete cloud data. Please check connection.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final syncState = ref.watch(cloudSyncProvider);
    final isPro = ref.watch(isProProvider);
    final localNotes = ref.watch(notesProvider);

    final usedKb = (syncState.storageUsedBytes / 1024).toStringAsFixed(1);
    final quotaMb = (syncState.storageQuotaBytes / (1024 * 1024)).toStringAsFixed(0);
    final progress = syncState.storageQuotaBytes > 0
        ? (syncState.storageUsedBytes / syncState.storageQuotaBytes).clamp(0.0, 1.0)
        : 0.0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.surface,
      appBar: AppBar(
        title: const Text('Cloud Sync & Storage', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // 1. Master Toggle Bento Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.cloud_sync_rounded, color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text('Automatic Cloud Sync', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isPro
                                        ? AppColors.primary.withValues(alpha: 0.15)
                                        : AppColors.textMuted.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'PRO',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: isPro ? AppColors.primary : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isPro
                                  ? (syncState.cloudSyncEnabled ? 'Active & Synchronizing' : 'Sync is paused')
                                  : 'Requires VyNotes Pro subscription',
                              style: TextStyle(
                                fontSize: 12,
                                color: syncState.cloudSyncEnabled && isPro
                                    ? AppColors.matrixEmerald
                                    : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Switch(
                      value: syncState.cloudSyncEnabled && isPro,
                      onChanged: _handleToggleSync,
                      activeThumbColor: AppColors.primary,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.security_rounded, size: 16, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Text notes only. Audio memos, voice notes, meeting recordings, scanned images, and media files are strictly local to your device and are never uploaded.',
                          style: TextStyle(
                            fontSize: 11,
                            height: 1.4,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Status & Manual Sync Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Synchronization Status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Last Synced', style: TextStyle(fontSize: 13, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)),
                    Text(
                      syncState.lastSyncTime != null
                          ? syncState.lastSyncTime!.split('T').first
                          : 'Never',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Pending Changes', style: TextStyle(fontSize: 13, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)),
                    Text(
                      '${syncState.pendingCount} items',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: syncState.pendingCount > 0 ? AppColors.amber : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (!isPro || !syncState.cloudSyncEnabled || syncState.isSyncing)
                        ? null
                        : () => ref.read(cloudSyncProvider.notifier).syncNow(ref: ref),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: isDark ? AppColors.darkSurfaceSubtle : Colors.grey[200],
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: syncState.isSyncing
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.sync_rounded, size: 18),
                    label: Text(syncState.isSyncing ? 'Syncing Notes...' : 'Sync Now', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Cloud Storage Usage Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Text Storage Quota', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text('$usedKb KB of $quotaMb MB', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.primary)),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: isDark ? AppColors.darkSurfaceSubtle : Colors.grey[200],
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Text notes consume very little space. A 25 MB quota holds approximately 12,000 full-length text documents.',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 4. Retention Policy Explainer Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Cloud Retention & Protection Policy', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 10),
                _buildRetentionItem(
                  icon: Icons.check_circle_outline_rounded,
                  title: 'Active Pro Subscription',
                  description: 'Retained continuously while your subscription is active.',
                  isDark: isDark,
                ),
                const SizedBox(height: 10),
                _buildRetentionItem(
                  icon: Icons.timer_outlined,
                  title: 'If Sync is Turned Off',
                  description: 'Cloud copies are preserved for 90 days. Local notes are never deleted.',
                  isDark: isDark,
                ),
                const SizedBox(height: 10),
                _buildRetentionItem(
                  icon: Icons.history_rounded,
                  title: 'If Subscription Expires',
                  description: '30-day grace period plus 60-day recovery window (90 days total) before server removal.',
                  isDark: isDark,
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 5. Account Actions: Devices, Export, and Delete Cloud Data
          Material(
            color: isDark ? AppColors.darkSurface : Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.devices_rounded, color: AppColors.primary, size: 22),
                    title: const Text('Devices & Sessions', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: const Text('Review authorized hardware and revoke access', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const DevicesScreen()));
                    },
                  ),
                  Divider(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.file_download_outlined, color: AppColors.matrixEmerald, size: 22),
                    title: const Text('Export Local Notes (JSON Backup)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: const Text('Available for Free & Pro accounts for local data sovereignty', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => ref.read(cloudSyncProvider.notifier).exportNotes(localNotes),
                  ),
                  Divider(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.delete_sweep_rounded, color: AppColors.rose, size: 22),
                    title: const Text('Delete Cloud Data', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.rose)),
                    subtitle: const Text('Purges server copies only; preserves notes on this device', style: TextStyle(fontSize: 12)),
                    onTap: _handleDeleteCloudData,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildRetentionItem({
    required IconData icon,
    required String title,
    required String description,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              const SizedBox(height: 1),
              Text(
                description,
                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
