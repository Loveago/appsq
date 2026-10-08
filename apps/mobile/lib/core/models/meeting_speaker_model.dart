/// Represents a distinct speaker identified during a multi-party meeting.
class MeetingSpeaker {
  final String id;
  final String key; // e.g. "A", "B", "C"
  String displayName; // e.g. "Speaker A" or "Emmanuel"
  double confidence;
  bool isCustomNamed;

  MeetingSpeaker({
    required this.id,
    required this.key,
    required this.displayName,
    this.confidence = 1.0,
    this.isCustomNamed = false,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'key': key,
    'displayName': displayName,
    'confidence': confidence,
    'isCustomNamed': isCustomNamed,
  };

  factory MeetingSpeaker.fromJson(Map<String, dynamic> json) => MeetingSpeaker(
    id: json['id'] as String? ?? 'spk_${json['key'] ?? 'A'}',
    key: json['key'] as String? ?? 'A',
    displayName: json['displayName'] as String? ?? 'Speaker ${json['key'] ?? 'A'}',
    confidence: (json['confidence'] as num?)?.toDouble() ?? 1.0,
    isCustomNamed: json['isCustomNamed'] as bool? ?? false,
  );

  MeetingSpeaker clone() => MeetingSpeaker(
    id: id,
    key: key,
    displayName: displayName,
    confidence: confidence,
    isCustomNamed: isCustomNamed,
  );
}

/// Represents an individual speech segment attributed to a specific speaker.
class MeetingSpeakerSegment {
  final String id;
  String speakerKey; // "A", "B", etc.
  String speakerName; // "Speaker A" or "Emmanuel"
  String text;
  final int startMs;
  int endMs;
  final double confidence;
  final bool isPartial;

  MeetingSpeakerSegment({
    required this.id,
    required this.speakerKey,
    required this.speakerName,
    required this.text,
    required this.startMs,
    required this.endMs,
    this.confidence = 1.0,
    this.isPartial = false,
  });

  String get formattedStartTime {
    final totalSec = startMs ~/ 1000;
    final m = (totalSec ~/ 60).toString().padLeft(2, '0');
    final s = (totalSec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String get formattedEndTime {
    final totalSec = endMs ~/ 1000;
    final m = (totalSec ~/ 60).toString().padLeft(2, '0');
    final s = (totalSec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'speakerKey': speakerKey,
    'speakerName': speakerName,
    'text': text,
    'startMs': startMs,
    'endMs': endMs,
    'confidence': confidence,
  };

  factory MeetingSpeakerSegment.fromJson(Map<String, dynamic> json) => MeetingSpeakerSegment(
    id: json['id'] as String? ?? 'seg_${DateTime.now().millisecondsSinceEpoch}',
    speakerKey: json['speakerKey'] as String? ?? 'A',
    speakerName: json['speakerName'] as String? ?? 'Speaker ${json['key'] ?? 'A'}',
    text: json['text'] as String? ?? '',
    startMs: (json['startMs'] as num?)?.toInt() ?? 0,
    endMs: (json['endMs'] as num?)?.toInt() ?? 0,
    confidence: (json['confidence'] as num?)?.toDouble() ?? 1.0,
  );

  MeetingSpeakerSegment copyWith({
    String? id,
    String? speakerKey,
    String? speakerName,
    String? text,
    int? startMs,
    int? endMs,
    double? confidence,
    bool? isPartial,
  }) {
    return MeetingSpeakerSegment(
      id: id ?? this.id,
      speakerKey: speakerKey ?? this.speakerKey,
      speakerName: speakerName ?? this.speakerName,
      text: text ?? this.text,
      startMs: startMs ?? this.startMs,
      endMs: endMs ?? this.endMs,
      confidence: confidence ?? this.confidence,
      isPartial: isPartial ?? this.isPartial,
    );
  }
}

/// Comprehensive model for saved meetings with structured speaker diarization.
class MeetingRecord {
  final String id;
  final String title;
  final int durationSec;
  final String? localAudioPath;
  final String? audioUrl;
  final String transcript;
  final String summary;
  final List<String> decisions;
  final List<Map<String, dynamic>> actionItems;
  final List<String> keyPoints;
  final List<String> openQuestions;
  final List<String> participants;
  final List<MeetingSpeaker> speakers;
  final List<MeetingSpeakerSegment> segments;
  final DateTime createdAt;

  MeetingRecord({
    required this.id,
    required this.title,
    required this.durationSec,
    this.localAudioPath,
    this.audioUrl,
    required this.transcript,
    required this.summary,
    required this.decisions,
    required this.actionItems,
    required this.keyPoints,
    required this.openQuestions,
    required this.participants,
    required this.speakers,
    required this.segments,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'durationSec': durationSec,
    'localAudioPath': localAudioPath,
    'audioUrl': audioUrl,
    'transcript': transcript,
    'summary': summary,
    'decisions': decisions,
    'actionItems': actionItems,
    'keyPoints': keyPoints,
    'openQuestions': openQuestions,
    'participants': participants,
    'speakers': speakers.map((s) => s.toJson()).toList(),
    'segments': segments.map((s) => s.toJson()).toList(),
    'createdAt': createdAt.toIso8601String(),
  };

  factory MeetingRecord.fromJson(Map<String, dynamic> json) {
    return MeetingRecord(
      id: json['id'] as String? ?? 'meeting_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title'] as String? ?? 'Recorded Meeting',
      durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
      localAudioPath: json['localAudioPath'] as String?,
      audioUrl: json['audioUrl'] as String?,
      transcript: json['transcript'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      decisions: (json['decisions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      actionItems: (json['actionItems'] as List<dynamic>?)
              ?.map((e) => e is Map ? Map<String, dynamic>.from(e) : {'task': e.toString()})
              .toList() ??
          [],
      keyPoints: (json['keyPoints'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      openQuestions: (json['openQuestions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      participants: (json['participants'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      speakers: (json['speakers'] as List<dynamic>?)
              ?.map((e) => MeetingSpeaker.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList() ??
          [],
      segments: (json['segments'] as List<dynamic>?)
              ?.map((e) => MeetingSpeakerSegment.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}
