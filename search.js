const { visibilityFromRating } = require("./ranking");
const { TAXONOMY } = require("./taxonomy");
const fs = require("fs");
const path = require("path");

const store = new Map();
const index = new Map();
let totalDocs = 0;

const attrEqIndex = new Map();
const attrNumIndex = new Map();
const attrNumSorted = new Map();
const l1Index = new Map();
const l2Index = new Map();

const tokenSet = new Set();
const prefixMap = new Map();

const cache = new Map();
const MAX_CACHE = 500;
const CACHE_TTL_MS = 60_000;

const dataFile = path.join(__dirname, "data-index.json");

const STOP = new Set([
  "a",
  "an",
  "the",
  "for",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "with",
  "at",
  "by",
  "is",
  "it",
  "this",
  "that",
  "from",
  "as",
]);

function tokenize(s) {
  const t = (s || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!t) return [];
  return t
    .split(/\s+/)
    .filter((x) => x && !STOP.has(x))
    .slice(0, 256);
}

function docTokens(doc) {
  const parts = [doc.title || "", doc.description || ""];
  if (doc.category && doc.category.l1) parts.push(doc.category.l1);
  if (doc.category && doc.category.l2) parts.push(doc.category.l2);
  if (doc.country) parts.push(doc.country);
  if (doc.city) parts.push(doc.city);
  if (doc.attributes) {
    for (const [k, v] of Object.entries(doc.attributes)) {
      parts.push(k);
      if (v !== undefined && v !== null) parts.push(String(v));
    }
  }
  return tokenize(parts.join(" "));
}

function addToIndex(id, tokens) {
  for (const tok of tokens) {
    let p = index.get(tok);
    if (!p) {
      p = new Map();
      index.set(tok, p);
    }
    p.set(id, (p.get(id) || 0) + 1);
  }
  for (const tok of tokens) {
    if (!tokenSet.has(tok)) {
      tokenSet.add(tok);
      const key = tok.slice(0, 3);
      let s = prefixMap.get(key);
      if (!s) {
        s = new Set();
        prefixMap.set(key, s);
      }
      s.add(tok);
    }
  }
}

function removeFromIndex(id, tokens) {
  for (const tok of tokens) {
    const p = index.get(tok);
    if (!p) continue;
    p.delete(id);
    if (p.size === 0) index.delete(tok);
  }
}

function addToAttrEqIndex(id, attributes) {
  for (const [k, v] of Object.entries(attributes || {})) {
    if (v === undefined || v === null) continue;
    const key = k.toString();
    let m = attrEqIndex.get(key);
    if (!m) {
      m = new Map();
      attrEqIndex.set(key, m);
    }
    const norm = typeof v === "string" ? v.toLowerCase() : v;
    let s = m.get(norm);
    if (!s) {
      s = new Set();
      m.set(norm, s);
    }
    s.add(id);
  }
}

function removeFromAttrEqIndex(id, attributes) {
  for (const [k, v] of Object.entries(attributes || {})) {
    if (v === undefined || v === null) continue;
    const m = attrEqIndex.get(k.toString());
    if (!m) continue;
    const norm = typeof v === "string" ? v.toLowerCase() : v;
    const s = m.get(norm);
    if (!s) continue;
    s.delete(id);
    if (s.size === 0) m.delete(norm);
    if (m.size === 0) attrEqIndex.delete(k.toString());
  }
}

function addToAttrNumIndex(id, attributes) {
  for (const [k, v] of Object.entries(attributes || {})) {
    const n = Number(v);
    if (!isFinite(n)) continue;
    let arr = attrNumIndex.get(k);
    if (!arr) {
      arr = [];
      attrNumIndex.set(k, arr);
    }
    arr.push([n, id]);
    attrNumSorted.set(k, false);
  }
}

