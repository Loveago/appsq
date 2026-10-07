import 'package:flutter/material.dart';

class FadeSlideIn extends StatelessWidget {
  final Widget child;
  final Duration duration;
  final Offset offset;

  const FadeSlideIn({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 350),
    this.offset = const Offset(0, 0.06),
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: duration,
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: FractionalTranslation(
            translation: Offset(offset.dx * (1 - value), offset.dy * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

class SubtlePulse extends StatefulWidget {
  final Widget child;
  final double minScale;
  final double maxScale;
  final Duration duration;

  const SubtlePulse({
    super.key,
    required this.child,
    this.minScale = 0.85,
    this.maxScale = 1.15,
    this.duration = const Duration(milliseconds: 1400),
  });

  @override
  State<SubtlePulse> createState() => _SubtlePulseState();
}

class _SubtlePulseState extends State<SubtlePulse> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _scaleAnimation = Tween<double>(begin: widget.minScale, end: widget.maxScale).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (!isTesting) {
      _controller.repeat(reverse: true);
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: widget.child,
    );
  }
}
