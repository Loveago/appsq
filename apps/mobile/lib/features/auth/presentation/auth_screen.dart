import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/providers/app_state_providers.dart';

class AuthScreen extends ConsumerStatefulWidget {
  final VoidCallback onAuthSuccess;

  const AuthScreen({super.key, required this.onAuthSuccess});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _isSignUp = false;
  bool _isLoading = false;
  bool _obscurePassword = true;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final fullName = _nameController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters');
      return;
    }

    if (_isSignUp && fullName.isEmpty) {
      setState(() => _errorMessage = 'Please enter your name');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Map<String, dynamic> result;
      if (_isSignUp) {
        result = await ApiClient.instance.register(
          email: email,
          password: password,
          fullName: fullName,
        );
      } else {
        result = await ApiClient.instance.login(
          email: email,
          password: password,
        );
      }

      final userData = result['user'] as Map<dynamic, dynamic>? ?? {};
      final returnedEmail = userData['email']?.toString() ?? email;
      final returnedName = userData['fullName']?.toString() ?? (fullName.isNotEmpty ? fullName : returnedEmail.split('@')[0]);
      final isPro = userData['subscriptionTier'] == 'PRO';
      final tokensUsed = (userData['monthlyAiTokensUsed'] as num?)?.toInt() ?? 0;

      ref.read(userProfileProvider.notifier).setUser(
        email: returnedEmail,
        fullName: returnedName,
        isPro: isPro,
        monthlyAiTokensUsed: tokensUsed,
      );

      if (!mounted) return;
      widget.onAuthSuccess();
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Authentication error. Please check your credentials.';
        _isLoading = false;
      });
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Map<String, dynamic> authConfig = {};
      try {
        authConfig = await ApiClient.instance.getAuthConfig();
      } catch (_) {}

      final googleConf = authConfig['google'] as Map<dynamic, dynamic>? ?? {};
      final isGoogleEnabled = googleConf['isEnabled'] as bool? ?? true;
      if (!isGoogleEnabled) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Google Sign-In is temporarily disabled by administrator.';
        });
        return;
      }

      final serverClientId = googleConf['webClientId']?.toString().trim();
      final iosClientId = googleConf['iosClientId']?.toString().trim();

      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        serverClientId: (serverClientId != null && serverClientId.isNotEmpty) ? serverClientId : null,
        clientId: (Platform.isIOS && iosClientId != null && iosClientId.isNotEmpty) ? iosClientId : null,
      );
      final account = await googleSignIn.signIn();
      if (account == null) {
        setState(() => _isLoading = false);
        return; // User cancelled
      }

      final auth = await account.authentication;
      final idToken = auth.idToken ?? '';

      final result = await ApiClient.instance.signInWithGoogle(
        idToken: idToken,
        email: account.email,
        fullName: account.displayName,
        avatarUrl: account.photoUrl,
      );

      final userData = result['user'] as Map<dynamic, dynamic>? ?? {};
      final returnedEmail = userData['email']?.toString() ?? account.email;
      final returnedName = userData['fullName']?.toString() ?? account.displayName ?? 'VyNotes User';
      final isPro = userData['subscriptionTier'] == 'PRO';
      final tokensUsed = (userData['monthlyAiTokensUsed'] as num?)?.toInt() ?? 0;

      ref.read(userProfileProvider.notifier).setUser(
        email: returnedEmail,
        fullName: returnedName,
        isPro: isPro,
        monthlyAiTokensUsed: tokensUsed,
      );

      if (!mounted) return;
      widget.onAuthSuccess();
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Google Sign-In failed. Please try again or use email.';
        _isLoading = false;
      });
    }
  }

  void _showForgotPasswordModal(bool isDark) {
    final resetEmailController = TextEditingController(text: _emailController.text.trim());
    final otpController = TextEditingController();
    final newPasswordController = TextEditingController();
    bool codeSent = false;
    bool isSubmitting = false;
    String? modalError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 24),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF131722) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                border: Border.all(
                  color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkBorderHighlight : Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    codeSent ? 'Enter Verification Code' : 'Reset Your Password',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    codeSent
                        ? 'Enter the 6-digit verification code sent via Brevo to ${resetEmailController.text} and your new password.'
                        : 'Enter your registered email address. We will send you a 6-digit verification code.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                  if (modalError != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      modalError!,
                      style: const TextStyle(fontSize: 12, color: AppColors.rose, fontWeight: FontWeight.w600),
                    ),
                  ],
                  const SizedBox(height: 18),
                  if (!codeSent) ...[
                    _buildTextField(
                      controller: resetEmailController,
                      hintText: 'account@example.com',
                      icon: Icons.alternate_email_rounded,
                      isDark: isDark,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final email = resetEmailController.text.trim();
                              if (email.isEmpty || !email.contains('@')) {
                                setModalState(() => modalError = 'Please enter a valid email address');
                                return;
                              }
                              setModalState(() {
                                isSubmitting = true;
                                modalError = null;
                              });
                              try {
                                await ApiClient.instance.forgotPassword(email);
                                setModalState(() {
                                  isSubmitting = false;
                                  codeSent = true;
                                });
                              } catch (e) {
                                setModalState(() {
                                  isSubmitting = false;
                                  modalError = 'Could not request code: $e';
                                });
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Send Verification Code',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ] else ...[
                    _buildTextField(
                      controller: otpController,
                      hintText: '6-digit code (e.g. 123456)',
                      icon: Icons.shield_outlined,
                      isDark: isDark,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      controller: newPasswordController,
                      hintText: 'New password (min 6 characters)',
                      icon: Icons.lock_outline_rounded,
                      isDark: isDark,
                      obscureText: true,
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final email = resetEmailController.text.trim();
                              final code = otpController.text.trim();
                              final newPass = newPasswordController.text.trim();

                              if (code.length < 6) {
                                setModalState(() => modalError = 'Please enter the 6-digit code');
                                return;
                              }
                              if (newPass.length < 6) {
                                setModalState(() => modalError = 'New password must be at least 6 characters');
                                return;
                              }

                              setModalState(() {
                                isSubmitting = true;
                                modalError = null;
                              });

                              try {
                                await ApiClient.instance.resetPassword(
                                  email: email,
                                  code: code,
                                  newPassword: newPass,
                                );
                                if (context.mounted) {
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Password reset successfully! You can now sign in.'),
                                      backgroundColor: AppColors.emerald,
                                    ),
                                  );
                                }
                              } catch (e) {
                                setModalState(() {
                                  isSubmitting = false;
                                  modalError = 'Password reset failed: $e';
                                });
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Update Password',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: FadeSlideIn(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Logo & Branding
                    Center(
                      child: Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF141722) : Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
                            width: 0.8,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: isDark ? 0.22 : 0.08),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.psychology_rounded,
                          size: 32,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Center(
                      child: Text(
                        'VYNOTES',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2.5,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Center(
                      child: Text(
                        _isSignUp ? 'Create your Second Brain account' : 'Welcome back to your neural workspace',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),

                    // Error Message Callout
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.rose.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.rose.withValues(alpha: 0.3),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, size: 16, color: AppColors.rose),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(fontSize: 12, color: AppColors.rose, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Sign In / Sign Up Mode Switcher Pill
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                          width: 0.6,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                if (_isSignUp) {
                                  setState(() {
                                    _isSignUp = false;
                                    _errorMessage = null;
                                  });
                                }
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: !_isSignUp
                                      ? (isDark ? AppColors.darkSurfaceElevated : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: !_isSignUp
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Text(
                                  'Sign In',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: !_isSignUp ? FontWeight.w700 : FontWeight.w500,
                                    color: !_isSignUp
                                        ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                                        : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                if (!_isSignUp) {
                                  setState(() {
                                    _isSignUp = true;
                                    _errorMessage = null;
                                  });
                                }
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: _isSignUp
                                      ? (isDark ? AppColors.darkSurfaceElevated : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _isSignUp
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Text(
                                  'Sign Up',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: _isSignUp ? FontWeight.w700 : FontWeight.w500,
                                    color: _isSignUp
                                        ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                                        : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Name Field (Sign Up Only)
                    if (_isSignUp) ...[
                      _buildTextField(
                        controller: _nameController,
                        hintText: 'Full Name',
                        icon: Icons.person_outline_rounded,
                        isDark: isDark,
                        keyboardType: TextInputType.name,
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Email Field
                    _buildTextField(
                      controller: _emailController,
                      hintText: 'Email Address',
                      icon: Icons.alternate_email_rounded,
                      isDark: isDark,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),

                    // Password Field
                    _buildTextField(
                      controller: _passwordController,
                      hintText: 'Password (min 6 chars)',
                      icon: Icons.lock_outline_rounded,
                      isDark: isDark,
                      obscureText: _obscurePassword,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          size: 18,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),

                    // Forgot Password Link (Sign In only)
                    if (!_isSignUp) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => _showForgotPasswordModal(isDark),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text(
                            'Forgot password?',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Primary Action Button (Sign In / Sign Up)
                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleAuth,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? const Color(0xFFF3F4F6) : AppColors.textPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: isDark ? Colors.black : Colors.white,
                              ),
                            )
                          : Text(
                              _isSignUp ? 'Create Account' : 'Sign In',
                              style: TextStyle(
                                color: isDark ? Colors.black : Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                    const SizedBox(height: 16),

                    // Divider with OR
                    Row(
                      children: [
                        Expanded(
                          child: Divider(
                            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                            thickness: 0.8,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            'OR',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Divider(
                            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                            thickness: 0.8,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Google Sign-In Button
                    OutlinedButton(
                      onPressed: _isLoading ? null : _handleGoogleSignIn,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        side: BorderSide(
                          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                          width: 0.9,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        backgroundColor: isDark ? AppColors.darkSurfaceSubtle : Colors.white,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white,
                            ),
                            child: const Text(
                              'G',
                              style: TextStyle(
                                color: Color(0xFF4285F4),
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                fontFamily: 'sans-serif',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _isSignUp ? 'Sign up with Google' : 'Continue with Google',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Quick Demo / Skip as Guest
                    TextButton(
                      onPressed: () async {
                        try {
                          await ApiClient.instance.loginAsGuest();
                        } catch (_) {}
                        if (context.mounted) {
                          widget.onAuthSuccess();
                        }
                      },
                      child: Text(
                        'Continue as Guest / Offline Demo →',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    required bool isDark,
    bool obscureText = false,
    TextInputType? keyboardType,
    Widget? suffixIcon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
          width: 0.8,
        ),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: TextStyle(
          fontSize: 13,
          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
          ),
          prefixIcon: Icon(
            icon,
            size: 18,
            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
          ),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }
}
