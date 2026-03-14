import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'api.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_svg/flutter_svg.dart';
import 'details.dart';

void main() {
  runApp(const OlexxApp());
}

class OlexxApp extends StatelessWidget {
  const OlexxApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OLEXX',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: const Color(0xFF0E7AFE)),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String base = 'http://localhost:3000';
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            SvgPicture.asset('assets/logo_pyramid.svg', width: 28, height: 28),
            const SizedBox(width: 8),
            const Text('OLEXX'),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(decoration: const InputDecoration(labelText: 'Backend URL'), controller: TextEditingController(text: base), onSubmitted: (v) { setState(() { base = v; }); }),
          const SizedBox(height: 12),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => AuthPage(base: base))), child: const Text('Auth')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfilePage(base: base))), child: const Text('Profile')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PostPage(base: base))), child: const Text('Post Listing')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SearchPage(base: base))), child: const Text('Search')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SavedPage(base: base))), child: const Text('Saved & Favorites')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatPage(base: base))), child: const Text('Chat')),
        ],
      ),
    );
  }
}

class AuthPage extends StatefulWidget {
  final String base;
  const AuthPage({super.key, required this.base});
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final methodCtrl = TextEditingController(text: 'email');
  final emailCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final providerCtrl = TextEditingController(text: 'facebook');
  final providerIdCtrl = TextEditingController();
  final nameCtrl = TextEditingController();
  final tokenCtrl = TextEditingController();
  String out = '';
  Map<String, dynamic> payload() {
    final m = methodCtrl.text.trim();
    if (m == 'email') return {'method': 'email', 'email': emailCtrl.text.trim(), 'name': nameCtrl.text.trim()};
    if (m == 'phone') return {'method': 'phone', 'phone': phoneCtrl.text.trim(), 'name': nameCtrl.text.trim()};
    return {'method': 'social', 'provider': providerCtrl.text.trim(), 'providerId': providerIdCtrl.text.trim(), 'name': nameCtrl.text.trim()};
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Auth')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: methodCtrl, decoration: const InputDecoration(labelText: 'method email|phone|social')),
          if (methodCtrl.text == 'email') TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'email')),
          if (methodCtrl.text == 'phone') TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'phone')),
          if (methodCtrl.text == 'social') TextField(controller: providerCtrl, decoration: const InputDecoration(labelText: 'provider')),
          if (methodCtrl.text == 'social') TextField(controller: providerIdCtrl, decoration: const InputDecoration(labelText: 'providerId')),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'name')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.register(payload()); setState(() { out = jsonEncode(r); tokenCtrl.text = r['token'] ?? ''; }); }, child: const Text('Register')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.login(payload()); setState(() { out = jsonEncode(r); tokenCtrl.text = r['token'] ?? ''; }); }, child: const Text('Login')),
          const SizedBox(height: 8),
          TextField(controller: tokenCtrl, decoration: const InputDecoration(labelText: 'token')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.me(tokenCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('Me')),
          const SizedBox(height: 8),
          SelectableText(out),
        ],
      ),
    );
  }
}

class PostPage extends StatefulWidget {
  final String base;
  const PostPage({super.key, required this.base});
  @override
  State<PostPage> createState() => _PostPageState();
}

