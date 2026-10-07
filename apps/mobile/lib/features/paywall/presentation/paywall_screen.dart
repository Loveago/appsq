import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';

class PaywallScreen extends StatefulWidget {
  final VoidCallback? onSelectFree;
  final VoidCallback? onSelectPro;

  const PaywallScreen({
    super.key,
    this.onSelectFree,
    this.onSelectPro,
  });

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  bool _isAnnual = true;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder, width: 0.8),
            ),
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
            ),
          ),
          onPressed: () => Navigator.maybePop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  gradient: AppColors.proGradient,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: const Text(
                  '✦ MINDORA PRO MEMBERSHIP',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              FadeSlideIn(
                child: Text(
                  'Unlimited Second Brain.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.8,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
              ),

              const SizedBox(height: 8),

              FadeSlideIn(
                offset: const Offset(0, 0.04),
                child: Text(
                  'Unlock continuous audio recording, neural RAG indexing, and automatic synthesis.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Billing Frequency Toggle
              Container(
                padding: const EdgeInsets.all(4),
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
                    _buildToggleItem(
                      title: 'Annual (Save 35%)',
                      isSelected: _isAnnual,
                      isDark: isDark,
                      onTap: () => setState(() => _isAnnual = true),
                    ),
                    _buildToggleItem(
                      title: 'Monthly',
                      isSelected: !_isAnnual,
                      isDark: isDark,
                      onTap: () => setState(() => _isAnnual = false),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Haute-Couture Obsidian Pro Card
              FadeSlideIn(
                child: Container(
                  padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.5),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.08),
                      blurRadius: 28,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'PRO ACCESS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.4,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 200),
                              child: Text(
                                _isAnnual ? '\$3.29' : '\$4.99',
                                key: ValueKey<bool>(_isAnnual),
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: AppColors.emerald.withValues(alpha: 0.3), width: 0.6),
                          ),
                          child: const Text(
                            '7-DAY FREE TRIAL',
                            style: TextStyle(
                              color: AppColors.emerald,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 6),
                    Text(
                      _isAnnual ? 'Billed annually at \$39.50/yr' : 'Billed monthly, cancel anytime',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 16),

                    _buildFeatureRow(
                      'Unlimited Neural Audio Recordings',
                      'High-fidelity meeting capture & automatic diarization',
                      isDark: isDark,
                    ),
                    _buildFeatureRow(
                      'RAG Grounded Intelligence & Graph',
                      'Instant citations connected directly to your raw thoughts',
                      isDark: isDark,
                    ),
                    _buildFeatureRow(
                      'Daily Executive Briefings & Audio Recap',
                      'Custom morning synthesis delivered to your lock screen',
                      isDark: isDark,
                    ),
                    _buildFeatureRow(
                      'Zero Latency Processing & Encryption',
                      'End-to-end zero knowledge local-first encryption',
                      isDark: isDark,
                    ),

                    const SizedBox(height: 24),

                    // Glowing Action Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          try {
                            ProviderScope.containerOf(context, listen: false).read(userProfileProvider.notifier).setPro(true);
                          } catch (_) {}

                          if (widget.onSelectPro != null) {
                            widget.onSelectPro!();
                          } else {
                            Navigator.maybePop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('✦ Welcome to Mindora Pro! 7-day trial activated.'),
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                          shadowColor: AppColors.primary.withValues(alpha: 0.4),
                        ),
                        child: const Text(
                          'Start 7-Day Free Trial',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: -0.2),
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    Center(
                      child: Text(
                        'Renews automatically. Cancel in 1-tap in Settings.',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

              const SizedBox(height: 20),

              TextButton(
                onPressed: widget.onSelectFree ?? () => Navigator.maybePop(context),
                child: Text(
                  'Continue with Free Tier (Limited features)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToggleItem({
    required String title,
    required bool isSelected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkSurfaceElevated : AppColors.surfaceSubtle)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? (isDark ? Colors.white : AppColors.primary)
                : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow(String title, String subtitle, {required bool isDark}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_rounded, color: AppColors.primary, size: 14),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
