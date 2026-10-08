import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_service.dart';
import '../../../../main.dart';
import '../../paywall/presentation/paywall_screen.dart';

class AccountProfileScreen extends ConsumerStatefulWidget {
  const AccountProfileScreen({super.key});

  @override
  ConsumerState<AccountProfileScreen> createState() => _AccountProfileScreenState();
}

class _AccountProfileScreenState extends ConsumerState<AccountProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _profileData;
  Map<String, dynamic>? _entitlementsData;

  @override
  void initState() {
    super.initState();
    _fetchAccountData();
  }

  Future<void> _fetchAccountData() async {
    setState(() => _isLoading = true);
    try {
      final profile = await ApiClient.instance.getProfile();
      final entitlements = await ApiClient.instance.getEntitlements();
      if (mounted) {
        setState(() {
          _profileData = profile;
          _entitlementsData = entitlements;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editName() async {
    final currentName = _profileData?['fullName'] ?? ref.read(userProfileProvider).fullName;
    final controller = TextEditingController(text: currentName);

    final newName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E2E),
        title: const Text('Update Full Name', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        content: TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Enter your name',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
            filled: true,
            fillColor: Colors.black26,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (newName != null && newName.isNotEmpty && mounted) {
      try {
        await ApiClient.instance.updateProfile(fullName: newName);
        ref.read(userProfileProvider.notifier).updateName(newName);
        _fetchAccountData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Name updated successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update name: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  Future<void> _changeEmail() async {
    final emailController = TextEditingController();
    final passController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E2E),
        title: const Text('Change Email Address', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'New Email Address',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Current Password',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Update Email', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      try {
        await ApiClient.instance.updateEmail(
          newEmail: emailController.text.trim(),
          password: passController.text,
        );
        ref.read(userProfileProvider.notifier).updateEmail(emailController.text.trim());
        _fetchAccountData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Email updated successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  Future<void> _changePassword() async {
    final curPassController = TextEditingController();
    final newPassController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E2E),
        title: const Text('Change Password', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: curPassController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Current Password',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newPassController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'New Password (min 8 characters)',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save Password', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      try {
        await ApiClient.instance.updatePassword(
          currentPassword: curPassController.text,
          newPassword: newPassController.text,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password updated successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  Future<void> _startTrial() async {
    try {
      await ApiClient.instance.startFreeTrial();
      _fetchAccountData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('7-Day Mindora Pro Trial Activated!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not activate trial: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteAccount() async {
    final passController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2A1515),
        title: const Text('Delete Account', style: TextStyle(color: Colors.redAccent, fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This action is irreversible. All your notes, audio transcripts, meetings, and AI conversations will be permanently deleted.',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: passController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter password to confirm',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                filled: true,
                fillColor: Colors.black38,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Permanently Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final success = await ApiClient.instance.deleteAccount(passController.text);
        if (success && mounted) {
          LocalStorageService.instance.clearAuthToken();
          ref.read(userProfileProvider.notifier).resetProfile();
          ref.read(isAuthenticatedProvider.notifier).state = false;
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete account: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final profile = ref.watch(userProfileProvider);

    final fullName = _profileData?['fullName'] ?? profile.fullName;
    final email = _profileData?['email'] ?? profile.email;
    final plan = _entitlementsData?['plan'] ?? (_profileData?['plan'] ?? (profile.isPro ? 'PRO' : 'FREE'));
    final isPro = plan == 'PRO';
    final isTrial = plan == 'TRIAL' || (_entitlementsData?['isTrialActive'] == true);
    final trialDays = _entitlementsData?['trialDaysRemaining'] ?? 0;

    final usage = _entitlementsData?['usage'] as Map<String, dynamic>?;
    final aiUsed = usage?['aiMessages']?['used'] ?? 0;
    final aiLimit = usage?['aiMessages']?['limit'] ?? 50;
    final scanUsed = usage?['documentScans']?['used'] ?? 0;
    final scanLimit = usage?['documentScans']?['limit'] ?? 10;
    final audioUsed = usage?['audioMinutes']?['used'] ?? 0;
    final audioLimit = usage?['audioMinutes']?['limit'] ?? 15;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Account & Profile',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 40),
              physics: const BouncingScrollPhysics(),
              children: [
                // Profile Avatar & Identity Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                      width: 0.8,
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                          style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        fullName.isNotEmpty ? fullName : 'Mindora Member',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.edit_outlined, size: 14, color: AppColors.primary),
                            label: const Text('Edit Name', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                            onPressed: _editName,
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.mail_outline_rounded, size: 14, color: AppColors.primary),
                            label: const Text('Change Email', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                            onPressed: _changeEmail,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Plan & Subscription Status Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: isPro
                        ? LinearGradient(
                            colors: isDark
                                ? [const Color(0xFF1E1735), const Color(0xFF281E48)]
                                : [const Color(0xFFF3EEFD), const Color(0xFFFBF8FF)],
                          )
                        : null,
                    color: isPro ? null : (isDark ? AppColors.darkSurface : Colors.white),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isPro
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
                                isPro ? Icons.workspace_premium_rounded : Icons.shield_outlined,
                                color: isPro ? const Color(0xFF8B5CF6) : AppColors.primary,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                isPro ? 'Mindora Pro' : (isTrial ? 'Free Trial Active' : 'Free Tier'),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          if (isTrial)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                '$trialDays days left',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.amber),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        isPro
                            ? 'You have unlimited access to multi-modal second brain intelligence.'
                            : (isTrial
                                ? 'Your 7-day full access trial is currently running. Upgrade anytime to keep unlimited intelligence.'
                                : 'Experience unlimited AI models, fast OCR scanning, and extended audio recording.'),
                        style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, height: 1.4),
                      ),
                      const SizedBox(height: 14),
                      if (!isPro)
                        Row(
                          children: [
                            if (!isTrial)
                              Expanded(
                                child: OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: AppColors.primary),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: _startTrial,
                                  child: const Text('Start 7-Day Trial', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w700)),
                                ),
                              ),
                            if (!isTrial) const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (ctx) => const PaywallScreen()));
                                },
                                child: const Text('Upgrade Pro \$4.99', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700)),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Authoritative Usage Limits Section
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 8),
                  child: Text(
                    'AUTHORITATIVE USAGE & QUOTAS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                ),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                      width: 0.8,
                    ),
                  ),
                  child: Column(
                    children: [
                      _buildUsageRow('AI Tokens Allowance', aiUsed, aiLimit, isDark),
                      Divider(height: 24, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                      _buildUsageRow('Voice Transcription (Minutes)', audioUsed, audioLimit, isDark),
                      Divider(height: 24, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                      _buildUsageRow('Document Scans & OCR', scanUsed, scanLimit, isDark),
                      Divider(height: 24, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Meeting Mode Intelligence', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isPro ? AppColors.matrixEmerald.withValues(alpha: 0.15) : Colors.white10,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(isPro ? Icons.check_circle_outline_rounded : Icons.lock_outline_rounded, size: 12, color: isPro ? AppColors.matrixEmerald : Colors.white54),
                                const SizedBox(width: 4),
                                Text(
                                  isPro ? 'Available' : 'Locked (Pro Only)',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isPro ? AppColors.matrixEmerald : Colors.white70),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Security & Credentials
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 8),
                  child: Text(
                    'SECURITY & DATA',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                      color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                    ),
                  ),
                ),

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
                          leading: const Icon(Icons.lock_reset_rounded, size: 20, color: AppColors.primary),
                          title: Text('Change Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)),
                          onTap: _changePassword,
                        ),
                        Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                        ListTile(
                          leading: const Icon(Icons.logout_rounded, size: 20, color: AppColors.amber),
                          title: Text('Sign Out', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)),
                          onTap: () {
                            ApiClient.instance.setAuthToken('');
                            LocalStorageService.instance.clearAuthToken();
                            ref.read(userProfileProvider.notifier).resetProfile();
                            ref.read(isAuthenticatedProvider.notifier).state = false;
                            Navigator.of(context).popUntil((route) => route.isFirst);
                          },
                        ),
                        Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
                        ListTile(
                          leading: const Icon(Icons.delete_forever_rounded, size: 20, color: Colors.redAccent),
                          title: const Text('Delete Account', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.redAccent)),
                          subtitle: Text('Permanently erase account and all second brain data', style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted)),
                          onTap: _deleteAccount,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildUsageRow(String label, int used, int limit, bool isDark) {
    final pct = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;
    Color barColor = AppColors.primary;
    String? warningBadge;
    if (pct >= 1.0) {
      barColor = Colors.redAccent;
      warningBadge = '100% (LIMIT)';
    } else if (pct >= 0.9) {
      barColor = Colors.orangeAccent;
      warningBadge = '90%';
    } else if (pct >= 0.75) {
      barColor = Colors.amber;
      warningBadge = '75%';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)),
                if (warningBadge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: barColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      warningBadge,
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: barColor),
                    ),
                  ),
                ],
              ],
            ),
            Text('$used / $limit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 5,
            backgroundColor: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
            valueColor: AlwaysStoppedAnimation<Color>(barColor),
          ),
        ),
      ],
    );
  }
}