class _PostPageState extends State<PostPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final tokenCtrl = TextEditingController();
  final titleCtrl = TextEditingController();
  final categoryCtrl = TextEditingController();
  final attrsCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  final imagesCtrl = TextEditingController(text: '[{"name":"sofa.jpg","url":"https://example.com/sofa.jpg"}]');
  final jobCtrl = TextEditingController();
  List<String> labels = [];
  List<String> dynAttrs = [];
  Map<String, TextEditingController> attrInputs = {};
  String taxonomyRaw = '';
  List<String> thumbs = [];
  Timer? poller;
  bool autoMode = true;
  String out = '';
  @override
  void dispose() {
    poller?.cancel();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Post Listing')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: tokenCtrl, decoration: const InputDecoration(labelText: 'token')),
          TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'title')),
          SwitchListTile(
            value: autoMode,
            onChanged: (v) => setState(() => autoMode = v),
            title: const Text('Auto Mode (Yes to prompts)'),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 8),
          Text('Images (AI labels via MQ/local stub)', style: const TextStyle(fontWeight: FontWeight.bold)),
          TextField(controller: imagesCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'images json [{name,url}]')),
          Row(children: [
            Expanded(child: FilledButton(onPressed: () async {
              try {
                final imgs = (jsonDecode(imagesCtrl.text) as List).cast<Map<String, dynamic>>();
                final r = await api.uploadImages(null, null, imgs);
                setState(() { jobCtrl.text = r['jobId'] ?? ''; out = jsonEncode(r); });
              } catch (e) { setState(() { out = e.toString(); }); }
            }, child: const Text('Upload'))),
            const SizedBox(width: 8),
            Expanded(child: FilledButton(onPressed: () async {
              if (jobCtrl.text.isEmpty) return;
              poller?.cancel();
              poller = Timer.periodic(const Duration(seconds: 1), (t) async {
                final st = await api.uploadStatus(jobCtrl.text.trim());
                setState(() { out = jsonEncode(st); });
                if (st['status'] == 'completed') {
                  final rs = await api.uploadResult(jobCtrl.text.trim());
                  final l = (rs['result']?['labels'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
                  final th = (rs['result']?['variants']?['thumbnails'] as List?)
                      ?.map((e) => (e as Map)['thumbUrl']?.toString() ?? '')
                      .where((s) => s.isNotEmpty)
                      .toList() ?? <String>[];
                  setState(() { labels = l; thumbs = th; out = jsonEncode(rs); });
                  if (autoMode) {
                    try {
                      final r = await api.classifyWith(titleCtrl.text.trim(), labels);
                      setState(() {
                        categoryCtrl.text = jsonEncode(r['category'] ?? {});
                        attrsCtrl.text = jsonEncode(r['attributes'] ?? {});
                      });
                      final t = await api.taxonomy();
                      Map<String, dynamic> cat = {};
                      try { cat = jsonDecode(categoryCtrl.text); } catch (_) {}
                      final l1 = cat['l1']?.toString();
                      final l2 = cat['l2']?.toString();
                      if (l1 != null && l2 != null) {
                        dynAttrs = [];
                        final groups = (t['taxonomy'] as List).cast<Map<String, dynamic>>();
                        for (final g in groups) {
                          if (g['l1'] == l1) {
                            for (final c in (g['categories'] as List).cast<Map<String, dynamic>>()) {
                              if (c['l2'] == l2) dynAttrs = (c['attributes'] as List).map((e) => e.toString()).toList();
                            }
                          }
                        }
                        attrInputs = { for (final a in dynAttrs) a : TextEditingController() };
                        try {
                          final prefills = jsonDecode(attrsCtrl.text) as Map<String, dynamic>;
                          prefills.forEach((k,v){ if (attrInputs.containsKey(k)) { attrInputs[k]!.text = v.toString(); }});
                        } catch (_) {}
                        setState(() {});
                      }
                      if (tokenCtrl.text.trim().isNotEmpty && priceCtrl.text.trim().isNotEmpty) {
                        Map<String, dynamic>? finalCat; Map<String, dynamic>? finalAttrs;
                        try { finalCat = jsonDecode(categoryCtrl.text); } catch (_) { finalCat = {}; }
                        try { finalAttrs = jsonDecode(attrsCtrl.text); } catch (_) { finalAttrs = {}; }
                        for (final e in attrInputs.entries) {
                          final v = e.value.text.trim();
                          if (v.isNotEmpty) finalAttrs![e.key] = v;
                        }
                        final body = {'title': titleCtrl.text.trim(), 'category': finalCat, 'attributes': finalAttrs, 'price': int.tryParse(priceCtrl.text) ?? 0};
                        final created = await api.createListing(tokenCtrl.text.trim(), body);
                        setState(() { out = jsonEncode(created); });
                      }
                    } catch (_) {}
                  }
                  poller?.cancel();
                }
              });
            }, child: const Text('Check Status'))),
          ]),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async {
            final picker = ImagePicker();
            final img = await picker.pickImage(source: ImageSource.camera);
            if (img == null) return;
            final name = img.name.isNotEmpty ? img.name : img.path.split(RegExp(r'[\\/]')).last;
            final ext = name.split('.').last.toLowerCase();
            final ctype = (ext == 'png') ? 'image/png' : 'image/jpeg';
            final pre = await api.s3Presign(name, ctype);
            final url = pre['uploadUrl']?.toString() ?? '';
            final headers = Map<String, String>.from(pre['headers'] ?? {});
            final bytes = await img.readAsBytes();
            final resp = await http.put(Uri.parse(url), headers: headers, body: bytes);
            if (resp.statusCode >= 200 && resp.statusCode < 300) {
              final cdn = pre['cdnUrl']?.toString() ?? '';
              setState(() { thumbs.add(cdn.isNotEmpty ? cdn : url); out = 'Uploaded $name'; });
            } else {
              setState(() { out = 'Upload failed ${resp.statusCode}'; });
            }
          }, child: const Text('Camera Capture to S3'))),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async {
            final picker = ImagePicker();
            final files = await picker.pickMultiImage();
            if (files.isEmpty) return;
            final imgs = files.map((x) {
              final name = x.name.isNotEmpty ? x.name : x.path.split(RegExp(r'[\\/]')).last;
              return {'name': name, 'url': null};
            }).toList();
            final r = await api.uploadImages(null, null, imgs.cast<Map<String, dynamic>>());
            setState(() { jobCtrl.text = r['jobId'] ?? ''; out = jsonEncode(r); });
            poller?.cancel();
            poller = Timer.periodic(const Duration(seconds: 1), (t) async {
              final st = await api.uploadStatus(jobCtrl.text.trim());
              if (mounted) setState(() { out = jsonEncode(st); });
              if (st['status'] == 'completed') {
                final rs = await api.uploadResult(jobCtrl.text.trim());
                final l = (rs['result']?['labels'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
                final th = (rs['result']?['variants']?['thumbnails'] as List?)
                    ?.map((e) => (e as Map)['thumbUrl']?.toString() ?? '')
                    .where((s) => s.isNotEmpty)
                    .toList() ?? <String>[];
                if (mounted) setState(() { labels = l; thumbs = th; out = jsonEncode(rs); });
                poller?.cancel();
              }
            });
          }, child: const Text('Pick & Upload Images'))),
          Row(children: [
            Expanded(child: FilledButton(onPressed: () async {
              if (jobCtrl.text.isEmpty) return;
              final rs = await api.uploadResult(jobCtrl.text.trim());
              final l = (rs['result']?['labels'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
              setState(() { labels = l; out = jsonEncode(rs); });
            }, child: const Text('Get Result'))),
            const SizedBox(width: 8),
            Expanded(child: FilledButton(onPressed: () async {
              final r = await api.classifyWith(titleCtrl.text.trim(), labels);
              setState(() {
                categoryCtrl.text = jsonEncode(r['category'] ?? {});
                attrsCtrl.text = jsonEncode(r['attributes'] ?? {});
                out = jsonEncode(r);
              });
            }, child: const Text('Classify + Labels'))),
          ]),
          if (labels.isNotEmpty) Text('Labels: ${labels.join(", ")}'),
          if (thumbs.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Thumbnails', style: const TextStyle(fontWeight: FontWeight.bold)),
            ReorderableListView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              onReorder: (oldIndex, newIndex) {
                setState(() {
                  if (newIndex > oldIndex) newIndex -= 1;
                  final item = thumbs.removeAt(oldIndex);
                  thumbs.insert(newIndex, item);
                });
              },
              children: [
                for (int i = 0; i < thumbs.length; i++)
                  Container(
                    key: ValueKey('thumb_$i'),
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        SizedBox(width: 96, height: 96, child: Image.network(thumbs[i], fit: BoxFit.cover)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(thumbs[i], maxLines: 1, overflow: TextOverflow.ellipsis)),
                        IconButton(onPressed: () { setState(() { thumbs.removeAt(i); }); }, icon: const Icon(Icons.delete))
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton(onPressed: () async {
              if (thumbs.isEmpty) return;
              final imgs = thumbs.map((u) => {'name': u.split('/').last, 'url': u}).toList();
              final r = await api.uploadImages(null, null, imgs.cast<Map<String, dynamic>>());
              setState(() { jobCtrl.text = r['jobId'] ?? ''; out = jsonEncode(r); });
              poller?.cancel();
              poller = Timer.periodic(const Duration(seconds: 1), (t) async {
                final st = await api.uploadStatus(jobCtrl.text.trim());
                if (mounted) setState(() { out = jsonEncode(st); });
                if (st['status'] == 'completed') {
                  final rs = await api.uploadResult(jobCtrl.text.trim());
                  final l = (rs['result']?['labels'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
                  if (mounted) setState(() { labels = l; out = jsonEncode(rs); });
                  poller?.cancel();
                }
              });
            }, child: const Text('Analyze Uploaded (Labels)')),
          ],
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.classify(titleCtrl.text.trim()); setState(() { categoryCtrl.text = jsonEncode(r['category'] ?? {}); attrsCtrl.text = jsonEncode(r['attributes'] ?? {}); }); }, child: const Text('Classify')),
          TextField(controller: categoryCtrl, decoration: const InputDecoration(labelText: 'category json')),
          TextField(controller: attrsCtrl, decoration: const InputDecoration(labelText: 'attributes json')),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: FilledButton(onPressed: () async {
              final t = await api.taxonomy();
              setState(() { taxonomyRaw = jsonEncode(t); });
              Map<String, dynamic> cat = {};
              try { cat = jsonDecode(categoryCtrl.text); } catch (_) {}
              final l1 = cat['l1']?.toString();
              final l2 = cat['l2']?.toString();
              if (l1 != null && l2 != null) {
                final groups = (t['taxonomy'] as List).cast<Map<String, dynamic>>();
                for (final g in groups) {
                  if (g['l1'] == l1) {
                    for (final c in (g['categories'] as List).cast<Map<String, dynamic>>()) {
                      if (c['l2'] == l2) dynAttrs = (c['attributes'] as List).map((e) => e.toString()).toList();
                    }
                  }
                }
                attrInputs = { for (final a in dynAttrs) a : TextEditingController() };
                try {
                  final prefills = jsonDecode(attrsCtrl.text) as Map<String, dynamic>;
                  prefills.forEach((k,v){ if (attrInputs.containsKey(k)) { attrInputs[k]!.text = v.toString(); }});
                } catch (_) {}
                setState(() {});
              }
            }, child: const Text('Load Form'))),
          ]),
          if (dynAttrs.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Dynamic Attributes', style: const TextStyle(fontWeight: FontWeight.bold)),
            for (final a in dynAttrs) TextField(controller: attrInputs[a], decoration: InputDecoration(labelText: a)),
          ],
          TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'price')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async {
            Map<String, dynamic>? cat; Map<String, dynamic>? attrs;
            try { cat = jsonDecode(categoryCtrl.text); } catch (_) { cat = {}; }
            try { attrs = jsonDecode(attrsCtrl.text); } catch (_) { attrs = {}; }
            // Merge dynamic form inputs into attrs
            for (final e in attrInputs.entries) {
              final v = e.value.text.trim();
              if (v.isNotEmpty) attrs![e.key] = v;
            }
            final body = {'title': titleCtrl.text.trim(), 'category': cat, 'attributes': attrs, 'price': int.tryParse(priceCtrl.text) ?? 0, 'images': thumbs},
            final r = await api.createListing(tokenCtrl.text.trim(), body);
            setState(() { out = jsonEncode(r); });
          }, child: const Text('Create')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.myListings(tokenCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('My Listings')),
          const SizedBox(height: 8),
          SelectableText(out),
        ],
      ),
    );
  }
}

