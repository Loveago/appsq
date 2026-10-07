class ProjectModel {
  final String id;
  final String name;
  final String description;
  final String colorHex;
  final String icon;
  final String aiSummary;
  final int noteCount;
  final int taskCount;
  final int meetingCount;
  final List<String> people;
  final List<String> links;
  final List<String> nextTasks;

  const ProjectModel({
    required this.id,
    required this.name,
    required this.description,
    required this.colorHex,
    required this.icon,
    required this.aiSummary,
    required this.noteCount,
    required this.taskCount,
    required this.meetingCount,
    this.people = const [],
    this.links = const [],
    this.nextTasks = const [],
  });

  ProjectModel copyWith({
    String? id,
    String? name,
    String? description,
    String? colorHex,
    String? icon,
    String? aiSummary,
    int? noteCount,
    int? taskCount,
    int? meetingCount,
    List<String>? people,
    List<String>? links,
    List<String>? nextTasks,
  }) {
    return ProjectModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      colorHex: colorHex ?? this.colorHex,
      icon: icon ?? this.icon,
      aiSummary: aiSummary ?? this.aiSummary,
      noteCount: noteCount ?? this.noteCount,
      taskCount: taskCount ?? this.taskCount,
      meetingCount: meetingCount ?? this.meetingCount,
      people: people ?? this.people,
      links: links ?? this.links,
      nextTasks: nextTasks ?? this.nextTasks,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'colorHex': colorHex,
      'icon': icon,
      'aiSummary': aiSummary,
      'noteCount': noteCount,
      'taskCount': taskCount,
      'meetingCount': meetingCount,
      'people': people,
      'links': links,
      'nextTasks': nextTasks,
    };
  }

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Untitled Project',
      description: json['description'] as String? ?? '',
      colorHex: json['colorHex'] as String? ?? '#6366F1',
      icon: json['icon'] as String? ?? 'folder',
      aiSummary: json['aiSummary'] as String? ?? '',
      noteCount: json['noteCount'] as int? ?? 0,
      taskCount: json['taskCount'] as int? ?? 0,
      meetingCount: json['meetingCount'] as int? ?? 0,
      people: (json['people'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      links: (json['links'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      nextTasks: (json['nextTasks'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}
