import 'dart:convert';
import 'package:flutter/material.dart';
import 'api.dart';
import 'package:url_launcher/url_launcher.dart';

class DetailsPage extends StatefulWidget {
  final String base;
  final Map<String, dynamic> item;
  const DetailsPage({super.key, required this.base, required this.item});
  @override
  State<DetailsPage> createState() => _DetailsPageState();
}

class _DetailsPageState extends State<DetailsPage> {
  late final OlexxApi api = OlexxApi(widget.base);
  String token = '';
  Map<String, dynamic>? profile;
  List<dynamic> comments = [];
  String share = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sellerId = widget.item['seller']?['id']?.toString() ?? '';
    if (sellerId.isNotEmpty) {
      try { profile = await api.getProfile(sellerId); } catch (_) {}
      try { comments = await api.listComments(sellerId); } catch (_) {}
    }
    try {
      final s = await api.shareLink(widget.item['id'].toString());
      share = s['url']?.toString() ?? '';
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final images = (item['images'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
    final attrs = (item['attributes'] as Map?)?.cast<String, dynamic>() ?? {};
    final phone = profile?['phone']?.toString() ?? item['seller']?['phone']?.toString() ?? '';
    String joinFmt = '';
    bool isNewProfile = false;
    try {
      final jd = profile?['joinDate']?.toString();
      if (jd != null) {
        final dt = DateTime.tryParse(jd);
        if (dt != null) {
          joinFmt = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
          isNewProfile = DateTime.now().difference(dt).inDays <= 14;
        }
      }
    } catch (_) {}
    return Scaffold(
      appBar: AppBar(title: const Text('Listing Details')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (images.isNotEmpty) SizedBox(
            height: 260,
            child: PageView(
              children: [for (final u in images) ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(u, fit: BoxFit.cover))],
            ),
          ),
          const SizedBox(height: 12),
          Text(item['title']?.toString() ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          if (item['price'] != null) Text('${item['price']} EGP', style: const TextStyle(fontSize: 16, color: Colors.green)),
          const SizedBox(height: 12),
          if (profile != null)
            Row(
              children: [
                if ((profile!['avatarUrl']?.toString().isNotEmpty ?? false))
                  CircleAvatar(backgroundImage: NetworkImage(profile!['avatarUrl'].toString()))
                else
                  CircleAvatar(child: Text((profile!['name'] ?? 'S')[0].toString())),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(profile!['name']?.toString() ?? 'Seller', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Row(
                        children: [
                          Text('${profile!['avgRating'] ?? 0} ★ (${profile!['reviewCount'] ?? 0})'),
                          if (joinFmt.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Text('since $joinFmt', style: const TextStyle(color: Colors.black54)),
                          ],
                          if (isNewProfile) ...[
                            const SizedBox(width: 8),
                            Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(6)), child: const Text('NEW PROFILE', style: TextStyle(fontSize: 10, color: Colors.red))),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          const SizedBox(height: 12),
          Text('Attributes', style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          for (final e in attrs.entries) Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [Text(e.key), Text('${e.value}')],
          ),
          const SizedBox(height: 12),
          Text('Comments', style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          if (comments.isEmpty) const Text('No comments'),
          for (final c in comments)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${c['authorName'] ?? 'User'} • ${c['rating'] ?? 0} ★'),
              subtitle: Text('${c['text'] ?? ''}'),
            ),
          const SizedBox(height: 12),
          TextField(decoration: const InputDecoration(labelText: 'token (for favorite/chat)'), onChanged: (v) => token = v),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: FilledButton(
                onPressed: token.isEmpty ? null : () async {
                  await api.favAdd(token, item['id'].toString());
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to favorites')));
                },
                child: const Text('Favorite'),
              )),
              const SizedBox(width: 8),
              Expanded(child: FilledButton(
                onPressed: () async {
                  if (share.isEmpty) {
                    final s = await api.shareLink(item['id'].toString());
                    share = s['url']?.toString() ?? '';
                  }
                  if (mounted) showDialog(context: context, builder: (_) => AlertDialog(title: const Text('Share'), content: Text(share)));
                },
                child: const Text('Share'),
              )),
            ],
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () async {
              final sellerId = item['seller']?['id']?.toString() ?? '';
              if (sellerId.isEmpty) return;
              Navigator.push(context, MaterialPageRoute(builder: (_) => _QuickChat(base: widget.base, sellerId: sellerId)));
            },
            child: const Text('Chat with Seller'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: phone.isEmpty ? null : () async {
          showModalBottomSheet(context: context, builder: (_) {
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: const Icon(Icons.call),
                    title: const Text('Call'),
                    onTap: () async {
                      final uri = Uri.parse('tel:$phone');
                      if (await canLaunchUrl(uri)) await launchUrl(uri);
                      if (mounted) Navigator.pop(context);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.whatsapp),
                    title: const Text('WhatsApp'),
                    onTap: () async {
                      final wa = Uri.parse('https://wa.me/${phone.replaceAll(RegExp(r'[^0-9+]'), '')}');
                      if (await canLaunchUrl(wa)) await launchUrl(wa, mode: LaunchMode.externalApplication);
                      if (mounted) Navigator.pop(context);
                    },
                  ),
                ],
              ),
            );
          });
        },
        label: const Text('Contact Seller'),
        icon: const Icon(Icons.chat),
      ),
    );
  }
}

class _QuickChat extends StatefulWidget {
  final String base;
  final String sellerId;
  const _QuickChat({required this.base, required this.sellerId});
  @override
  State<_QuickChat> createState() => _QuickChatState();
}

class _QuickChatState extends State<_QuickChat> {
  late final OlexxApi api = OlexxApi(widget.base);
  final meCtrl = TextEditingController();
  final textCtrl = TextEditingController();
  List<dynamic> thread = [];
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: meCtrl, decoration: const InputDecoration(labelText: 'your user id')),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextField(controller: textCtrl, decoration: const InputDecoration(labelText: 'message'))),
              const SizedBox(width: 8),
              FilledButton(onPressed: () async {
                if (meCtrl.text.isEmpty || textCtrl.text.isEmpty) return;
                await api.chatSend(meCtrl.text.trim(), widget.sellerId, textCtrl.text.trim());
                final r = await api.chatThread(meCtrl.text.trim(), widget.sellerId);
                setState(() { thread = (r['items'] as List?) ?? []; textCtrl.clear(); });
              }, child: const Text('Send')),
            ]),
            const SizedBox(height: 12),
            Expanded(child: ListView.builder(
              itemCount: thread.length,
              itemBuilder: (_, i) {
                final m = thread[i] as Map;
                final isMe = m['from'] == meCtrl.text.trim();
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isMe ? Colors.blue.shade50 : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${m['text'] ?? ''}'),
                  ),
                );
              },
            )),
          ],
        ),
      ),
    );
  }
}
