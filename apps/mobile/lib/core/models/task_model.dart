class TaskModel {
  final String id;
  final String title;
  final String project;
  final String? sourceNote;
  final String priority; // 'high', 'medium', 'low'
  final String dueTime;
  final bool isAiExtracted;
  final bool isCompleted;

  final String? description;
  final String? category;
  final int? stepNumber;
  final String? taskType;

  const TaskModel({
    required this.id,
    required this.title,
    required this.project,
    this.sourceNote,
    required this.priority,
    required this.dueTime,
    required this.isAiExtracted,
    this.isCompleted = false,
    this.description,
    this.category,
    this.stepNumber,
    this.taskType,
  });

  TaskModel copyWith({
    String? id,
    String? title,
    String? project,
    String? sourceNote,
    String? priority,
    String? dueTime,
    bool? isAiExtracted,
    bool? isCompleted,
    String? description,
    String? category,
    int? stepNumber,
    String? taskType,
  }) {
    return TaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      project: project ?? this.project,
      sourceNote: sourceNote ?? this.sourceNote,
      priority: priority ?? this.priority,
      dueTime: dueTime ?? this.dueTime,
      isAiExtracted: isAiExtracted ?? this.isAiExtracted,
      isCompleted: isCompleted ?? this.isCompleted,
      description: description ?? this.description,
      category: category ?? this.category,
      stepNumber: stepNumber ?? this.stepNumber,
      taskType: taskType ?? this.taskType,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'project': project,
      'sourceNote': sourceNote,
      'priority': priority,
      'dueTime': dueTime,
      'isAiExtracted': isAiExtracted,
      'isCompleted': isCompleted,
      'description': description,
      'category': category,
      'stepNumber': stepNumber,
      'taskType': taskType,
    };
  }

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Task',
      project: json['project'] as String? ?? 'General',
      sourceNote: json['sourceNote'] as String?,
      priority: json['priority'] as String? ?? 'medium',
      dueTime: json['dueTime'] as String? ?? 'Today',
      isAiExtracted: json['isAiExtracted'] as bool? ?? false,
      isCompleted: json['isCompleted'] as bool? ?? false,
      description: json['description'] as String?,
      category: json['category'] as String?,
      stepNumber: json['stepNumber'] as int?,
      taskType: json['taskType'] as String?,
    );
  }
}
