const path = require("path");
const Database = require("better-sqlite3");
const dbPath = path.join(__dirname, "olexx.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

function init() {
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
      at TEXT
    );
    CREATE TABLE IF NOT EXISTS moderation_queue (
      id TEXT PRIMARY KEY,
      reason TEXT,
      payload TEXT,
      status TEXT,
      createdAt TEXT,
      resolvedAt TEXT
    );
  `);
}

function upsertProfile(p) {
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
  return db.prepare("SELECT * FROM profiles WHERE id=?").get(id) || null;
}

function saveListing(doc) {
  db.prepare(
    `INSERT INTO listings (id,title,description,l1,l2,price,country,city,district,sellerId,images,createdAt)
     VALUES (@id,@title,@description,@l1,@l2,@price,@country,@city,@district,@sellerId,@images,@createdAt)
     ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,description=excluded.description,l1=excluded.l1,l2=excluded.l2,price=excluded.price,
      country=excluded.country,city=excluded.city,district=excluded.district,sellerId=excluded.sellerId,
      images=excluded.images,createdAt=excluded.createdAt`
  ).run({
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
  });
}

function loadListings() {
  const rows = db.prepare("SELECT * FROM listings").all();
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

init();

module.exports = { db, upsertProfile, getProfile, saveListing, loadListings };
