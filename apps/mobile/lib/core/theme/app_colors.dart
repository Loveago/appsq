import 'package:flutter/material.dart';

class AppColors {
  // Ultra-Luxury Obsidian, Carbon & Slate Palette
  static const Color darkBackground = Color(0xFF07080B);
  static const Color darkSurface = Color(0xFF0E1017);
  static const Color darkSurfaceSubtle = Color(0xFF141722);
  static const Color darkSurfaceElevated = Color(0xFF1B1F2D);
  static const Color darkBorder = Color(0x12FFFFFF); // 0.6px quiet hairline border
  static const Color darkBorderHighlight = Color(0x24FFFFFF);
  static const Color darkGridLine = Color(0x06FFFFFF);
  
  // Cybernetic Precision & Hardware Accents
  static const Color phosphorCyan = Color(0xFF00F0FF); // Cybernetic glow
  static const Color matrixEmerald = Color(0xFF00FF9D); // Bioluminescent sync
  static const Color laserViolet = Color(0xFFB026FF); // Quantum thought
  static const Color amberFilament = Color(0xFFFFB800); // Hardware lamp
  static const Color solarOrange = Color(0xFFFF5722);
  
  // Typography Colors (Dark)
  static const Color darkTextPrimary = Color(0xFFF9FAFB);
  static const Color darkTextSecondary = Color(0xFFA1A1AA);
  static const Color darkTextMuted = Color(0xFF52525B);
  static const Color darkTextTerminal = Color(0xFF00F0FF);

  // Clean Light Mode Palette
  static const Color background = Color(0xFFF7F8FA);
  static const Color surface = Colors.white;
  static const Color surfaceSubtle = Color(0xFFF0F2F6);
  static const Color surfaceBorder = Color(0xFFE4E7EC);
  static const Color textPrimary = Color(0xFF090A0E);
  static const Color textSecondary = Color(0xFF4B5563);
  static const Color textMuted = Color(0xFF9CA3AF);

  // Precision Jewel Accents
  static const Color primary = Color(0xFF6366F1); // Radiant Indigo
  static const Color primaryDark = Color(0xFF4F46E5);
  static const Color primaryLight = Color(0xFFEEF2FF);
  
  // Neon Cyber Accents
  static const Color electricViolet = Color(0xFF8B5CF6);
  static const Color quantumCyan = Color(0xFF06B6D4);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldGlow = Color(0x3310B981);
  static const Color amber = Color(0xFFF59E0B);
  static const Color rose = Color(0xFFF43F5E);

  // Pro Gradient
  static const LinearGradient proGradient = LinearGradient(
    colors: [Color(0xFF00F0FF), Color(0xFF6366F1), Color(0xFFD946EF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cyberHoloGradient = LinearGradient(
    colors: [Color(0x3300F0FF), Color(0x1A6366F1), Color(0x0507080B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Status & Utility
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF00F0FF);

  // Quick Capture Pill Theming (from Implementation Guide)
  static const Color pillWriteBgLight = Color(0xFFE8F9EE);
  static const Color pillWriteTextLight = Color(0xFF16A34A);
  static const Color pillWriteBgDark = Color(0xFF0E291E);
  static const Color pillWriteTextDark = Color(0xFF34D399);

  static const Color pillVoiceBgLight = Color(0xFFF3EEFD);
  static const Color pillVoiceTextLight = Color(0xFF7C3AED);
  static const Color pillVoiceBgDark = Color(0xFF23173D);
  static const Color pillVoiceTextDark = Color(0xFFA78BFA);

  static const Color pillScanBgLight = Color(0xFFFEF9C3);
  static const Color pillScanTextLight = Color(0xFFD97706);
  static const Color pillScanBgDark = Color(0xFF332207);
  static const Color pillScanTextDark = Color(0xFFFBBF24);

  static const Color pillPhotoBgLight = Color(0xFFE0F2FE);
  static const Color pillPhotoTextLight = Color(0xFF0284C7);
  static const Color pillPhotoBgDark = Color(0xFF0B2538);
  static const Color pillPhotoTextDark = Color(0xFF38BDF8);

  static const Color pillListBgLight = Color(0xFFFCE7F3);
  static const Color pillListTextLight = Color(0xFFDB2777);
  static const Color pillListBgDark = Color(0xFF361325);
  static const Color pillListTextDark = Color(0xFFF472B6);
}