class SearchPage extends StatefulWidget {
  final String base;
  const SearchPage({super.key, required this.base});
  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final textCtrl = TextEditingController();
  final l1Ctrl = TextEditingController();
  final l2Ctrl = TextEditingController();
  List<dynamic> items = [];
  bool showProfiles = false;
  final Map<String, Map<String, dynamic>> profileCache = {};
  final Map<String, List<dynamic>> commentCache = {};
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: textCtrl, decoration: const InputDecoration(labelText: 'text')),
          TextField(controller: l1Ctrl, decoration: const InputDecoration(labelText: 'l1')),
          TextField(controller: l2Ctrl, decoration: const InputDecoration(labelText: 'l2')),
          SwitchListTile(
            value: showProfiles,
            onChanged: (v) => setState(() => showProfiles = v),
            title: const Text('Profiles'),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async {
            final r = await api.search({'text': textCtrl.text.trim(), 'l1': l1Ctrl.text.isEmpty ? null : l1Ctrl.text, 'l2': l2Ctrl.text.isEmpty ? null : l2Ctrl.text, 'page': 1, 'pageSize': 20});
            final list = (r['items'] as List<dynamic>? ?? []);
            setState(() { items = list; });
            if (showProfiles) {
              final sellers = <String>{};
              for (final it in list) {
                final sid = (it as Map)['seller']?['id']?.toString();
                if (sid != null && sid.isNotEmpty) sellers.add(sid);
              }
              for (final sid in sellers) {
                try { profileCache[sid] = await api.getProfile(sid); } catch (_) {}
                try { commentCache[sid] = await api.listComments(sid); } catch (_) {}
                if (mounted) setState(() {});
              }
            }
          }, child: const Text('Go')),
          const SizedBox(height: 8),
          for (final it in items) _SearchTile(
            base: widget.base,
            item: Map<String, dynamic>.from(it as Map),
            profile: showProfiles ? profileCache[(it as Map)['seller']?['id']?.toString() ?? ''] : null,
            comments: showProfiles ? (commentCache[(it as Map)['seller']?['id']?.toString() ?? ''] ?? const []) : const [],
          ),
        ],
      ),
    );
  }
}

