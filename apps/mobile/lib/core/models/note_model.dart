import 'package:flutter/material.dart';

class NoteModel {
  final String id;
  final String title;
  final String content;
  final String snippet;
  final String date;
  final String category;
  final String tag;
  final Color tagColor;
  final IconData icon;
  final bool isPinned;
  final String? projectId;
  final List<String> extractedPeople;
  final List<String> extractedTasks;

  const NoteModel({
    required this.id,
    required this.title,
    required this.content,
    required this.snippet,
    required this.date,
    required this.category,
    required this.tag,
    required this.tagColor,
    required this.icon,
    this.isPinned = false,
    this.projectId,
    this.extractedPeople = const [],
    this.extractedTasks = const [],
  });

  NoteModel copyWith({
    String? id,
    String? title,
    String? content,
    String? snippet,
    String? date,
    String? category,
    String? tag,
    Color? tagColor,
    IconData? icon,
    bool? isPinned,
    String? projectId,
    List<String>? extractedPeople,
    List<String>? extractedTasks,
  }) {
    return NoteModel(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      snippet: snippet ?? this.snippet,
      date: date ?? this.date,
      category: category ?? this.category,
      tag: tag ?? this.tag,
      tagColor: tagColor ?? this.tagColor,
      icon: icon ?? this.icon,
      isPinned: isPinned ?? this.isPinned,
      projectId: projectId ?? this.projectId,
      extractedPeople: extractedPeople ?? this.extractedPeople,
      extractedTasks: extractedTasks ?? this.extractedTasks,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'snippet': snippet,
      'date': date,
      'category': category,
      'tag': tag,
      'tagColor': tagColor.toARGB32(),
      'isPinned': isPinned,
      'projectId': projectId,
      'extractedPeople': extractedPeople,
      'extractedTasks': extractedTasks,
    };
  }

  static IconData iconForCategory(String category) {
    switch (category.toLowerCase()) {
      case 'architecture':
        return Icons.insights_rounded;
      case 'meetings':
        return Icons.graphic_eq_rounded;
      case 'ideas':
        return Icons.edit_note_rounded;
      default:
        return Icons.notes_rounded;
    }
  }

  factory NoteModel.fromJson(Map<String, dynamic> json) {
    final colorVal = json['tagColor'] as int? ?? 0xFF6366F1;
    final cat = json['category'] as String? ?? 'General';

    return NoteModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Note',
      content: json['content'] as String? ?? '',
      snippet: json['snippet'] as String? ?? '',
      date: json['date'] as String? ?? 'Today',
      category: cat,
      tag: json['tag'] as String? ?? 'NOTE',
      tagColor: Color(colorVal),
      icon: iconForCategory(cat),
      isPinned: json['isPinned'] as bool? ?? false,
      projectId: json['projectId'] as String?,
      extractedPeople: (json['extractedPeople'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      extractedTasks: (json['extractedTasks'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}
