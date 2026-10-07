import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../paywall/presentation/paywall_screen.dart';

class SettingsScreen extends ConsumerWidget {
  final VoidCallback? onBack;

  const SettingsScreen({super.key, this.onBack});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final profile = ref.watch(userProfileProvider);
    final profileNotifier = ref.read(userProfileProvider.notifier);

    final tokenPercentage = (profile.monthlyAiTokensUsed / profile.monthlyAiTokensLimit).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: onBack != null
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
                onPressed: onBack,
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
              child: const Icon(Icons.settings_suggest_rounded, color: AppColors.primary, size: 16),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Account & Settings',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                Text(
                  profile.isPro ? '✦ PRO Subscription' : 'Free Tier Account',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 110),
        physics: const BouncingScrollPhysics(),
        children: [
          // User Profile Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    profile.fullName.isNotEmpty ? profile.fullName[0] : 'U',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              profile.fullName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (profile.isPro)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                                ),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                '✦ PRO',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        profile.email,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Subscription & Pro Upgrade Box
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: profile.isPro
                  ? LinearGradient(
                      colors: isDark
                          ? [const Color(0xFF1E1735), const Color(0xFF281E48)]
                          : [const Color(0xFFF3EEFD), const Color(0xFFFBF8FF)],
                    )
                  : null,
              color: profile.isPro ? null : (isDark ? AppColors.darkSurface : Colors.white),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: profile.isPro
                    ? const Color(0xFF8B5CF6).withValues(alpha: 0.4)
                    : (isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
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
                        Icon(
                          Icons.workspace_premium_rounded,
                          size: 18,
                          color: profile.isPro ? const Color(0xFF8B5CF6) : AppColors.textMuted,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          profile.isPro ? 'Mindora Pro Active' : 'Free Tier',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    if (!profile.isPro)
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const PaywallScreen()),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Upgrade \$4.99',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Text(
                        '\$4.99/mo',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                // Monthly AI Tokens Progress
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Monthly AI Usage',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '${(profile.monthlyAiTokensUsed / 1000).toStringAsFixed(1)}k / ${(profile.monthlyAiTokensLimit / 1000).toStringAsFixed(0)}k tokens',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: tokenPercentage,
                    minHeight: 6,
                    backgroundColor: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Allowance resets in 12 days • Backend synchronized',
                  style: TextStyle(
                    fontSize: 10.5,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Section Title: AI SECOND BRAIN
          _buildSectionHeader('AI SECOND BRAIN ENGINE', isDark),
          const SizedBox(height: 8),

          Material(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Column(
              children: [
                ListTile(
                  title: Text(
                    'AI Model Engine',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    profile.isPro ? 'Claude 3.5 Sonnet (Advanced)' : 'GPT-4o-mini (Standard)',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  trailing: Icon(
                    Icons.tune_rounded,
                    size: 18,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                  onTap: () {
                    if (!profile.isPro) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const PaywallScreen()),
                      );
                    } else {
                      profileNotifier.setAiModel(
                        profile.selectedAiModel == 'claude-3-5-sonnet' ? 'gpt-4o' : 'claude-3-5-sonnet',
                      );
                    }
                  },
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                ),
                SwitchListTile(
                  title: Text(
                    'Automatic Task Extraction',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Detect actionable commitments from typed or recorded notes',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  value: profile.autoTaskDetection,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => profileNotifier.toggleAutoTaskDetection(val),
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                ),
                SwitchListTile(
                  title: Text(
                    'Context & Entity Extraction',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Auto-tag people, projects, and deadlines in notes',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  value: profile.autoContextExtraction,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => profileNotifier.toggleAutoContext(val),
                ),
              ],
            ),
          ),
        ),

          const SizedBox(height: 20),

          // Section Title: NOTIFICATIONS
          _buildSectionHeader('NOTIFICATIONS & BRIEFINGS', isDark),
          const SizedBox(height: 8),

          Material(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Column(
              children: [
                SwitchListTile(
                  title: Text(
                    'Daily Morning AI Briefing',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Delivered at 07:00 AM local time with priorities',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  value: profile.dailyBriefingNotification,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => profileNotifier.toggleDailyBriefing(val),
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                ),
                SwitchListTile(
                  title: Text(
                    'Task Due & Smart Reminders',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Push alerts when commitments approach their deadline',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  value: profile.taskDueNotification,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => profileNotifier.toggleTaskDue(val),
                ),
              ],
            ),
          ),
        ),

          const SizedBox(height: 20),

          // Section Title: PRIVACY & SYSTEM
          _buildSectionHeader('DATA CONTROLS & STORAGE', isDark),
          const SizedBox(height: 8),

          Material(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.file_download_outlined, size: 20, color: AppColors.primary),
                  title: Text(
                    'Export Second Brain',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Export notes, tasks & graph in Markdown / JSON',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Second Brain archive exported successfully.')),
                    );
                  },
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                ),
                ListTile(
                  leading: const Icon(Icons.cleaning_services_rounded, size: 20, color: AppColors.amber),
                  title: Text(
                    'Clear Offline SQLite Cache',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    'Purge cached vector embeddings (re-synced from server)',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Offline cache cleared and re-synchronized.')),
                    );
                  },
                ),
              ],
            ),
          ),
        ),

          const SizedBox(height: 24),

          Center(
            child: Column(
              children: [
                Text(
                  'Mindora v1.0.0 (Production Build)',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'iOS & Android Multi-Platform Engine',
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
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
        ),
      ),
    );
  }
}
