class ReminderModel {
  final String id;
  final String userId;
  final String title;
  final String? description;
  final DateTime remindAt;
  final String? noteId;
  final String? taskId;
  final String? meetingId;
  final String? voiceNoteId;
  final String status; // PENDING, TRIGGERED, SNOOZED, COMPLETED, CANCELLED
  final DateTime? snoozedUntil;
  final String recurrenceRule; // NONE, DAILY, WEEKLY, MONTHLY
  final String? timezone;
  final DateTime createdAt;
  final Map<String, dynamic>? note;
  final Map<String, dynamic>? task;

  const ReminderModel({
    required this.id,
    required this.userId,
    required this.title,
    this.description,
    required this.remindAt,
    this.noteId,
    this.taskId,
    this.meetingId,
    this.voiceNoteId,
    this.status = 'PENDING',
    this.snoozedUntil,
    this.recurrenceRule = 'NONE',
    this.timezone,
    required this.createdAt,
    this.note,
    this.task,
  });

  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isSnoozed => status == 'SNOOZED';
  bool get isOverdue {
    if (isCompleted || isCancelled) return false;
    final effectiveTime = snoozedUntil ?? remindAt;
    return effectiveTime.isBefore(DateTime.now());
  }

  ReminderModel copyWith({
    String? id,
    String? userId,
    String? title,
    String? description,
    DateTime? remindAt,
    String? noteId,
    String? taskId,
    String? meetingId,
    String? voiceNoteId,
    String? status,
    DateTime? snoozedUntil,
    String? recurrenceRule,
    String? timezone,
    DateTime? createdAt,
    Map<String, dynamic>? note,
    Map<String, dynamic>? task,
  }) {
    return ReminderModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      description: description ?? this.description,
      remindAt: remindAt ?? this.remindAt,
      noteId: noteId ?? this.noteId,
      taskId: taskId ?? this.taskId,
      meetingId: meetingId ?? this.meetingId,
      voiceNoteId: voiceNoteId ?? this.voiceNoteId,
      status: status ?? this.status,
      snoozedUntil: snoozedUntil ?? this.snoozedUntil,
      recurrenceRule: recurrenceRule ?? this.recurrenceRule,
      timezone: timezone ?? this.timezone,
      createdAt: createdAt ?? this.createdAt,
      note: note ?? this.note,
      task: task ?? this.task,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'description': description,
      'remindAt': remindAt.toIso8601String(),
      'noteId': noteId,
      'taskId': taskId,
      'meetingId': meetingId,
      'voiceNoteId': voiceNoteId,
      'status': status,
      'snoozedUntil': snoozedUntil?.toIso8601String(),
      'recurrenceRule': recurrenceRule,
      'timezone': timezone,
      'createdAt': createdAt.toIso8601String(),
      'note': note,
      'task': task,
    };
  }

  factory ReminderModel.fromJson(Map<String, dynamic> json) {
    return ReminderModel(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? 'Reminder',
      description: json['description'] as String?,
      remindAt: json['remindAt'] != null
          ? DateTime.tryParse(json['remindAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      noteId: json['noteId'] as String?,
      taskId: json['taskId'] as String?,
      meetingId: json['meetingId'] as String?,
      voiceNoteId: json['voiceNoteId'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      snoozedUntil: json['snoozedUntil'] != null ? DateTime.tryParse(json['snoozedUntil'] as String) : null,
      recurrenceRule: json['recurrenceRule'] as String? ?? 'NONE',
      timezone: json['timezone'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      note: json['note'] as Map<String, dynamic>?,
      task: json['task'] as Map<String, dynamic>?,
    );
  }
}
