import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/models/task_model.dart';
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

  ({List<GraphNode> nodes, List<GraphEdge> edges}) _buildGraphData(List<NoteModel> notes, List<TaskModel> tasks) {
    if (notes.isEmpty && tasks.isEmpty) {
      return (
        nodes: const <GraphNode>[],
        edges: const <GraphEdge>[],
      );
    }

    final nodes = <GraphNode>[];
    final edges = <GraphEdge>[];
    final positions = [
      const Offset(180, 80),
      const Offset(180, 180),
      const Offset(70, 290),
      const Offset(290, 290),
      const Offset(60, 400),
      const Offset(300, 400),
      const Offset(180, 340),
      const Offset(120, 230),
      const Offset(240, 230),
    ];

    int posIndex = 0;
    for (int i = 0; i < notes.length && i < 5; i++) {
      final note = notes[i];
      final pos = positions[posIndex % positions.length];
      posIndex++;
      nodes.add(
        GraphNode(
          id: 'note_${note.id}',
          label: note.title.length > 20 ? '${note.title.substring(0, 17)}...' : note.title,
          type: 'note',
          color: note.tagColor,
          position: pos,
          noteId: note.id,
        ),
      );
    }

    for (int i = 0; i < tasks.length && i < 4; i++) {
      final task = tasks[i];
      final pos = positions[posIndex % positions.length];
      posIndex++;
      nodes.add(
        GraphNode(
          id: 'task_${task.id}',
          label: task.title.length > 20 ? '${task.title.substring(0, 17)}...' : task.title,
          type: 'task',
          color: task.isCompleted ? AppColors.emerald : AppColors.amber,
          position: pos,
        ),
      );
    }

    for (int i = 0; i < nodes.length - 1; i++) {
      edges.add(
        GraphEdge(
          fromId: nodes[i].id,
          toId: nodes[i + 1].id,
          relationship: i.isEven ? 'relates' : 'references',
        ),
      );
    }

    return (nodes: nodes, edges: edges);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final notes = ref.watch(notesProvider);
    final tasks = ref.watch(tasksProvider);
    final graphData = _buildGraphData(notes, tasks);
    final currentNodes = graphData.nodes;
    final currentEdges = graphData.edges;

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
                  '${currentNodes.length} entities • ${currentEdges.length} neural links',
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
                for (final node in currentNodes) {
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
                  nodes: currentNodes,
                  edges: currentEdges,
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