class _SearchTile extends StatelessWidget {
  final String base;
  final Map<String, dynamic> item;
  final Map<String, dynamic>? profile;
  final List<dynamic> comments;
  const _SearchTile({required this.base, required this.item, this.profile, this.comments = const []});
  @override
  Widget build(BuildContext context) {
    final seller = item['seller'] as Map<String, dynamic>? ?? {};
    final sellerId = seller['id']?.toString() ?? '';
    final rating = profile?['avgRating']?.toString() ?? '';
    final revCount = profile?['reviewCount']?.toString() ?? '';
    final avatar = profile?['avatarUrl']?.toString();
    final joinDate = profile?['joinDate']?.toString();
    String joinFmt = '';
    bool isNewProfile = false;
    bool isNewAd = false;
    try {
      if (joinDate != null) {
        final dt = DateTime.tryParse(joinDate);
        if (dt != null) {
          joinFmt = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
          isNewProfile = DateTime.now().difference(dt).inDays <= 14;
        }
      }
    } catch (_) {}
    try {
      final cad = item['createdAt'];
      if (cad != null) {
        final dt = DateTime.fromMillisecondsSinceEpoch(cad is int ? cad : DateTime.tryParse(cad.toString())?.millisecondsSinceEpoch ?? 0);
        isNewAd = DateTime.now().difference(dt).inDays <= 7;
      }
    } catch (_) {}
    final firstComment = comments.isNotEmpty ? (comments.first['text']?.toString() ?? '') : '';
    final line2 = [
      if (item['price'] != null) '${item['price']} EGP',
      if (rating.isNotEmpty) '$rating ★',
      if (revCount.isNotEmpty) '($revCount)',
      if (joinFmt.isNotEmpty) 'since $joinFmt',
    ].where((s) => s.isNotEmpty).join('  •  ');
    return ListTile(
      leading: avatar != null && avatar.isNotEmpty
          ? CircleAvatar(backgroundImage: NetworkImage(avatar))
          : const CircleAvatar(child: Icon(Icons.person)),
      title: Row(
        children: [
          Expanded(child: Text(item['title']?.toString() ?? '')),
          if (isNewAd) Container(margin: const EdgeInsets.only(left: 8), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(6)), child: const Text('NEW', style: TextStyle(fontSize: 10, color: Colors.orange))),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (line2.isNotEmpty) Text(line2),
          Row(
            children: [
              if ((profile?['gender']?.toString().isNotEmpty ?? false))
                Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6)), child: Text(profile!['gender'].toString())),
              if (isNewProfile)
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(6)), child: const Text('NEW PROFILE', style: TextStyle(fontSize: 10, color: Colors.red))),
            ],
          ),
          if (firstComment.isNotEmpty) Text('“$firstComment”', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.black54)),
        ],
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => DetailsPage(base: base, item: item)));
      },
    );
  }
}

