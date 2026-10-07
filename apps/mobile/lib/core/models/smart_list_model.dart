class SmartListItemModel {
  final String id;
  final String content;
  final bool isCompleted;

  const SmartListItemModel({
    required this.id,
    required this.content,
    this.isCompleted = false,
  });

  SmartListItemModel copyWith({
    String? id,
    String? content,
    bool? isCompleted,
  }) {
    return SmartListItemModel(
      id: id ?? this.id,
      content: content ?? this.content,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'isCompleted': isCompleted,
    };
  }

  factory SmartListItemModel.fromJson(Map<String, dynamic> json) {
    return SmartListItemModel(
      id: json['id'] as String,
      content: json['content'] as String? ?? '',
      isCompleted: json['isCompleted'] as bool? ?? false,
    );
  }
}

class SmartListModel {
  final String id;
  final String title;
  final bool isAiGenerated;
  final List<SmartListItemModel> items;

  const SmartListModel({
    required this.id,
    required this.title,
    this.isAiGenerated = false,
    this.items = const [],
  });

  SmartListModel copyWith({
    String? id,
    String? title,
    bool? isAiGenerated,
    List<SmartListItemModel>? items,
  }) {
    return SmartListModel(
      id: id ?? this.id,
      title: title ?? this.title,
      isAiGenerated: isAiGenerated ?? this.isAiGenerated,
      items: items ?? this.items,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'isAiGenerated': isAiGenerated,
      'items': items.map((i) => i.toJson()).toList(),
    };
  }

  factory SmartListModel.fromJson(Map<String, dynamic> json) {
    return SmartListModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled List',
      isAiGenerated: json['isAiGenerated'] as bool? ?? false,
      items: (json['items'] as List<dynamic>?)
              ?.map((i) => SmartListItemModel.fromJson(i as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
