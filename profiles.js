const fs = require("fs");
const path = require("path");

const profiles = new Map();
const comments = new Map();

const dataProfiles = path.join(__dirname, "data-profiles.json");
const dataComments = path.join(__dirname, "data-comments.json");

function upsertProfile(p) {
  const id = String(p.id || "").trim();
  if (!id) throw new Error("seller id required");
  const prev = profiles.get(id) || {};
  const allowedGender = new Set(["male", "female", "pharaoh"]);
  const g = p.gender !== undefined ? String(p.gender).toLowerCase() : (prev.gender || null);
  const gender = allowedGender.has(g) ? g : (g ? null : (prev.gender || null));
  const obj = {
    id,
    name: p.name !== undefined ? p.name : prev.name || "",
    bio: p.bio !== undefined ? p.bio : prev.bio || "",
    joinDate: p.joinDate || prev.joinDate || new Date().toISOString(),
    avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : (prev.avatarUrl || null),
    gender: gender || null,
    avgRating: Number(prev.avgRating || 0),
    reviewCount: Number(prev.reviewCount || 0),
    muted: prev.muted || false,
    blocked: prev.blocked || false,
  };
  profiles.set(id, obj);
  return obj;
}

function getProfile(id) {
  const p = profiles.get(String(id));
  if (!p) return null;
  return { ...p };
}

function addComment(sellerId, c) {
  const id = String(sellerId || "").trim();
  if (!id) throw new Error("seller id required");
  let arr = comments.get(id);
  if (!arr) {
    arr = [];
    comments.set(id, arr);
  }
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sellerId: id,
    authorId: c.authorId || null,
    authorName: c.authorName || "",
    rating: Math.max(1, Math.min(5, Number(c.rating || 0))),
    text: String(c.text || ""),
    createdAt: c.createdAt || new Date().toISOString(),
  };
  arr.push(item);
  recalcStats(id);
  return item;
}

function listComments(sellerId, page, pageSize) {
  const id = String(sellerId || "").trim();
  const arr = comments.get(id) || [];
  const p = Math.max(1, Number(page || 1));
  const ps = Math.min(100, Math.max(1, Number(pageSize || 20)));
  const start = (p - 1) * ps;
  return { total: arr.length, page: p, pageSize: ps, items: arr.slice(start, start + ps) };
}

function recalcStats(sellerId) {
  const id = String(sellerId);
  const arr = comments.get(id) || [];
  let sum = 0;
  for (const c of arr) sum += Number(c.rating || 0);
  const count = arr.length;
  const avg = count ? Math.round((sum / count) * 100) / 100 : 0;
  const p = profiles.get(id) || { id, name: "", bio: "", joinDate: new Date().toISOString() };
  const updated = { ...p, avgRating: avg, reviewCount: count };
  profiles.set(id, updated);
  return updated;
}

function setMuted(sellerId, value) {
  const id = String(sellerId || "");
  const prev = profiles.get(id) || { id, name: "", bio: "", joinDate: new Date().toISOString(), avgRating: 0, reviewCount: 0, muted: false, blocked: false };
  const next = { ...prev, muted: Boolean(value) };
  profiles.set(id, next);
  return next;
}

function setBlocked(sellerId, value) {
  const id = String(sellerId || "");
  const prev = profiles.get(id) || { id, name: "", bio: "", joinDate: new Date().toISOString(), avgRating: 0, reviewCount: 0, muted: false, blocked: false };
  const next = { ...prev, blocked: Boolean(value) };
  profiles.set(id, next);
  return next;
}

function persist() {
  try {
    fs.writeFileSync(
      dataProfiles,
      JSON.stringify(
        Array.from(profiles.values())
      )
    );
    const commentsObj = {};
    for (const [k, arr] of comments) commentsObj[k] = arr;
    fs.writeFileSync(dataComments, JSON.stringify(commentsObj));
    return true;
  } catch {
    return false;
  }
}

function load() {
  try {
    if (fs.existsSync(dataProfiles)) {
      const raw = fs.readFileSync(dataProfiles, "utf8");
      const arr = JSON.parse(raw);
      profiles.clear();
      for (const p of arr) profiles.set(String(p.id), p);
    }
    if (fs.existsSync(dataComments)) {
      const raw = fs.readFileSync(dataComments, "utf8");
      const obj = JSON.parse(raw);
      comments.clear();
      for (const k of Object.keys(obj)) comments.set(String(k), obj[k]);
    }
    return true;
  } catch {
    return false;
  }
}

process.on("SIGINT", () => {
  persist();
  process.exit(0);
});
process.on("beforeExit", () => {
  persist();
});

load();

module.exports = { upsertProfile, getProfile, addComment, listComments, recalcStats, setMuted, setBlocked };
