# ML Kit Text Recognition ProGuard / R8 rules
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**
-keep class com.google.mlkit.vision.text.** { *; }
-keep class com.google_mlkit_text_recognition.** { *; }
-keep class com.google_mlkit_commons.** { *; }

# Flutter & Plugin preservation
-keep class io.flutter.** { *; }
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class com.example.mindora_mobile.** { *; }
-dontwarn io.flutter.**

# Preserve all plugins in GeneratedPluginRegistrant
-keep class xyz.luan.audioplayers.** { *; }
-keep class com.llfbandit.record.** { *; }
-keep class com.csdcorp.speech_to_text.** { *; }
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-keep class com.github.dart_lang.jni.** { *; }
-keep class io.flutter.plugins.imagepicker.** { *; }
-keep class io.flutter.plugins.sharedpreferences.** { *; }

# Kotlin coroutines and reflection
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }

# Preserve plugin method channels
-keepclassmembers class * {
    @io.flutter.plugin.common.MethodChannel *;
}

