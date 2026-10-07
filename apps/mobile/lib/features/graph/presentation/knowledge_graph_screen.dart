import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../notes/presentation/note_editor_screen.dart';

class GraphNode {
  final String id;
  final String label;
  final String type; // 'person', 'project', 'note', 'task', 'topic'
  final Color color;
  final Offset position;
  final String? noteId;

  const GraphNode({
    required this.id,
    required this.label,
    required this.type,
    required this.color,
    required this.position,
    this.noteId,
  });
}

class GraphEdge {
  final String fromId;
  final String toId;
  final String relationship;

  const GraphEdge({
    required this.fromId,
    required this.toId,
    required this.relationship,
  });
}

class KnowledgeGraphScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;

  const KnowledgeGraphScreen({super.key, this.onBack});

  @override
  ConsumerState<KnowledgeGraphScreen> createState() => _KnowledgeGraphScreenState();
}

class _KnowledgeGraphScreenState extends ConsumerState<KnowledgeGraphScreen> {
  GraphNode? _selectedNode;
  String _selectedFilter = 'all'; // 'all', 'person', 'project', 'note', 'task'

  final List<GraphNode> _nodes = const [
    GraphNode(
      id: 'n1',
      label: 'John (Client)',
      type: 'person',
      color: AppColors.amber,
      position: Offset(180, 80),
      noteId: '2',
    ),
    GraphNode(
      id: 'n2',
      label: 'Website Project',
      type: 'project',
      color: AppColors.primary,
      position: Offset(180, 180),
      noteId: '2',
    ),
    GraphNode(
      id: 'n3',
      label: 'Payment Integration',
      type: 'task',
      color: AppColors.emerald,
      position: Offset(70, 290),
      noteId: '1',
    ),
    GraphNode(
      id: 'n4',
      label: 'Launch September',
      type: 'topic',
      color: AppColors.electricViolet,
      position: Offset(290, 290),
      noteId: '2',
    ),
    GraphNode(
      id: 'n5',
      label: 'Stripe Webhooks',
      type: 'note',
      color: Color(0xFF06B6D4),
      position: Offset(60, 400),
      noteId: '1',
    ),
    GraphNode(
      id: 'n6',
      label: 'Logo Assets',
      type: 'task',
      color: AppColors.amber,
      position: Offset(300, 400),
      noteId: '2',
    ),
  ];

  final List<GraphEdge> _edges = const [
    GraphEdge(fromId: 'n1', toId: 'n2', relationship: 'leads'),
    GraphEdge(fromId: 'n2', toId: 'n3', relationship: 'requires'),
    GraphEdge(fromId: 'n2', toId: 'n4', relationship: 'milestone'),
    GraphEdge(fromId: 'n3', toId: 'n5', relationship: 'implements'),
    GraphEdge(fromId: 'n1', toId: 'n6', relationship: 'delivers'),
  ];

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
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.maybePop(context);
            }
          },
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.electricViolet.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.hub_rounded, color: AppColors.electricViolet, size: 16),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Knowledge Graph',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        '✦ PRO',
                        style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                Text(
                  '${_nodes.length} entities • ${_edges.length} neural links',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Vector similarity discovery completed: 5 connections indexed.')),
              );
            },
            icon: const Icon(Icons.refresh_rounded, size: 18),
            tooltip: 'Re-index Synapses',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          // Filter Chips at Top
          Positioned(
            top: 10,
            left: 20,
            right: 20,
            child: SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                children: [
                  _buildFilterPill('all', 'All Nodes', isDark),
                  _buildFilterPill('person', 'People', isDark),
                  _buildFilterPill('project', 'Projects', isDark),
                  _buildFilterPill('task', 'Tasks', isDark),
                  _buildFilterPill('note', 'Notes', isDark),
                ],
              ),
            ),
          ),

          // Interactive 2D Canvas Area
          Positioned.fill(
            top: 50,
            bottom: _selectedNode != null ? 140 : 20,
            child: GestureDetector(
              onTapUp: (details) {
                final tapPos = details.localPosition;
                GraphNode? tapped;
                for (final node in _nodes) {
                  final dist = (node.position - tapPos).distance;
                  if (dist < 40) {
                    tapped = node;
                    break;
                  }
                }
                setState(() => _selectedNode = tapped);
              },
              child: CustomPaint(
                painter: _GraphPainter(
                  nodes: _nodes,
                  edges: _edges,
                  selectedNode: _selectedNode,
                  filter: _selectedFilter,
                  isDark: isDark,
                ),
                child: Container(),
              ),
            ),
          ),

          // Selected Node Details Card
          if (_selectedNode != null)
            Positioned(
              left: 20,
              right: 20,
              bottom: 24,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: _selectedNode!.color.withValues(alpha: 0.5),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _selectedNode!.color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.bubble_chart_rounded, color: _selectedNode!.color, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _selectedNode!.label,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Type: ${_selectedNode!.type.toUpperCase()} • 2 Connected Synapses',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_selectedNode!.noteId != null)
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => NoteEditorScreen(
                                noteId: _selectedNode!.noteId!,
                                initialTitle: _selectedNode!.label,
                                initialContent: 'Extracted entity connected to knowledge graph.',
                              ),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Open Note', style: TextStyle(fontSize: 11, color: Colors.white)),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterPill(String filterKey, String label, bool isDark) {
    final isSelected = _selectedFilter == filterKey;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = filterKey),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.darkBorder : AppColors.surfaceBorder),
            width: 0.8,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
          ),
        ),
      ),
    );
  }
}

class _GraphPainter extends CustomPainter {
  final List<GraphNode> nodes;
  final List<GraphEdge> edges;
  final GraphNode? selectedNode;
  final String filter;
  final bool isDark;

  _GraphPainter({
    required this.nodes,
    required this.edges,
    required this.selectedNode,
    required this.filter,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final edgePaint = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withValues(alpha: 0.15)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final activeEdgePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke;

    final nodeMap = {for (final n in nodes) n.id: n};

    // Draw Edges
    for (final edge in edges) {
      final from = nodeMap[edge.fromId];
      final to = nodeMap[edge.toId];
      if (from == null || to == null) continue;

      final isEdgeActive = selectedNode != null && (selectedNode!.id == from.id || selectedNode!.id == to.id);
      canvas.drawLine(from.position, to.position, isEdgeActive ? activeEdgePaint : edgePaint);
    }

    // Draw Nodes
    for (final node in nodes) {
      final isFilteredOut = filter != 'all' && node.type != filter;
      final isSelected = selectedNode?.id == node.id;

      final nodePaint = Paint()
        ..color = isFilteredOut
            ? node.color.withValues(alpha: 0.2)
            : node.color.withValues(alpha: isSelected ? 1.0 : 0.85)
        ..style = PaintingStyle.fill;

      // Outer glow for selected
      if (isSelected) {
        final glowPaint = Paint()
          ..color = node.color.withValues(alpha: 0.3)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 6.0;
        canvas.drawCircle(node.position, 22, glowPaint);
      }

      canvas.drawCircle(node.position, isSelected ? 18 : 14, nodePaint);

      // Node text label
      final textSpan = TextSpan(
        text: node.label,
        style: TextStyle(
          color: isFilteredOut
              ? (isDark ? Colors.white38 : Colors.black38)
              : (isDark ? Colors.white : Colors.black87),
          fontSize: 10.5,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(node.position.dx - (textPainter.width / 2), node.position.dy + 20),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GraphPainter oldDelegate) {
    return oldDelegate.selectedNode != selectedNode ||
        oldDelegate.filter != filter ||
        oldDelegate.isDark != isDark;
  }
}
