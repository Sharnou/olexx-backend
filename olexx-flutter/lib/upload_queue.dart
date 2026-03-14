import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class UploadTask {
  final String filename;
  final String contentType;
  final List<int> bytes;
  UploadTask({required this.filename, required this.contentType, required this.bytes});
  Map<String, dynamic> toJson() => {'filename': filename, 'contentType': contentType, 'bytes': base64Encode(bytes)};
  static UploadTask fromJson(Map<String, dynamic> j) => UploadTask(
        filename: j['filename'],
        contentType: j['contentType'],
        bytes: base64Decode(j['bytes']),
      );
}

class UploadQueue {
  static const _key = 'olexx_upload_queue';

  static Future<List<UploadTask>> load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getStringList(_key) ?? [];
    return raw
        .map((s) => jsonDecode(s))
        .whereType<Map<String, dynamic>>()
        .map((j) => UploadTask.fromJson(j))
        .toList();
  }

  static Future<void> save(List<UploadTask> tasks) async {
    final p = await SharedPreferences.getInstance();
    final arr = tasks.map((t) => jsonEncode(t.toJson())).toList();
    await p.setStringList(_key, arr);
  }

  static Future<void> enqueue(UploadTask t) async {
    final items = await load();
    items.add(t);
    await save(items);
  }

  static Future<UploadTask?> next() async {
    final items = await load();
    if (items.isEmpty) return null;
    final t = items.first;
    items.removeAt(0);
    await save(items);
    return t;
  }
}