class SavedPage extends StatefulWidget {
  final String base;
  const SavedPage({super.key, required this.base});
  @override
  State<SavedPage> createState() => _SavedPageState();
}

class ProfilePage extends StatefulWidget {
  final String base;
  const ProfilePage({super.key, required this.base});
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final idCtrl = TextEditingController();
  final nameCtrl = TextEditingController();
  final bioCtrl = TextEditingController();
  final avatarCtrl = TextEditingController();
  String gender = 'male';
  String out = '';
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: idCtrl, decoration: const InputDecoration(labelText: 'seller id')),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'name')),
          TextField(controller: bioCtrl, decoration: const InputDecoration(labelText: 'bio')),
          TextField(controller: avatarCtrl, decoration: const InputDecoration(labelText: 'avatar url (public)')),
          const SizedBox(height: 8),
          const Text('Gender'),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(label: const Text('Male'), selected: gender == 'male', onSelected: (_) => setState(() => gender = 'male')),
              ChoiceChip(label: const Text('Female'), selected: gender == 'female', onSelected: (_) => setState(() => gender = 'female')),
              ChoiceChip(label: const Text('Pharaoh'), selected: gender == 'pharaoh', onSelected: (_) => setState(() => gender = 'pharaoh')),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: () async {
            final body = {
              'id': idCtrl.text.trim(),
              'name': nameCtrl.text.trim(),
              'bio': bioCtrl.text.trim(),
              'avatarUrl': avatarCtrl.text.trim().isEmpty ? null : avatarCtrl.text.trim(),
              'gender': gender,
            };
            final r = await api.upsertProfile(body);
            setState(() { out = jsonEncode(r); });
          }, child: const Text('Save')),
          const SizedBox(height: 8),
          SelectableText(out),
        ],
      ),
    );
  }
}

