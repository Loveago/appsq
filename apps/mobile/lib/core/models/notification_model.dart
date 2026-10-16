class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String category; // REMINDER, NOTE_REVIEW, TASK_DUE, MEETING, VOICE_NOTE, ANNOUNCEMENT, SYSTEM
  final String priority; // LOW, NORMAL, HIGH, URGENT
  final String channel; // IN_APP, PUSH, BOTH
  final String? deepLink;
  final String? targetType;
  final String? targetId;
  final DateTime? scheduledFor;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  const NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.category,
    this.priority = 'NORMAL',
    this.channel = 'BOTH',
    this.deepLink,
    this.targetType,
    this.targetId,
    this.scheduledFor,
    this.deliveredAt,
    this.readAt,
    required this.createdAt,
    this.metadata,
  });

  bool get isRead => readAt != null;

  NotificationModel copyWith({
    String? id,
    String? userId,
    String? title,
    String? body,
    String? category,
    String? priority,
    String? channel,
    String? deepLink,
    String? targetType,
    String? targetId,
    DateTime? scheduledFor,
    DateTime? deliveredAt,
    DateTime? readAt,
    DateTime? createdAt,
    Map<String, dynamic>? metadata,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      body: body ?? this.body,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      channel: channel ?? this.channel,
      deepLink: deepLink ?? this.deepLink,
      targetType: targetType ?? this.targetType,
      targetId: targetId ?? this.targetId,
      scheduledFor: scheduledFor ?? this.scheduledFor,
      deliveredAt: deliveredAt ?? this.deliveredAt,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt ?? this.createdAt,
      metadata: metadata ?? this.metadata,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'body': body,
      'category': category,
      'priority': priority,
      'channel': channel,
      'deepLink': deepLink,
      'targetType': targetType,
      'targetId': targetId,
      'scheduledFor': scheduledFor?.toIso8601String(),
      'deliveredAt': deliveredAt?.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'metadata': metadata,
    };
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? 'Notification',
      body: json['body'] as String? ?? '',
      category: json['category'] as String? ?? 'SYSTEM',
      priority: json['priority'] as String? ?? 'NORMAL',
      channel: json['channel'] as String? ?? 'BOTH',
      deepLink: json['deepLink'] as String?,
      targetType: json['targetType'] as String?,
      targetId: json['targetId'] as String?,
      scheduledFor: json['scheduledFor'] != null ? DateTime.tryParse(json['scheduledFor'] as String) : null,
      deliveredAt: json['deliveredAt'] != null ? DateTime.tryParse(json['deliveredAt'] as String) : null,
      readAt: json['readAt'] != null ? DateTime.tryParse(json['readAt'] as String) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}

class NotificationPreferenceModel {
  final bool pushEnabled;
  final bool inAppEnabled;
  final bool reminderAlerts;
  final bool noteReviewAlerts;
  final bool taskDueAlerts;
  final bool meetingAlerts;
  final bool voiceNoteAlerts;
  final bool announcements;
  final bool quietHours;
  final String? quietHoursStart;
  final String? quietHoursEnd;
  final String? timezone;

  const NotificationPreferenceModel({
    this.pushEnabled = true,
    this.inAppEnabled = true,
    this.reminderAlerts = true,
    this.noteReviewAlerts = true,
    this.taskDueAlerts = true,
    this.meetingAlerts = true,
    this.voiceNoteAlerts = true,
    this.announcements = true,
    this.quietHours = false,
    this.quietHoursStart,
    this.quietHoursEnd,
    this.timezone,
  });

  Map<String, dynamic> toJson() {
    return {
      'pushEnabled': pushEnabled,
      'inAppEnabled': inAppEnabled,
      'reminderAlerts': reminderAlerts,
      'noteReviewAlerts': noteReviewAlerts,
      'taskDueAlerts': taskDueAlerts,
      'meetingAlerts': meetingAlerts,
      'voiceNoteAlerts': voiceNoteAlerts,
      'announcements': announcements,
      'quietHours': quietHours,
      'quietHoursStart': quietHoursStart,
      'quietHoursEnd': quietHoursEnd,
      'timezone': timezone,
    };
  }

  factory NotificationPreferenceModel.fromJson(Map<String, dynamic> json) {
    return NotificationPreferenceModel(
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      inAppEnabled: json['inAppEnabled'] as bool? ?? true,
      reminderAlerts: json['reminderAlerts'] as bool? ?? true,
      noteReviewAlerts: json['noteReviewAlerts'] as bool? ?? true,
      taskDueAlerts: json['taskDueAlerts'] as bool? ?? true,
      meetingAlerts: json['meetingAlerts'] as bool? ?? true,
      voiceNoteAlerts: json['voiceNoteAlerts'] as bool? ?? true,
      announcements: json['announcements'] as bool? ?? true,
      quietHours: json['quietHours'] as bool? ?? false,
      quietHoursStart: json['quietHoursStart'] as String?,
      quietHoursEnd: json['quietHoursEnd'] as String?,
      timezone: json['timezone'] as String?,
    );
  }
}