function removeFromAttrNumIndex(id, attributes) {
  for (const [k, v] of Object.entries(attributes || {})) {
    const arr = attrNumIndex.get(k);
    if (!arr || !arr.length) continue;
    let i = arr.length;
    while (i--) {
      if (arr[i][1] === id) arr.splice(i, 1);
    }
    if (arr.length === 0) {
      attrNumIndex.delete(k);
      attrNumSorted.delete(k);
    }
  }
}

function ensureNumSorted(k) {
  if (!attrNumSorted.get(k)) {
    const arr = attrNumIndex.get(k);
    if (arr) arr.sort((a, b) => a[0] - b[0]);
    attrNumSorted.set(k, true);
  }
}

function addToCategoryIndex(id, category) {
  if (category && category.l1) {
    const key = category.l1;
    let s = l1Index.get(key);
    if (!s) {
      s = new Set();
      l1Index.set(key, s);
    }
    s.add(id);
  }
  if (category && category.l2) {
    const key = category.l2;
    let s = l2Index.get(key);
    if (!s) {
      s = new Set();
      l2Index.set(key, s);
    }
    s.add(id);
  }
}

function removeFromCategoryIndex(id, category) {
  if (category && category.l1) {
    const s = l1Index.get(category.l1);
    if (s) {
      s.delete(id);
      if (s.size === 0) l1Index.delete(category.l1);
    }
  }
  if (category && category.l2) {
    const s = l2Index.get(category.l2);
    if (s) {
      s.delete(id);
      if (s.size === 0) l2Index.delete(category.l2);
    }
  }
}

function idf(tok) {
  const p = index.get(tok);
  const df = p ? p.size : 0;
  return Math.log((totalDocs + 1) / (df + 1)) + 1;
}

function ensureId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function indexDoc(doc) {
  const id = doc.id || ensureId();
  const prev = store.get(id);
  if (prev) {
    removeFromIndex(id, prev._tokens || []);
    removeFromAttrEqIndex(id, prev.attributes || {});
    removeFromAttrNumIndex(id, prev.attributes || {});
    removeFromCategoryIndex(id, prev.category || null);
  }
  const tokens = docTokens(doc);
  const createdAt = doc.createdAt ? Number(new Date(doc.createdAt).getTime()) : Date.now();
  const normalized = {
    id,
    title: doc.title || "",
    description: doc.description || "",
    category: doc.category || null,
    attributes: doc.attributes || {},
    seller: doc.seller || {},
    images: Array.isArray(doc.images) ? doc.images : [],
    location: doc.location || null,
    country: doc.country || null,
    city: doc.city || null,
    createdAt,
    price: doc.price !== undefined ? Number(doc.price) : undefined,
    _tokens: tokens,
  };
  store.set(id, normalized);
  addToIndex(id, tokens);
  addToAttrEqIndex(id, normalized.attributes);
  addToAttrNumIndex(id, normalized.attributes);
  addToCategoryIndex(id, normalized.category);
  totalDocs = store.size;
  cache.clear();
  return id;
}

function indexBulk(docs) {
  const out = [];
  for (const d of docs || []) out.push(indexDoc(d));
  return out;
}