class _SavedPageState extends State<SavedPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final tokenCtrl = TextEditingController();
  final nameCtrl = TextEditingController(text: 'Search');
  final queryCtrl = TextEditingController(text: '{"text":"iphone","l1":"Electronics"}');
  String out = '';
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saved & Favorites')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: tokenCtrl, decoration: const InputDecoration(labelText: 'token')),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'name')),
          TextField(controller: queryCtrl, decoration: const InputDecoration(labelText: 'query json')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { Map<String, dynamic> q = {}; try { q = jsonDecode(queryCtrl.text); } catch (_) {} final r = await api.savedAdd(tokenCtrl.text.trim(), nameCtrl.text.trim(), q); setState(() { out = jsonEncode(r); }); }, child: const Text('Save Search')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.savedList(tokenCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('List Saved')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.favList(tokenCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('Favorites')),
          const SizedBox(height: 8),
          SelectableText(out),
        ],
      ),
    );
  }
}

class ChatPage extends StatefulWidget {
  final String base;
  const ChatPage({super.key, required this.base});
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  final fromCtrl = TextEditingController();
  final toCtrl = TextEditingController();
  final textCtrl = TextEditingController();
  String out = '';
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: fromCtrl, decoration: const InputDecoration(labelText: 'from')),
          TextField(controller: toCtrl, decoration: const InputDecoration(labelText: 'to')),
          TextField(controller: textCtrl, decoration: const InputDecoration(labelText: 'text')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.chatSend(fromCtrl.text.trim(), toCtrl.text.trim(), textCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('Send')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () async { final r = await api.chatThread(fromCtrl.text.trim(), toCtrl.text.trim()); setState(() { out = jsonEncode(r); }); }, child: const Text('Thread')),
          const SizedBox(height: 8),
          SelectableText(out),
        ],
      ),
    );
  }
}
