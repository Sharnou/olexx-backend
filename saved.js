const fs = require("fs");
const path = require("path");
const fileS = path.join(__dirname, "data-saved.json");
const fileF = path.join(__dirname, "data-favorites.json");
const saved = new Map();
const favs = new Map();

function load() {
  try {
    if (fs.existsSync(fileS)) {
      const raw = fs.readFileSync(fileS, "utf8");
      const obj = JSON.parse(raw) || {};
      saved.clear();
      for (const k of Object.keys(obj)) saved.set(k, obj[k]);
    }
    if (fs.existsSync(fileF)) {
      const raw = fs.readFileSync(fileF, "utf8");
      const obj = JSON.parse(raw) || {};
      favs.clear();
      for (const k of Object.keys(obj)) favs.set(k, new Set(obj[k]));
    }
  } catch {}
}

function persist() {
  try {
    const sObj = {};
    for (const [k, arr] of saved) sObj[k] = arr;
    fs.writeFileSync(fileS, JSON.stringify(sObj));
    const fObj = {};
    for (const [k, set] of favs) fObj[k] = Array.from(set.values());
    fs.writeFileSync(fileF, JSON.stringify(fObj));
  } catch {}
}

function ensureArr(map, key) {
  let arr = map.get(key);
  if (!arr) {
    arr = [];
    map.set(key, arr);
  }
  return arr;
}

function addSaved(userId, name, query) {
  const uid = String(userId);
  const arr = ensureArr(saved, uid);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  arr.push({ id, name: name || "", query: query || {}, createdAt: new Date().toISOString() });
  persist();
  return id;
}

function listSaved(userId) {
  return saved.get(String(userId)) || [];
}

function removeSaved(userId, id) {
  const uid = String(userId);
  const arr = saved.get(uid) || [];
  let i = arr.length;
  let removed = false;
  while (i--) {
    if (arr[i].id === id) {
      arr.splice(i, 1);
      removed = true;
    }
  }
  saved.set(uid, arr);
  persist();
  return removed;
}

function addFavorite(userId, listingId) {
  const uid = String(userId);
  let set = favs.get(uid);
  if (!set) {
    set = new Set();
    favs.set(uid, set);
  }
  set.add(String(listingId));
  persist();
  return true;
}

function listFavorites(userId) {
  const uid = String(userId);
  const set = favs.get(uid) || new Set();
  return Array.from(set.values());
}

function removeFavorite(userId, listingId) {
  const uid = String(userId);
  const set = favs.get(uid) || new Set();
  const ok = set.delete(String(listingId));
  favs.set(uid, set);
  persist();
  return ok;
}

load();

process.on("SIGINT", () => {
  persist();
  process.exit(0);
});
process.on("beforeExit", () => {
  persist();
});

module.exports = { addSaved, listSaved, removeSaved, addFavorite, listFavorites, removeFavorite };
