import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/note_model.dart';
import '../models/task_model.dart';
import '../models/project_model.dart';
import '../models/smart_list_model.dart';
import '../providers/app_state_providers.dart';

class LocalStorageService {
  static const String _keyNotes = 'mindora_offline_notes';
  static const String _keyTasks = 'mindora_offline_tasks';
  static const String _keyProjects = 'mindora_offline_projects';
  static const String _keySmartLists = 'mindora_offline_smart_lists';
  static const String _keyUserProfile = 'mindora_offline_user_profile';

  static LocalStorageService? _instance;
  static LocalStorageService get instance => _instance ??= LocalStorageService._();

  LocalStorageService._();

  Future<void> saveNotes(List<NoteModel> notes) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = notes.map((n) => n.toJson()).toList();
      await prefs.setString(_keyNotes, jsonEncode(jsonList));
    } catch (_) {}
  }

  Future<List<NoteModel>?> loadNotes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_keyNotes);
      if (str == null || str.isEmpty) return null;
      final decoded = jsonDecode(str) as List<dynamic>;
      return decoded.map((e) => NoteModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> saveTasks(List<TaskModel> tasks) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = tasks.map((t) => t.toJson()).toList();
      await prefs.setString(_keyTasks, jsonEncode(jsonList));
    } catch (_) {}
  }

  Future<List<TaskModel>?> loadTasks() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_keyTasks);
      if (str == null || str.isEmpty) return null;
      final decoded = jsonDecode(str) as List<dynamic>;
      return decoded.map((e) => TaskModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> saveProjects(List<ProjectModel> projects) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = projects.map((p) => p.toJson()).toList();
      await prefs.setString(_keyProjects, jsonEncode(jsonList));
    } catch (_) {}
  }

  Future<List<ProjectModel>?> loadProjects() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_keyProjects);
      if (str == null || str.isEmpty) return null;
      final decoded = jsonDecode(str) as List<dynamic>;
      return decoded.map((e) => ProjectModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSmartLists(List<SmartListModel> lists) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = lists.map((l) => l.toJson()).toList();
      await prefs.setString(_keySmartLists, jsonEncode(jsonList));
    } catch (_) {}
  }

  Future<List<SmartListModel>?> loadSmartLists() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_keySmartLists);
      if (str == null || str.isEmpty) return null;
      final decoded = jsonDecode(str) as List<dynamic>;
      return decoded.map((e) => SmartListModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> saveUserProfile(UserProfileState profile) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final map = {
        'fullName': profile.fullName,
        'email': profile.email,
        'isPro': profile.isPro,
        'monthlyAiTokensUsed': profile.monthlyAiTokensUsed,
        'monthlyAiTokensLimit': profile.monthlyAiTokensLimit,
        'selectedAiModel': profile.selectedAiModel,
        'responseStyle': profile.responseStyle,
        'autoTaskDetection': profile.autoTaskDetection,
        'autoContextExtraction': profile.autoContextExtraction,
        'dailyBriefingNotification': profile.dailyBriefingNotification,
        'taskDueNotification': profile.taskDueNotification,
      };
      await prefs.setString(_keyUserProfile, jsonEncode(map));
    } catch (_) {}
  }

  Future<UserProfileState?> loadUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_keyUserProfile);
      if (str == null || str.isEmpty) return null;
      final map = jsonDecode(str) as Map<String, dynamic>;
      return UserProfileState(
        fullName: map['fullName'] as String? ?? 'Emmanuel Mensah',
        email: map['email'] as String? ?? 'emmanuel@mindora.ai',
        isPro: map['isPro'] as bool? ?? false,
        monthlyAiTokensUsed: map['monthlyAiTokensUsed'] as int? ?? 18400,
        monthlyAiTokensLimit: map['monthlyAiTokensLimit'] as int? ?? 50000,
        selectedAiModel: map['selectedAiModel'] as String? ?? 'gpt-4o-mini',
        responseStyle: map['responseStyle'] as String? ?? 'Concise',
        autoTaskDetection: map['autoTaskDetection'] as bool? ?? true,
        autoContextExtraction: map['autoContextExtraction'] as bool? ?? true,
        dailyBriefingNotification: map['dailyBriefingNotification'] as bool? ?? true,
        taskDueNotification: map['taskDueNotification'] as bool? ?? true,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
    } catch (_) {}
  }
}
