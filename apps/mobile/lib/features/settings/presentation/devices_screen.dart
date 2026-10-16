import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _devices = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDevices();
  }

  Future<void> _fetchDevices() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final devices = await ApiClient.instance.getCloudDevices();
      if (mounted) {
        setState(() {
          _devices = devices;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load registered devices.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _revokeDevice(String deviceId, String deviceName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.darkSurface
            : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Revoke Device Session?'),
        content: Text(
          'Are you sure you want to revoke "$deviceName"? It will no longer be permitted to synchronize with cloud servers. Data already stored locally on that device will not be erased remotely.',
          style: const TextStyle(fontSize: 13),
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
            child: const Text('Revoke Access'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await ApiClient.instance.revokeCloudDevice(deviceId);
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Device session revoked successfully.')),
          );
        }
        _fetchDevices();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.surface,
      appBar: AppBar(
        title: const Text('Devices & Sessions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchDevices,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_errorMessage!, style: const TextStyle(color: AppColors.rose)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _fetchDevices, child: const Text('Retry')),
                    ],
                  ),
                )
              : _devices.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.devices_rounded, size: 48, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                          const SizedBox(height: 12),
                          const Text('Current Device Active', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          const SizedBox(height: 4),
                          Text(
                            'Your current device is authorized for VyNotes cloud services.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _devices.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final dev = _devices[index];
                        final platform = dev['platform']?.toString().toUpperCase() ?? 'DEVICE';
                        final model = dev['deviceModel']?.toString() ?? 'Mobile Device';
                        final name = dev['deviceName']?.toString() ?? model;
                        final isActive = dev['isActive'] as bool? ?? true;
                        final lastSeen = dev['lastSeenAt']?.toString();
                        final isApple = platform == 'IOS';

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Icon(
                                  isApple ? Icons.phone_iphone_rounded : Icons.phone_android_rounded,
                                  color: AppColors.primary,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                        const SizedBox(width: 8),
                                        if (isActive)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.matrixEmerald.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text('ACTIVE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.matrixEmerald)),
                                          )
                                        else
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.rose.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text('REVOKED', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.rose)),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      lastSeen != null ? 'Last active: ${lastSeen.split('T').first}' : 'Recently active',
                                      style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                              if (isActive && dev['id'] != null)
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline_rounded, color: AppColors.rose, size: 20),
                                  tooltip: 'Revoke Device',
                                  onPressed: () => _revokeDevice(dev['id'].toString(), name),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}
