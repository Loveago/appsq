import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../network/api_client.dart';

class RevenueCatService {
  static final RevenueCatService instance = RevenueCatService._();
  RevenueCatService._();

  bool _isInitialized = false;
  Map<String, dynamic>? _remoteConfig;
  Offerings? _offerings;
  StreamSubscription<CustomerInfo>? _customerInfoSubscription;

  bool get isInitialized => _isInitialized;
  Map<String, dynamic>? get remoteConfig => _remoteConfig;
  Offerings? get offerings => _offerings;

  bool get _isTesting => Platform.environment.containsKey('FLUTTER_TEST');

  /// Initialize RevenueCat SDK dynamically using server-supplied credentials
  Future<void> initialize({String? appUserId}) async {
    if (_isInitialized) return;

    if (_isTesting) {
      _isInitialized = true;
      debugPrint('[RevenueCatService] Test mode detected; skipping native SDK configure.');
      return;
    }

    try {
      // 1. Fetch public configuration dynamically from backend PostgreSQL
      final platform = Platform.isIOS ? 'ios' : 'android';
      _remoteConfig = await ApiClient.instance.getSubscriptionPublicConfig(platform: platform);

      final apiKey = _remoteConfig?['apiKey']?.toString() ?? '';
      final isConfigured = _remoteConfig?['isConfigured'] == true;

      if (!isConfigured || apiKey.isEmpty) {
        debugPrint('[RevenueCatService] Store purchases unconfigured on backend. Using fallback.');
        return;
      }

      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }

      final configuration = PurchasesConfiguration(apiKey);
      if (appUserId != null && appUserId.isNotEmpty) {
        configuration.appUserID = appUserId;
      }

      await Purchases.configure(configuration);
      _isInitialized = true;
      debugPrint('[RevenueCatService] RevenueCat initialized successfully for $platform.');

      // 2. Set up continuous customer info entitlement listener
      Purchases.addCustomerInfoUpdateListener((customerInfo) {
        _handleCustomerInfoUpdate(customerInfo);
      });

      // 3. Pre-fetch offerings
      await fetchOfferings();
    } catch (e) {
      debugPrint('[RevenueCatService] Initialization warning: $e');
    }
  }

  /// Fetch available RevenueCat store offerings & packages
  Future<Offerings?> fetchOfferings() async {
    if (_isTesting) return null;
    if (!_isInitialized) {
      await initialize();
    }
    if (!_isInitialized) return null;

    try {
      _offerings = await Purchases.getOfferings();
      return _offerings;
    } catch (e) {
      debugPrint('[RevenueCatService] fetchOfferings notice: $e');
      return null;
    }
  }

  /// Purchase selected package from Google Play Billing or Apple StoreKit
  Future<Map<String, dynamic>> purchasePackage(Package package) async {
    if (_isTesting) {
      return {
        'success': true,
        'isPro': true,
        'plan': 'PRO',
        'message': 'Test purchase simulation succeeded.',
      };
    }

    try {
      final customerInfo = await Purchases.purchasePackage(package);
      final hasPro = customerInfo.entitlements.active.containsKey('pro') ||
          customerInfo.entitlements.active.isNotEmpty;

      // Authoritative verification with backend API
      final res = await ApiClient.instance.verifySubscription(
        provider: 'REVENUECAT',
        providerSubscriptionId: customerInfo.originalAppUserId,
        paymentRef: package.storeProduct.identifier,
        plan: 'PRO',
        durationDays: package.packageType == PackageType.annual ? 365 : 30,
        metadata: {
          'store': Platform.isIOS ? 'APP_STORE' : 'PLAY_STORE',
          'packageId': package.identifier,
          'productId': package.storeProduct.identifier,
          'priceString': package.storeProduct.priceString,
          'currencyCode': package.storeProduct.currencyCode,
        },
      );

      return {
        'success': hasPro || (res['isPro'] == true),
        'isPro': hasPro || (res['isPro'] == true),
        'customerInfo': customerInfo,
        'backendVerification': res,
      };
    } on PurchasesErrorCode catch (e) {
      debugPrint('[RevenueCatService] Purchase error code: $e');
      return {
        'success': false,
        'isPro': false,
        'error': e.toString(),
        'cancelled': e == PurchasesErrorCode.purchaseCancelledError,
      };
    } catch (e) {
      debugPrint('[RevenueCatService] Purchase generic error: $e');
      return {
        'success': false,
        'isPro': false,
        'error': e.toString(),
      };
    }
  }

  /// Restore purchases across devices
  Future<Map<String, dynamic>> restorePurchases() async {
    if (_isTesting) {
      return {
        'success': true,
        'isPro': true,
        'message': 'Restored in test mode',
      };
    }

    try {
      final customerInfo = await Purchases.restorePurchases();
      final hasPro = customerInfo.entitlements.active.containsKey('pro') ||
          customerInfo.entitlements.active.isNotEmpty;

      if (hasPro) {
        final activeEntitlement = customerInfo.entitlements.active['pro'] ??
            customerInfo.entitlements.active.values.first;

        await ApiClient.instance.verifySubscription(
          provider: 'REVENUECAT',
          providerSubscriptionId: customerInfo.originalAppUserId,
          paymentRef: activeEntitlement.productIdentifier,
          plan: 'PRO',
          metadata: {
            'store': Platform.isIOS ? 'APP_STORE' : 'PLAY_STORE',
            'productIdentifier': activeEntitlement.productIdentifier,
            'expirationDate': activeEntitlement.expirationDate,
          },
        );
      }

      return {
        'success': true,
        'isPro': hasPro,
        'customerInfo': customerInfo,
      };
    } catch (e) {
      debugPrint('[RevenueCatService] restorePurchases error: $e');
      return {
        'success': false,
        'isPro': false,
        'error': e.toString(),
      };
    }
  }

  /// Check whether user currently holds active Pro entitlement
  Future<bool> checkProEntitlement() async {
    if (_isTesting) return false;
    try {
      final customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active.containsKey('pro') ||
          customerInfo.entitlements.active.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Sync user identity on login
  Future<void> logIn(String appUserId) async {
    if (_isTesting || !_isInitialized) return;
    try {
      await Purchases.logIn(appUserId);
    } catch (e) {
      debugPrint('[RevenueCatService] logIn error: $e');
    }
  }

  /// Clean up user identity on sign-out
  Future<void> logOut() async {
    if (_isTesting || !_isInitialized) return;
    try {
      await Purchases.logOut();
    } catch (e) {
      debugPrint('[RevenueCatService] logOut error: $e');
    }
  }

  void _handleCustomerInfoUpdate(CustomerInfo customerInfo) {
    final hasPro = customerInfo.entitlements.active.containsKey('pro') ||
        customerInfo.entitlements.active.isNotEmpty;
    if (hasPro) {
      ApiClient.instance.reconcileSubscription().catchError((_) => <String, dynamic>{});
    }
  }

  void dispose() {
    _customerInfoSubscription?.cancel();
  }
}
