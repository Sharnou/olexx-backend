const fs = require("fs");
const path = require("path");
const Search = require("./search");
const Saved = require("./saved");

const file = path.join(__dirname, "data-notifications.json");
const notes = new Map();

function load() {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const obj = JSON.parse(raw) || {};
      notes.clear();
      for (const k of Object.keys(obj)) notes.set(k, obj[k]);
    }
  } catch {}
}

function persist() {
  try {
    const obj = {};
    for (const [k, arr] of notes) obj[k] = arr;
    fs.writeFileSync(file, JSON.stringify(obj));
  } catch {}
}

function ensureArr(userId) {
  const uid = String(userId);
  let arr = notes.get(uid);
  if (!arr) {
    arr = [];
    notes.set(uid, arr);
  }
  return arr;
}

function push(userId, payload) {
  const arr = ensureArr(userId);
  const n = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), read: false, payload };
  arr.push(n);
  persist();
  return n.id;
}

function list(userId) {
  return notes.get(String(userId)) || [];
}

function markRead(userId, id) {
  const arr = notes.get(String(userId)) || [];
  for (const n of arr) {
    if (n.id === id) {
      n.read = true;
      persist();
      return true;
    }
  }
  return false;
}

function onNewListing(doc) {
  for (const [uid, arr] of Array.from(SavedList())) {}
}

function* SavedList() {
  for (const id of getSavedUserIds()) {
    yield [id, Saved.listSaved(id)];
  }
}

function getSavedUserIds() {
  const ids = new Set();
  const fileS = path.join(__dirname, "data-saved.json");
  try {
    if (fs.existsSync(fileS)) {
      const raw = fs.readFileSync(fileS, "utf8");
      const obj = JSON.parse(raw) || {};
      for (const k of Object.keys(obj)) ids.add(k);
    }
  } catch {}
  return ids;
}

function handleNewListing(doc) {
  const ids = getSavedUserIds();
  for (const uid of ids) {
    const saved = Saved.listSaved(uid);
    for (const s of saved) {
      const r = Search.search(Object.assign({}, s.query, { page: 1, pageSize: 1 }));
      if (r && r.items && r.items.length > 0 && r.items[0].id === doc.id) {
        push(uid, { type: "saved_search_match", listingId: doc.id, title: doc.title });
      }
    }
  }
}

module.exports = { push, list, markRead, handleNewListing };