function eq(a, b) {
  if (a === undefined || a === null) return false;
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

function satisfies(doc, filters) {
  if (!filters) return true;
  for (const [k, v] of Object.entries(filters)) {
    const val = doc.attributes ? doc.attributes[k] : undefined;
    if (v && typeof v === "object") {
      if (v.eq !== undefined && !eq(val, v.eq)) return false;
      if (v.gte !== undefined && !(Number(val) >= Number(v.gte))) return false;
      if (v.lte !== undefined && !(Number(val) <= Number(v.lte))) return false;
    } else {
      if (!eq(val, v)) return false;
    }
  }
  return true;
}

function search(body) {
  const q = body || {};
  const key = JSON.stringify(q);
  const startTime = Date.now();
  const now = startTime;
  const cached = cache.get(key);
  if (cached && now - cached.t < CACHE_TTL_MS) {
    const v = cached.v;
    return { ...v, meta: { cacheHit: true, tookMs: 0 } };
  }
  const qTokens = tokenize(q.text || "");
  let candidates = null;
  if (qTokens.length > 0) {
    const u = new Set();
    for (const tk of qTokens) {
      const p = index.get(tk);
      if (!p) continue;
      for (const id of p.keys()) u.add(id);
    }
    candidates = u;
  }
  if (q.l1) {
    const s = l1Index.get(q.l1) || new Set();
    candidates = candidates ? new Set([...candidates].filter((id) => s.has(id))) : new Set(s);
  }
  if (q.l2) {
    const s = l2Index.get(q.l2) || new Set();
    candidates = candidates ? new Set([...candidates].filter((id) => s.has(id))) : new Set(s);
  }
  if (!candidates) {
    candidates = new Set(store.keys());
  }
  if (q.country) {
    const wanted = String(q.country).toLowerCase();
    candidates = new Set([...candidates].filter((id) => {
      const d = store.get(id);
      return d && d.country && String(d.country).toLowerCase() === wanted;
    }));
  }
  if (q.city) {
    const wanted = String(q.city).toLowerCase();
    candidates = new Set([...candidates].filter((id) => {
      const d = store.get(id);
      return d && d.city && String(d.city).toLowerCase() === wanted;
    }));
  }
  if (q.filters) {
    for (const [k, v] of Object.entries(q.filters)) {
      let s = null;
      if (v && typeof v === "object") {
        if (v.eq !== undefined) {
          const m = attrEqIndex.get(k);
          const norm = typeof v.eq === "string" ? v.eq.toLowerCase() : v.eq;
          const hit = (m && m.get(norm)) || new Set();
          s = new Set(hit);
        }
        if (v.gte !== undefined || v.lte !== undefined) {
          ensureNumSorted(k);
          const arr = attrNumIndex.get(k) || [];
          const lo = v.gte !== undefined ? Number(v.gte) : -Infinity;
          const hi = v.lte !== undefined ? Number(v.lte) : Infinity;
          let left = 0;
          let right = arr.length;
          while (left < right) {
            const mid = (left + right) >> 1;
            if (arr[mid][0] < lo) left = mid + 1;
            else right = mid;
          }
          let i = left;
          const rset = new Set();
          while (i < arr.length && arr[i][0] <= hi) {
            rset.add(arr[i][1]);
            i++;
          }
          s = s ? new Set([...s].filter((id) => rset.has(id))) : rset;
        }
      } else {
        const m = attrEqIndex.get(k);
        const norm = typeof v === "string" ? v.toLowerCase() : v;
        const hit = (m && m.get(norm)) || new Set();
        s = new Set(hit);
      }
      if (s) {
        candidates = new Set([...candidates].filter((id) => s.has(id)));
      }
    }
  }
  const scored = [];
  for (const id of candidates) {
    const doc = store.get(id);
    if (!doc) continue;
    if (qTokens.length > 0 && (!doc._tokens || doc._tokens.length === 0)) continue;
    let score = 0;
    for (const tk of qTokens) {
      const tf = (index.get(tk) && index.get(tk).get(id)) || 0;
      score += tf * idf(tk);
    }
    const vis = visibilityFromRating(doc.seller && doc.seller.rating, doc.seller && doc.seller.reviews);
    if (vis.visibility === "featured") score *= 1.3;
    else if (vis.visibility === "low") score *= 0.7;
    if (q.sort === "newest") score += doc.createdAt / 1e13;
    if (q.sort === "cheapest" && doc.price !== undefined) score += 1e6 / Math.max(1, doc.price);
    scored.push({ id, score, doc });
  }
  scored.sort((a, b) => b.score - a.score);
  const page = Math.max(1, Number(q.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
  const start = (page - 1) * pageSize;
  const items = scored.slice(start, start + pageSize).map((x) => x.doc);
  const tookMs = Date.now() - startTime;
  const result = { total: scored.length, page, pageSize, items, meta: { cacheHit: false, tookMs } };
  cache.set(key, { t: now, v: result });
  while (cache.size > MAX_CACHE) {
    const fk = cache.keys().next().value;
    cache.delete(fk);
  }
  return result;
}

function suggest(text) {
  const t = (text || "").toString().toLowerCase();
  const out = new Set();
  const key = t.slice(0, 3);
  const s = prefixMap.get(key);
  if (s) {
    for (const tok of s) {
      if (tok.startsWith(t) && out.size < 20) out.add(tok);
    }
  } else {
    for (const tok of tokenize(t)) {
      const s2 = prefixMap.get(tok.slice(0, 3));
      if (s2) {
        for (const w of s2) if (w.startsWith(t) && out.size < 20) out.add(w);
      }
    }
  }
  for (const group of TAXONOMY) {
    const l1 = group.l1.toLowerCase();
    if (l1.startsWith(t)) out.add(group.l1);
    for (const cat of group.categories) {
      const l2 = cat.l2.toLowerCase();
      if (l2.startsWith(t)) out.add(cat.l2);
      for (const attr of cat.attributes) {
        const a = attr.toLowerCase();
        if (a.startsWith(t)) out.add(attr);
      }
    }
  }
  return Array.from(out).slice(0, 20);
}

function clear() {
  store.clear();
  index.clear();
  totalDocs = 0;
  attrEqIndex.clear();
  attrNumIndex.clear();
  attrNumSorted.clear();
  l1Index.clear();
  l2Index.clear();
  tokenSet.clear();
  prefixMap.clear();
  cache.clear();
}

function persist() {
  try {
    const docs = [];
    for (const [, doc] of store) {
      const { _tokens, ...plain } = doc;
      docs.push(plain);
    }
    fs.writeFileSync(dataFile, JSON.stringify(docs));
    return true;
  } catch {
    return false;
  }
}

function load() {
  try {
    if (!fs.existsSync(dataFile)) return false;
    const raw = fs.readFileSync(dataFile, "utf8");
    const docs = JSON.parse(raw);
    clear();
    indexBulk(docs);
    return true;
  } catch {
    return false;
  }
}

function listDocs() {
  const out = [];
  for (const [, doc] of store) {
    const { _tokens, ...plain } = doc;
    out.push(plain);
  }
  return out;
}

process.on("SIGINT", () => {
  persist();
  process.exit(0);
});
process.on("beforeExit", () => {
  persist();
});

load();

function updateSellerStats(sellerId, rating, reviews) {
  const sid = String(sellerId || "").trim();
  if (!sid) return 0;
  let updated = 0;
  for (const [id, doc] of store) {
    if (doc && doc.seller && String(doc.seller.id || "") === sid) {
      doc.seller.rating = Number(rating || 0);
      doc.seller.reviews = Number(reviews || 0);
      store.set(id, doc);
      updated++;
    }
  }
  cache.clear();
  return updated;
}

function deleteDoc(id) {
  const d = store.get(String(id));
  if (!d) return false;
  removeFromIndex(id, d._tokens || []);
  removeFromAttrEqIndex(id, d.attributes || {});
  removeFromAttrNumIndex(id, d.attributes || {});
  removeFromCategoryIndex(id, d.category || null);
  store.delete(String(id));
  totalDocs = store.size;
  cache.clear();
  return true;
}

function getDoc(id) {
  return store.get(String(id)) || null;
}

function listBySeller(sellerId, page, pageSize) {
  const sid = String(sellerId || "").trim();
  const arr = [];
  for (const d of store.values()) {
    if (d && d.seller && String(d.seller.id || "") === sid) arr.push(d);
  }
  arr.sort((a, b) => b.createdAt - a.createdAt);
  const p = Math.max(1, Number(page || 1));
  const ps = Math.min(100, Math.max(1, Number(pageSize || 20)));
  const start = (p - 1) * ps;
  return { total: arr.length, page: p, pageSize: ps, items: arr.slice(start, start + ps) };
}

module.exports = { indexDoc, indexBulk, search, suggest, clear, persist, load, listDocs, updateSellerStats, deleteDoc, getDoc, listBySeller };
