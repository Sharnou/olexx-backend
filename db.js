const path = require("path");
const dbPath = process.env.OLEXX_DB_PATH || path.join(__dirname, "olexx.db");
const memoryPath = path.join(__dirname, "olexx-db-fallback.json");

let db = null;
let useMemory = false;
let memory = {
  listings: [],
  profiles: {},
  chat_messages: [],
  moderation_queue: [],
  auto_ai_runs: [],
};

function tryInitSqlite() {
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (err) {
    useMemory = true;
    return;
  }

  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        l1 TEXT,
        l2 TEXT,
        price REAL,
        country TEXT,
        city TEXT,
        district TEXT,
        sellerId TEXT,
        images TEXT,
        createdAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT,
        bio TEXT,
        joinDate TEXT,
        avatarUrl TEXT,
        gender TEXT,
        whatsapp TEXT,
        country TEXT,
        state TEXT,
        avgRating REAL,
        reviewCount INTEGER,
        muted INTEGER,
        blocked INTEGER
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sender TEXT,
        recipient TEXT,
        text TEXT,
        channel TEXT,
        whatsapp TEXT,
        audioUrl TEXT,
        at TEXT,
        country TEXT
      );
      CREATE TABLE IF NOT EXISTS moderation_queue (
        id TEXT PRIMARY KEY,
        reason TEXT,
        payload TEXT,
        status TEXT,
        createdAt TEXT,
        resolvedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS auto_ai_runs (
        id TEXT PRIMARY KEY,
        status TEXT,
        summary TEXT,
        detail TEXT,
        createdAt TEXT
      );
    `);
  } catch (err) {
    useMemory = true;
    db = null;
  }
}

function loadMemory() {
  try {
    if (require("fs").existsSync(memoryPath)) {
      memory = JSON.parse(require("fs").readFileSync(memoryPath, "utf8"));
    }
  } catch {
    memory = { listings: [], profiles: {}, chat_messages: [], moderation_queue: [], auto_ai_runs: [] };
  }
}

function saveMemory() {
  if (!useMemory) return;
  try {
    require("fs").writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
  } catch {
    /* ignore */
  }
}

tryInitSqlite();
if (useMemory) {
  loadMemory();
}

function upsertProfile(p) {
  if (useMemory) {
    memory.profiles[p.id] = { ...memory.profiles[p.id], ...p };
    saveMemory();
    return;
  }
  db.prepare(
    `INSERT INTO profiles (id,name,bio,joinDate,avatarUrl,gender,whatsapp,country,state,avgRating,reviewCount,muted,blocked)
     VALUES (@id,@name,@bio,@joinDate,@avatarUrl,@gender,@whatsapp,@country,@state,@avgRating,@reviewCount,@muted,@blocked)
     ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,bio=excluded.bio,joinDate=excluded.joinDate,avatarUrl=excluded.avatarUrl,
      gender=excluded.gender,whatsapp=excluded.whatsapp,country=excluded.country,state=excluded.state,
      avgRating=excluded.avgRating,reviewCount=excluded.reviewCount,muted=excluded.muted,blocked=excluded.blocked`
  ).run(p);
}

function getProfile(id) {
  if (useMemory) return memory.profiles[id] || null;
  return db.prepare("SELECT * FROM profiles WHERE id=?").get(id) || null;
}

function saveListing(doc) {
  const payload = {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    l1: doc.category?.l1 || null,
    l2: doc.category?.l2 || null,
    price: doc.price ?? null,
    country: doc.country || null,
    city: doc.city || null,
    district: doc.location?.district || null,
    sellerId: doc.seller?.id || null,
    images: JSON.stringify(doc.images || []),
    createdAt: doc.createdAt || Date.now(),
  };

  if (useMemory) {
    const idx = memory.listings.findIndex((l) => l.id === payload.id);
    if (idx >= 0) {
      memory.listings[idx] = { ...memory.listings[idx], ...payload };
    } else {
      memory.listings.push(payload);
    }
    saveMemory();
    return;
  }

  db.prepare(
    `INSERT INTO listings (id,title,description,l1,l2,price,country,city,district,sellerId,images,createdAt)
     VALUES (@id,@title,@description,@l1,@l2,@price,@country,@city,@district,@sellerId,@images,@createdAt)
     ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,description=excluded.description,l1=excluded.l1,l2=excluded.l2,price=excluded.price,
      country=excluded.country,city=excluded.city,district=excluded.district,sellerId=excluded.sellerId,
      images=excluded.images,createdAt=excluded.createdAt`
  ).run(payload);
}

function loadListings() {
  const rows = useMemory ? memory.listings : db.prepare("SELECT * FROM listings").all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: { l1: r.l1, l2: r.l2 },
    price: r.price,
    country: r.country,
    city: r.city,
    location: { district: r.district },
    seller: { id: r.sellerId },
    images: JSON.parse(r.images || "[]"),
    createdAt: r.createdAt,
  }));
}

function saveChat(msg) {
  if (useMemory) {
    memory.chat_messages.push(msg);
    saveMemory();
    return;
  }
  db.prepare(
    `INSERT INTO chat_messages (id,sender,recipient,text,channel,whatsapp,audioUrl,at,country)
     VALUES (@id,@sender,@recipient,@text,@channel,@whatsapp,@audioUrl,@at,@country)`
  ).run(msg);
}

function listChat(userA, userB, limit) {
  if (useMemory) {
    return memory.chat_messages
      .filter((m) => (m.sender === userA && m.recipient === userB) || (m.sender === userB && m.recipient === userA))
      .slice(-limit);
  }
  return db
    .prepare(
      `SELECT * FROM chat_messages
       WHERE (sender=@a AND recipient=@b) OR (sender=@b AND recipient=@a)
       ORDER BY at DESC
       LIMIT @limit`
    )
    .all({ a: userA, b: userB, limit })
    .reverse();
}

function purgeOldChat(days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  if (useMemory) {
    if (!memory.chat_messages) memory.chat_messages = [];
    memory.chat_messages = memory.chat_messages.filter((m) => new Date(m.at).getTime() >= cutoff);
    saveMemory();
    return;
  }
  db.prepare("DELETE FROM chat_messages WHERE strftime('%s', at) * 1000 < ?").run(cutoff);
}

function saveAutoAiRun(run) {
  const row = {
    id: run.id,
    status: run.status || "ok",
    summary: run.summary || "",
    detail: run.detail || "",
    createdAt: run.createdAt || new Date().toISOString(),
  };
  if (useMemory) {
    if (!memory.auto_ai_runs) memory.auto_ai_runs = [];
    memory.auto_ai_runs.push(row);
    saveMemory();
    return row;
  }
  db.prepare(`INSERT INTO auto_ai_runs (id,status,summary,detail,createdAt) VALUES (@id,@status,@summary,@detail,@createdAt)`).run(row);
  return row;
}

function listAutoAiRuns(limit = 20) {
  if (useMemory) {
    if (!memory.auto_ai_runs) memory.auto_ai_runs = [];
    return memory.auto_ai_runs.slice(-limit).reverse();
  }
  return db.prepare("SELECT * FROM auto_ai_runs ORDER BY createdAt DESC LIMIT ?").all(limit);
}

module.exports = { db, upsertProfile, getProfile, saveListing, loadListings, saveChat, listChat, purgeOldChat, saveAutoAiRun, listAutoAiRuns };
