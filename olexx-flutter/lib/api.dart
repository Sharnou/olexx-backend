import 'dart:convert';
import 'package:http/http.dart' as http;

class OlexxApi {
  String base;
  OlexxApi(this.base);

  Map<String, String> _headers([String? token]) {
    final h = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body, {String? token}) async {
    final r = await http.post(Uri.parse('$base$path'), headers: _headers(token), body: jsonEncode(body));
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> _get(String path, {String? token}) async {
    final r = await http.get(Uri.parse('$base$path'), headers: _headers(token));
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> taxonomy() => _get('/api/taxonomy');

  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) => _post('/api/auth/register', payload);
  Future<Map<String, dynamic>> login(Map<String, dynamic> payload) => _post('/api/auth/login', payload);
  Future<Map<String, dynamic>> me(String token) => _get('/api/auth/me', token: token);

  Future<Map<String, dynamic>> classify(String title) => _post('/api/classify', {'title': title});
  Future<Map<String, dynamic>> classifyWith(String title, List<String> imageLabels) =>
      _post('/api/classify', {'title': title, 'imageLabels': imageLabels});
  Future<Map<String, dynamic>> createListing(String token, Map<String, dynamic> listing) =>
      _post('/api/listings', listing, token: token);
  Future<Map<String, dynamic>> myListings(String token) => _get('/api/listings/mine', token: token);
  Future<Map<String, dynamic>> search(Map<String, dynamic> q) => _post('/api/search', q);

  Future<Map<String, dynamic>> savedAdd(String token, String name, Map<String, dynamic> query) =>
      _post('/api/saved-searches', {'name': name, 'query': query}, token: token);
  Future<Map<String, dynamic>> savedList(String token) => _get('/api/saved-searches', token: token);

  Future<Map<String, dynamic>> favAdd(String token, String listingId) =>
      _post('/api/favorites', {'listingId': listingId}, token: token);
  Future<Map<String, dynamic>> favList(String token) => _get('/api/favorites', token: token);
  Future<Map<String, dynamic>> favRemove(String token, String listingId) => _get('/api/favorites?listingId=${Uri.encodeComponent(listingId)}', token: token);

  Future<Map<String, dynamic>> chatSend(String from, String to, String text) =>
      _post('/api/chat/send', {'from': from, 'to': to, 'text': text});
  Future<Map<String, dynamic>> chatThread(String a, String b) =>
      _get('/api/chat/thread?userA=${Uri.encodeComponent(a)}&userB=${Uri.encodeComponent(b)}');

  Future<Map<String, dynamic>> uploadImages(String? sellerId, String? listingId, List<Map<String, dynamic>> images) =>
      _post('/api/upload', {'sellerId': sellerId, 'listingId': listingId, 'images': images});
  Future<Map<String, dynamic>> uploadStatus(String jobId) => _get('/api/upload/status?jobId=${Uri.encodeComponent(jobId)}');
  Future<Map<String, dynamic>> uploadResult(String jobId) => _get('/api/upload/result?jobId=${Uri.encodeComponent(jobId)}');
  Future<Map<String, dynamic>> s3Presign(String filename, String contentType) =>
      _post('/api/upload/s3/presign', {'filename': filename, 'contentType': contentType});

  Future<Map<String, dynamic>> getProfile(String sellerId) => _get('/api/profile?sellerId=${Uri.encodeComponent(sellerId)}');
  Future<Map<String, dynamic>> upsertProfile(Map<String, dynamic> p) => _post('/api/profile', p);
  Future<List<dynamic>> listComments(String sellerId) async {
    final r = await _get('/api/comments?sellerId=${Uri.encodeComponent(sellerId)}&page=1&pageSize=20');
    if (r['items'] is List) return r['items'];
    if (r is List) return r;
    return [];
  }
  Future<Map<String, dynamic>> shareLink(String id) => _get('/api/share/link?id=${Uri.encodeComponent(id)}');
}
