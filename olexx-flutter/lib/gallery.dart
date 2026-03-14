import 'package:flutter/material.dart';

class GalleryPage extends StatefulWidget {
  final List<String> initial;
  const GalleryPage({super.key, required this.initial});
  @override
  State<GalleryPage> createState() => _GalleryPageState();
}

class _GalleryPageState extends State<GalleryPage> {
  late List<String> items = List.of(widget.initial);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, items),
            child: const Text('Done', style: TextStyle(color: Colors.white)),
          )
        ],
      ),
      body: ReorderableListView(
        padding: const EdgeInsets.all(12),
        onReorder: (oldIndex, newIndex) {
          setState(() {
            if (newIndex > oldIndex) newIndex -= 1;
            final item = items.removeAt(oldIndex);
            items.insert(newIndex, item);
          });
        },
        children: [
          for (int i = 0; i < items.length; i++)
            Card(
              key: ValueKey('g_$i'),
              child: ListTile(
                leading: SizedBox(width: 64, height: 64, child: Image.network(items[i], fit: BoxFit.cover)),
                title: Text(items[i], maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => setState(() => items.removeAt(i)),
                ),
              ),
            )
        ],
      ),
    );
  }
}
