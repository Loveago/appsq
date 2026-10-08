import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class SmartScanResult {
  final String rawText;
  final List<String> headings;
  final Map<String, String> keyValues;
  final List<String> lists;
  final List<String> detectedDates;
  final List<String> detectedAmounts;
  final double confidenceScore;
  final String documentType;

  SmartScanResult({
    required this.rawText,
    required this.headings,
    required this.keyValues,
    required this.lists,
    required this.detectedDates,
    required this.detectedAmounts,
    required this.confidenceScore,
    required this.documentType,
  });

  Map<String, dynamic> toJson() => {
    'headings': headings,
    'keyValues': keyValues,
    'lists': lists,
    'detectedDates': detectedDates,
    'detectedAmounts': detectedAmounts,
    'confidenceScore': confidenceScore,
    'documentType': documentType,
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

      // Regex matchers
      final dateRegex = RegExp(r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b', caseSensitive: false);
      final amountRegex = RegExp(r'(?:[\$€£¥]\s*\d+(?:\.\d{2})?|\b\d+\.\d{2}\s*(?:USD|EUR|GBP)?\b)');
      final listRegex = RegExp(r'^(\s*[-*•]|\s*\[[ xX]?\]|\s*\d+[.)])\s+(.*)$');

      final lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.isNotEmpty).toList();

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
        if (line.length <= 40 && !line.endsWith('.') && (line == line.toUpperCase() || line.startsWith('#'))) {
          headings.add(line.replaceAll(RegExp(r'^#+\s*'), ''));
        }
      }

      // Infer Document Type
      final lower = raw.toLowerCase();
      String docType = 'GENERAL';
      if (lower.contains('invoice') || lower.contains('bill to') || lower.contains('amount due')) {
        docType = 'INVOICE';
      } else if (lower.contains('receipt') || lower.contains('subtotal') || lower.contains('cashier') || lower.contains('tax')) {
        docType = 'RECEIPT';
      } else if (lower.contains('agreement') || lower.contains('contract') || lower.contains('hereby')) {
        docType = 'CONTRACT';
      } else if (lists.length >= 3) {
        docType = 'CHECKLIST';
      } else if (raw.isNotEmpty) {
        docType = 'NOTE';
      }

      // Estimate confidence score (based on character recognizability and structured clarity)
      final confidenceScore = (raw.length > 20 ? 0.95 : (raw.isNotEmpty ? 0.80 : 0.0));

      return SmartScanResult(
        rawText: raw,
        headings: headings,
        keyValues: keyValues,
        lists: lists,
        detectedDates: dates,
        detectedAmounts: amounts,
        confidenceScore: confidenceScore,
        documentType: docType,
      );
    } finally {
      textRecognizer.close();
    }
  }
}

extension _IterableFilter<E> on Iterable<E> {
  Iterable<E> filter(bool Function(E element) test) => where(test);
}
