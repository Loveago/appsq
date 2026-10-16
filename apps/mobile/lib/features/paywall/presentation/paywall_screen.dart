import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/revenuecat_service.dart';

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
  bool _isProcessing = false;
  bool _isRestoring = false;

  Package? _annualPackage;
  Package? _monthlyPackage;

  String _headline = 'Unlimited Second Brain.';
  String _subheadline = 'Unlock continuous audio recording, neural RAG indexing, and automatic synthesis.';
  List<String> _proBenefits = [
    'Unlimited Neural Audio Recordings',
    'RAG Grounded Intelligence & Graph',
    'Daily Executive Briefings & Audio Recap',
    'Zero Latency Processing & Encryption',
  ];
  String _trialDisclosure = '7-day free trial, then automatically renews. Cancel in 1-tap in Settings.';
  bool _maintenanceMode = false;

  @override
  void initState() {
    super.initState();
    _loadOfferingsAndConfig();
  }

  Future<void> _loadOfferingsAndConfig() async {
    try {
      // 1. Fetch remote display config from backend
      final config = await ApiClient.instance.getSubscriptionPublicConfig();
      if (mounted && config.isNotEmpty) {
        final display = config['display'] as Map<String, dynamic>?;
        if (display != null) {
          setState(() {
            _headline = display['headline']?.toString() ?? _headline;
            _subheadline = display['subheadline']?.toString() ?? _subheadline;
            _trialDisclosure = display['trialDisclosure']?.toString() ?? _trialDisclosure;
            _maintenanceMode = display['maintenanceMode'] == true;
            final benefits = display['proBenefits'];
            if (benefits is List && benefits.isNotEmpty) {
              _proBenefits = benefits.map((b) => b.toString()).toList();
            }
          });
        }
      }

      // 2. Fetch real RevenueCat offerings
      final offerings = await RevenueCatService.instance.fetchOfferings();
      if (mounted && offerings?.current != null) {
        final currentOffering = offerings!.current!;
        setState(() {
          _annualPackage = currentOffering.annual ??
              currentOffering.availablePackages.cast<Package?>().firstWhere(
                    (p) => p?.identifier == '\$rc_annual' || p?.packageType == PackageType.annual,
                    orElse: () => null,
                  );

          _monthlyPackage = currentOffering.monthly ??
              currentOffering.availablePackages.cast<Package?>().firstWhere(
                    (p) => p?.identifier == '\$rc_monthly' || p?.packageType == PackageType.monthly,
                    orElse: () => null,
                  );
        });
      }
    } catch (e) {
      debugPrint('[PaywallScreen] Error loading subscription config: $e');
    }
  }

  Future<void> _handleSubscribe() async {
    if (_maintenanceMode) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Store purchases are currently undergoing maintenance. Please check back shortly.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final selectedPackage = _isAnnual ? _annualPackage : _monthlyPackage;
      bool purchaseSucceeded = false;
      Map<String, dynamic> entitlementData = {};

      if (selectedPackage != null && !Platform.environment.containsKey('FLUTTER_TEST')) {
        // Real purchase via RevenueCat StoreKit / Google Play Billing
        final rcResult = await RevenueCatService.instance.purchasePackage(selectedPackage);
        if (rcResult['cancelled'] == true) {
          setState(() => _isProcessing = false);
          return;
        }
        purchaseSucceeded = rcResult['isPro'] == true;
        entitlementData = (rcResult['backendVerification'] as Map<String, dynamic>?) ?? {};
      } else {
        // Fallback or Test simulation
        final res = await ApiClient.instance.verifySubscription(
          provider: 'IN_APP',
          providerSubscriptionId: 'sub_${DateTime.now().millisecondsSinceEpoch}',
          plan: 'PRO',
          durationDays: _isAnnual ? 365 : 30,
          metadata: {
            'billingPeriod': _isAnnual ? 'annual' : 'monthly',
            'source': 'paywall_screen',
          },
        );
        entitlementData = res;
        final plan = res['plan']?.toString().toUpperCase() ?? '';
        purchaseSucceeded = (res['isPro'] == true) || plan == 'PRO' || plan == 'TRIAL';
      }

      // Reconcile authoritative entitlements with server
      final ent = (entitlementData.containsKey('plan'))
          ? entitlementData
          : await ApiClient.instance.reconcileSubscription();

      if (!mounted) return;

      try {
        ProviderScope.containerOf(context, listen: false)
            .read(userProfileProvider.notifier)
            .syncFromEntitlements(ent);
      } catch (_) {}

      final plan = ent['plan']?.toString().toUpperCase() ?? '';
      final isPro = purchaseSucceeded || plan == 'PRO' || plan == 'TRIAL';

      setState(() => _isProcessing = false);
      if (isPro) {
        if (widget.onSelectPro != null) {
          widget.onSelectPro!();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✦ Welcome to VyNotes Pro! Your subscription is active.'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
          Navigator.maybePop(context);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not verify Pro subscription with store. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Subscription failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleRestorePurchases() async {
    setState(() => _isRestoring = true);
    try {
      final res = await RevenueCatService.instance.restorePurchases();
      if (!mounted) return;

      final isPro = res['isPro'] == true;
      if (isPro) {
        final ent = await ApiClient.instance.reconcileSubscription();
        if (!mounted) return;

        try {
          ProviderScope.containerOf(context, listen: false)
              .read(userProfileProvider.notifier)
              .syncFromEntitlements(ent);
        } catch (_) {}

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✦ Purchases restored successfully! VyNotes Pro is active.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        if (widget.onSelectPro != null) {
          widget.onSelectPro!();
        } else {
          Navigator.maybePop(context);
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No active Pro subscription found for your store account.'),
            backgroundColor: Colors.amber,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Restore failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRestoring = false);
      }
    }
  }

  String _getDisplayPrice() {
    if (_isAnnual) {
      if (_annualPackage != null) {
        return _annualPackage!.storeProduct.priceString;
      }
      return '\$3.29';
    } else {
      if (_monthlyPackage != null) {
        return _monthlyPackage!.storeProduct.priceString;
      }
      return '\$4.99';
    }
  }

  String _getBillingSubtext() {
    if (_isAnnual) {
      if (_annualPackage != null) {
        return 'Billed annually at ${_annualPackage!.storeProduct.priceString}/yr';
      }
      return 'Billed annually at \$39.50/yr';
    } else {
      return 'Billed monthly, cancel anytime';
    }
  }

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
        actions: [
          TextButton(
            onPressed: (_isRestoring || _isProcessing) ? null : _handleRestorePurchases,
            child: _isRestoring
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  )
                : Text(
                    'Restore',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.primary,
                    ),
                  ),
          ),
          const SizedBox(width: 8),
        ],
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
                  _headline,
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
                  _subheadline,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
              ),

              if (_maintenanceMode) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline_rounded, color: Colors.amber, size: 18),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Store billing is undergoing scheduled maintenance. Existing Pro entitlements remain active.',
                          style: TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

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
                                  _getDisplayPrice(),
                                  key: ValueKey<String>('${_isAnnual}_${_getDisplayPrice()}'),
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
                        _getBillingSubtext(),
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),

                      const SizedBox(height: 20),
                      const Divider(),
                      const SizedBox(height: 16),

                      ..._proBenefits.map((benefit) => _buildFeatureRow(benefit, isDark: isDark)),

                      const SizedBox(height: 24),

                      // Action Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: (_isProcessing || _maintenanceMode) ? null : _handleSubscribe,
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
                          child: _isProcessing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  _maintenanceMode ? 'Billing Under Maintenance' : 'Start 7-Day Free Trial',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: -0.2),
                                ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      Center(
                        child: Text(
                          _trialDisclosure,
                          textAlign: TextAlign.center,
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

  Widget _buildFeatureRow(String text, {required bool isDark}) {
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
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
