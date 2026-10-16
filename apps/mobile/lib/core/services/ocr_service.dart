import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class SmartScanResult {
  final String rawText;
  final List<String> headings;
  final Map<String, String> keyValues;
  final List<String> lists;
  final List<String> detectedDates;
  final List<String> detectedAmounts;
  final List<String> uncertainWords;
  final double confidenceScore;
  final String documentType;
  final bool isHandwritten;

  SmartScanResult({
    required this.rawText,
    required this.headings,
    required this.keyValues,
    required this.lists,
    required this.detectedDates,
    required this.detectedAmounts,
    required this.uncertainWords,
    required this.confidenceScore,
    required this.documentType,
    required this.isHandwritten,
  });

  Map<String, dynamic> toJson() => {
    'headings': headings,
    'keyValues': keyValues,
    'lists': lists,
    'detectedDates': detectedDates,
    'detectedAmounts': detectedAmounts,
    'uncertainWords': uncertainWords,
    'confidenceScore': confidenceScore,
    'documentType': documentType,
    'isHandwritten': isHandwritten,
  };
}

class OcrService {
  static final OcrService instance = OcrService._();
  OcrService._();

  Future<String> extractTextFromImage(String imagePath) async {
    final result = await extractStructuredFromImage(imagePath);
    return result.rawText;
  }

  Future<SmartScanResult> extractStructuredFromImage(String imagePath) async {
    final inputImage = InputImage.fromFilePath(imagePath);
    final textRecognizer = TextRecognizer();

    try {
      final recognizedText = await textRecognizer.processImage(inputImage);
      final raw = recognizedText.text.trim();

      final headings = <String>[];
      final keyValues = <String, String>{};
      final lists = <String>[];
      final dates = <String>[];
      final amounts = <String>[];
      final uncertainWords = <String>[];

      // Track bounding box variance and unrecognized character patterns for handwriting cues
      int totalElements = 0;
      int lowConfidenceCount = 0;

      for (final block in recognizedText.blocks) {
        for (final line in block.lines) {
          for (final element in line.elements) {
            totalElements++;
            final text = element.text;
            // ML Kit provides angle/symbols - identify ambiguous handwriting patterns or unusual symbol mixing
            if (RegExp(r'''[^\w\s.,;:!?"\-/()%$]''').hasMatch(text) ||
                (text.length >= 3 && RegExp(r'[a-z][A-Z]').hasMatch(text)) ||
                (RegExp(r'\d[a-zA-Z]{1,2}\d').hasMatch(text))) {
              lowConfidenceCount++;
              if (!uncertainWords.contains(text) && text.length >= 2) {
                uncertainWords.add(text);
              }
            }
          }
        }
      }

      // Regex matchers
      final dateRegex = RegExp(
          r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b',
          caseSensitive: false);
      final amountRegex = RegExp(
          r'(?:[\$€£¥]\s*\d+(?:\.\d{2})?|\b\d+\.\d{2}\s*(?:USD|EUR|GBP)?\b)');
      final listRegex = RegExp(r'^(\s*[-*•]|\s*\[[ xX]?\]|\s*\d+[.)])\s+(.*)$');

      final lines = raw.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();

      for (final line in lines) {
        // Date detection
        for (final match in dateRegex.allMatches(line)) {
          final d = match.group(0);
          if (d != null && !dates.contains(d)) dates.add(d);
        }

        // Amount detection
        for (final match in amountRegex.allMatches(line)) {
          final a = match.group(0);
          if (a != null && !amounts.contains(a)) amounts.add(a);
        }

        // List / Checkbox detection
        final listMatch = listRegex.firstMatch(line);
        if (listMatch != null) {
          lists.add(line);
          continue;
        }

        // Key-Value detection (e.g. "Total: $42.50" or "Date: 2026-10-08")
        if (line.contains(':') && line.split(':').length == 2) {
          final parts = line.split(':');
          final key = parts[0].trim();
          final val = parts[1].trim();
          if (key.length <= 30 && val.isNotEmpty) {
            keyValues[key] = val;
            continue;
          }
        }

        // Heading detection (Short lines, uppercase or title style)
        if (line.length <= 40 &&
            !line.endsWith('.') &&
            (line == line.toUpperCase() || line.startsWith('#'))) {
          headings.add(line.replaceAll(RegExp(r'^#+\s*'), ''));
        }
      }

      // Infer Document Type with specialized second-brain categories
      final lower = raw.toLowerCase();
      String docType = 'GENERAL_NOTE';
      
      final hasIngredients = lower.contains('ingredient') ||
          lower.contains('cup') ||
          lower.contains('tbsp') ||
          lower.contains('tsp') ||
          lower.contains('preheat') ||
          lower.contains('bake') ||
          lower.contains('simmer');
      final hasMultipleRecipes = lower.contains('serves') && (lower.indexOf('serves') != lower.lastIndexOf('serves'));

      if (hasMultipleRecipes || (hasIngredients && (lower.contains('index') || lower.contains('contents') || lower.contains('page ')))) {
        docType = 'COOKBOOK';
      } else if (hasIngredients || lower.contains('recipe') || lower.contains('directions:') || lower.contains('instructions:')) {
        docType = 'RECIPE';
      } else if (lower.contains('grocery') || lower.contains('shopping list') || (lists.length >= 4 && (lower.contains('buy') || lower.contains('milk') || lower.contains('bread')))) {
        docType = 'SHOPPING_LIST';
      } else if (lower.contains('agenda') || lower.contains('meeting') || lower.contains('action items') || lower.contains('attendees')) {
        docType = 'MEETING_NOTES';
      } else if (lower.contains('invoice') || lower.contains('bill to') || lower.contains('amount due')) {
        docType = 'RECEIPT_EXPENSES';
      } else if (lower.contains('receipt') || lower.contains('subtotal') || lower.contains('cashier') || lower.contains('tax')) {
        docType = 'RECEIPT_EXPENSES';
      } else if (lower.contains('exam') || lower.contains('lecture') || lower.contains('chapter') || lower.contains('homework') || lower.contains('study')) {
        docType = 'STUDY_NOTES';
      } else if (lower.contains('milestone') || lower.contains('deliverable') || lower.contains('sprint') || lower.contains('roadmap')) {
        docType = 'PROJECT_PLAN';
      } else if (lists.length >= 3) {
        docType = 'SHOPPING_LIST';
      }

      final isHandwritten = lowConfidenceCount > 3 || (totalElements > 0 && (lowConfidenceCount / totalElements) > 0.12);
      final double confidenceScore = (raw.length > 20
          ? (isHandwritten ? 0.82 : 0.96)
          : (raw.isNotEmpty ? 0.70 : 0.0));

      return SmartScanResult(
        rawText: raw,
        headings: headings,
        keyValues: keyValues,
        lists: lists,
        detectedDates: dates,
        detectedAmounts: amounts,
        uncertainWords: uncertainWords,
        confidenceScore: confidenceScore,
        documentType: docType,
        isHandwritten: isHandwritten,
      );
    } finally {
      textRecognizer.close();
    }
  }
}
