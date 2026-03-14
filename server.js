const http = require("http");
const url = require("url");
const { runAiClassifier } = require("./classifier");
const { TAXONOMY } = require("./taxonomy");
const { visibilityFromRating } = require("./ranking");
const { SUPER_ADMIN_EMAIL, DEV_MODE, USE_ES, USE_RABBIT, S3_UPLOAD_BASE, S3_CDN_BASE, USE_AWS_PRESIGN, AWS_REGION, S3_BUCKET, ADMIN_EMAILS } = require("./config");
const SearchAdapter = USE_ES ? require("./elasticsearch") : require("./search");
const InMemory = require("./search");
const Profiles = require("./profiles");
const { createLimiter } = require("./ratelimit");
const AdminLog = require("./adminlog");
const Chat = require("./chat");
const fs = require("fs");
const path = require("path");
const MQ = require("./mq");
const ImageJobs = require("./image-jobs");
const Auth = require("./auth");
const Saved = require("./saved");
const Notes = require("./notifications");
const AI = require("./ai");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ModerationQueue = require("./moderation-queue");

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function jsonh(res, code, headers, data) {
  const body = JSON.stringify(data);
  const h = Object.assign(
    {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    headers || {}
  );
  res.writeHead(code, h);
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        const obj = data ? JSON.parse(data) : {};
        resolve(obj);
      } catch {
        resolve({});
      }
    });
  });
}

function isAdmin(req) {
  const superE = String(SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const user = getUserFromAuth(req);
  const tokenEmail = user && user.email ? String(user.email).toLowerCase().trim() : "";
  if (!tokenEmail) return false;
  if (superE && tokenEmail === superE) return true;
  if (ADMIN_EMAILS.includes(tokenEmail)) return true;
  return false;
}

const commentLimiter = createLimiter({ windowMs: 60_000, max: 6 });

function getUserFromAuth(req) {
  const h = req.headers || {};
  const auth = String(h["authorization"] || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const t = auth.slice(7).trim();
  if (!t) return null;
  const u = Auth.getUserByToken(t);
  return u || null;
}

function requireUser(req) {
  const u = getUserFromAuth(req);
  if (!u) throw new Error("auth_required");
  return u;
}

function requireUser(req) {
  const u = getUserFromAuth(req);
  if (!u) throw new Error("auth_required");
  return u;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method || "GET";
  if (method === "GET" && parsed.pathname === "/health") {
    return json(res, 200, { ok: true, name: "OLEXX", superAdmin: SUPER_ADMIN_EMAIL, dev: DEV_MODE });
  }
  if (method === "GET" && (parsed.pathname === "/" || parsed.pathname === "/index.html")) {
    const f = path.join(__dirname, "public", "index.html");
    try {
      const buf = fs.readFileSync(f);
      res.writeHead(200, { "Content-Type": "text/html", "Content-Length": buf.length });
      return res.end(buf);
    } catch {}
  }
  if (method === "GET" && (parsed.pathname === "/admin" || parsed.pathname === "/admin.html")) {
    const f = path.join(__dirname, "public", "admin.html");
    try {
      const buf = fs.readFileSync(f);
      res.writeHead(200, { "Content-Type": "text/html", "Content-Length": buf.length });
      return res.end(buf);
    } catch {}
  }
  if (method === "GET" && parsed.pathname === "/client-api.js") {
    const f = path.join(__dirname, "client-api.js");
    try {
      const buf = fs.readFileSync(f);
      res.writeHead(200, { "Content-Type": "text/javascript", "Content-Length": buf.length });
      return res.end(buf);
    } catch {}
  }
  if (method === "GET" && parsed.pathname.startsWith("/public/")) {
    const rel = parsed.pathname.replace(/^\/public\//, "");
    const f = path.join(__dirname, "public", rel);
    try {
      const buf = fs.readFileSync(f);
      const ext = path.extname(f).toLowerCase();
      const type = ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "text/plain";
      res.writeHead(200, { "Content-Type": type, "Content-Length": buf.length });
      return res.end(buf);
    } catch {}
  }
  if (method === "GET" && parsed.pathname === "/api/taxonomy") {
    return json(res, 200, { taxonomy: TAXONOMY });
  }
  if (method === "POST" && parsed.pathname === "/api/auth/register") {
    try {
      const body = await parseBody(req);
      const out = Auth.register(body);
      return json(res, 200, out);
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/auth/login") {
    try {
      const body = await parseBody(req);
      const out = Auth.login(body);
      return json(res, 200, out);
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/auth/me") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    return json(res, 200, { user: u });
  }
  if (method === "POST" && parsed.pathname === "/api/classify") {
    const body = await parseBody(req);
    const out = runAiClassifier({ title: body.title, description: body.description || "", imageLabels: body.imageLabels || null });
    return json(res, 200, out);
  }
  if (method === "GET" && parsed.pathname === "/api/visibility") {
    const r = Number(parsed.query.rating || 0);
    const c = Number(parsed.query.reviews || 0);
    return json(res, 200, visibilityFromRating(r, c));
  }
  if (method === "POST" && parsed.pathname === "/api/index") {
    const body = await parseBody(req);
    const sellerId = body && body.seller && body.seller.id ? String(body.seller.id) : "";
    if (sellerId) {
      const p = Profiles.getProfile(sellerId);
      if (p && p.blocked) return json(res, 403, { error: "seller_blocked" });
      if (p && p.muted) return json(res, 403, { error: "seller_muted" });
    }
    const id = await SearchAdapter.indexDoc(body);
    try {
      const doc = InMemory.getDoc(id);
      if (doc) Notes.handleNewListing(doc);
    } catch {}
    return json(res, 200, { id });
  }
  if (method === "POST" && parsed.pathname === "/api/index/bulk") {
    const body = await parseBody(req);
    if (Array.isArray(body.docs)) {
      for (const d of body.docs) {
        const sellerId = d && d.seller && d.seller.id ? String(d.seller.id) : "";
        if (sellerId) {
          const p = Profiles.getProfile(sellerId);
          if (p && p.blocked) return json(res, 403, { error: "seller_blocked", sellerId });
          if (p && p.muted) return json(res, 403, { error: "seller_muted", sellerId });
        }
      }
    }
    const ids = await SearchAdapter.indexBulk(body.docs || []);
    return json(res, 200, { ids });
  }
  if (method === "POST" && parsed.pathname === "/api/listings") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const body = await parseBody(req);
    body.seller = Object.assign({}, body.seller || {}, { id: u.id });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry) body.country = hdrCountry;
    const id = await SearchAdapter.indexDoc(body);
    try {
      const doc = InMemory.getDoc(id);
      if (doc) Notes.handleNewListing(doc);
    } catch {}
    return json(res, 200, { id });
  }
  if (method === "GET" && parsed.pathname === "/api/listings/mine") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const page = parsed.query.page ? Number(parsed.query.page) : 1;
    const pageSize = parsed.query.pageSize ? Number(parsed.query.pageSize) : 20;
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    const out = InMemory.listBySeller(u.id, page, pageSize);
    if (hdrCountry) out.items = out.items.filter((it) => !it.country || it.country === hdrCountry);
    return json(res, 200, out);
  }
  if (method === "GET" && parsed.pathname === "/api/listing") {
    const id = String(parsed.query.id || "");
    if (!id) return json(res, 400, { error: "id required" });
    const doc = InMemory.getDoc(id);
    if (!doc) return json(res, 404, { error: "not found" });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry && doc.country && doc.country !== hdrCountry && !isAdmin(req)) return json(res, 403, { error: "cross_country_blocked" });
    return json(res, 200, doc);
  }
  if (method === "PUT" && parsed.pathname === "/api/listings") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const body = await parseBody(req);
    const id = String(parsed.query.id || body.id || "");
    if (!id) return json(res, 400, { error: "id required" });
    const current = InMemory.getDoc(id);
    if (!current) return json(res, 404, { error: "not found" });
    if (!current.seller || String(current.seller.id || "") !== String(u.id)) return json(res, 403, { error: "forbidden" });
    const merged = Object.assign({}, current, body, { id });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    const mergedCountry = merged.country || current.country || hdrCountry || null;
    if (hdrCountry && mergedCountry && mergedCountry !== hdrCountry) return json(res, 403, { error: "cross_country_blocked" });
    merged.country = mergedCountry;
    await SearchAdapter.indexDoc(merged);
    return json(res, 200, { ok: true });
  }
  if (method === "DELETE" && parsed.pathname === "/api/listings") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const id = String(parsed.query.id || "");
    if (!id) return json(res, 400, { error: "id required" });
    const current = InMemory.getDoc(id);
    if (!current) return json(res, 404, { error: "not found" });
    if (!current.seller || String(current.seller.id || "") !== String(u.id)) return json(res, 403, { error: "forbidden" });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry && current.country && current.country !== hdrCountry) return json(res, 403, { error: "cross_country_blocked" });
    const ok = InMemory.deleteDoc(id);
    return json(res, 200, { ok });
  }
  if (method === "POST" && parsed.pathname === "/api/upload") {
    const body = await parseBody(req);
    const payload = {
      sellerId: body.sellerId || null,
      listingId: body.listingId || null,
      images: Array.isArray(body.images) ? body.images : [],
    };
    const jobId = ImageJobs.createJob(payload);
    if (USE_RABBIT) {
      MQ.publish("olexx.images", { jobId, payload });
    } else {
      ImageJobs.scheduleLocalProcessing(jobId);
    }
    return json(res, 202, { jobId, status: "queued" });
  }
  if (method === "GET" && parsed.pathname === "/api/upload/status") {
    const jobId = String(parsed.query.jobId || "");
    if (!jobId) return json(res, 400, { error: "jobId required" });
    const st = ImageJobs.getStatus(jobId);
    if (!st) return json(res, 404, { error: "not found" });
    return json(res, 200, st);
  }
  if (method === "GET" && parsed.pathname === "/api/upload/result") {
    const jobId = String(parsed.query.jobId || "");
    if (!jobId) return json(res, 400, { error: "jobId required" });
    const r = ImageJobs.getResult(jobId);
    if (!r) return json(res, 404, { error: "not found" });
    return json(res, 200, r);
  }
  if (method === "POST" && parsed.pathname === "/api/upload/s3/presign") {
    const body = await parseBody(req);
    const filename = String(body.filename || "");
    const contentType = String(body.contentType || "application/octet-stream");
    if (!filename) return json(res, 400, { error: "filename required" });
    if (USE_AWS_PRESIGN) {
      try {
        const Aws = require("./aws-presign");
        const out = await Aws.presign(filename, contentType);
        if (out) {
          return json(res, 200, { key: out.key, method: "PUT", uploadUrl: out.uploadUrl, headers: out.headers, expiresIn: 300, cdnUrl: out.cdnUrl || null });
        }
      } catch {}
    }
    const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${filename.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const uploadUrl = `${S3_UPLOAD_BASE}/${encodeURIComponent(key)}`;
    const cdnUrl = `${S3_CDN_BASE}/${encodeURIComponent(key)}`;
    return json(res, 200, { key, method: "PUT", uploadUrl, headers: { "Content-Type": contentType }, expiresIn: 300, cdnUrl });
  }
  if (method === "POST" && parsed.pathname === "/api/saved-searches") {
    try {
      const u = requireUser(req);
      const body = await parseBody(req);
      const id = Saved.addSaved(u.id, body.name || "", body.query || {});
      return json(res, 200, { id });
    } catch (e) {
      if (e.message === "auth_required") return json(res, 401, { error: "auth_required" });
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/saved-searches") {
    try {
      const u = requireUser(req);
      return json(res, 200, { items: Saved.listSaved(u.id) });
    } catch (e) {
      if (e.message === "auth_required") return json(res, 401, { error: "auth_required" });
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "DELETE" && parsed.pathname === "/api/saved-searches") {
    try {
      const u = requireUser(req);
      const id = String(parsed.query.id || "");
      if (!id) return json(res, 400, { error: "id required" });
      const ok = Saved.removeSaved(u.id, id);
      return json(res, 200, { ok });
    } catch (e) {
      if (e.message === "auth_required") return json(res, 401, { error: "auth_required" });
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/favorites") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const body = await parseBody(req);
    const ok = Saved.addFavorite(u.id, body.listingId);
    return json(res, 200, { ok });
  }
  if (method === "GET" && parsed.pathname === "/api/favorites") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const ids = Saved.listFavorites(u.id);
    const items = ids.map((id) => InMemory.getDoc(id)).filter(Boolean);
    return json(res, 200, { items });
  }
  if (method === "DELETE" && parsed.pathname === "/api/favorites") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const id = String(parsed.query.listingId || "");
    if (!id) return json(res, 400, { error: "listingId required" });
    const ok = Saved.removeFavorite(u.id, id);
    return json(res, 200, { ok });
  }
  if (method === "GET" && parsed.pathname === "/api/notifications") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    return json(res, 200, { items: Notes.list(u.id) });
  }
  if (method === "POST" && parsed.pathname === "/api/notifications/read") {
    const u = getUserFromAuth(req);
    if (!u) return json(res, 401, { error: "unauthorized" });
    const body = await parseBody(req);
    const ok = Notes.markRead(u.id, body.id);
    return json(res, 200, { ok });
  }
  if (method === "GET" && parsed.pathname === "/api/share/link") {
    const id = String(parsed.query.id || "");
    if (!id) return json(res, 400, { error: "id required" });
    const doc = InMemory.getDoc(id);
    if (!doc) return json(res, 404, { error: "not found" });
    const urlShare = `${req.headers["x-external-base"] || "http://localhost:3000"}/public/listing?id=${encodeURIComponent(id)}`;
    const text = `Check this on OLEXX: ${doc.title} — ${urlShare}`;
    return json(res, 200, { url: urlShare, text });
  }
  if (method === "POST" && parsed.pathname === "/api/search") {
    const body = await parseBody(req);
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry) {
      if (body.country && String(body.country).trim() !== hdrCountry) {
        return json(res, 403, { error: "cross_country_blocked" });
      }
      body.country = hdrCountry;
    }
    // deny contact search by other countries
    const result = await SearchAdapter.search(body || {});
    const cacheHit = result && result.meta && result.meta.cacheHit ? "HIT" : "MISS";
    const took = result && result.meta && result.meta.tookMs ? String(result.meta.tookMs) : "0";
    return jsonh(res, 200, { "X-Cache": cacheHit, "X-Search-Took": took }, result);
  }
  if (method === "GET" && parsed.pathname === "/api/suggest") {
    const q = String(parsed.query.text || "");
    return json(res, 200, { suggestions: SearchAdapter.suggest(q) });
  }
  if (method === "GET" && parsed.pathname === "/sitemap.xml") {
    const docs = InMemory.listDocs ? InMemory.listDocs() : [];
    const urls = [];
    const now = new Date().toISOString();
    urls.push({ loc: "/", lastmod: now });
    urls.push({ loc: "/admin.html", lastmod: now });
    const popular = ["/popular/electronics", "/popular/cars", "/popular/properties"];
    popular.forEach((p) => urls.push({ loc: p, lastmod: now }));
    for (const group of TAXONOMY) {
      urls.push({ loc: `/category/${encodeURIComponent(group.l1)}`, lastmod: now });
      for (const cat of group.categories) {
        urls.push({ loc: `/category/${encodeURIComponent(group.l1)}/${encodeURIComponent(cat.l2)}`, lastmod: now });
      }
    }
    // location layers (city/district) derived from listings
    const citySet = new Set();
    const districtSet = new Set();
    for (const d of docs || []) {
      if (d.city) citySet.add(d.city);
      if (d.location && d.location.district) districtSet.add(`${d.city || "city"}/${d.location.district}`);
    }
    for (const c of citySet) urls.push({ loc: `/city/${encodeURIComponent(c)}`, lastmod: now });
    for (const cd of districtSet) urls.push({ loc: `/city/${encodeURIComponent(cd)}`, lastmod: now });
    for (const d of docs || []) {
      urls.push({
        loc: `/listing/${encodeURIComponent(d.id)}`,
        lastmod: d.createdAt ? new Date(d.createdAt).toISOString() : now,
      });
    }
    const base = req.headers["x-external-base"] || "http://localhost:3000";
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map((u) => `  <url><loc>${base}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`)
        .join("\n") +
      "\n</urlset>";
    res.writeHead(200, { "Content-Type": "application/xml" });
    return res.end(xml);
  }
  if (method === "GET" && parsed.pathname === "/robots.txt") {
    const base = req.headers["x-external-base"] || "http://localhost:3000";
    const body = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(body);
  }
  if (method === "POST" && parsed.pathname === "/api/index/clear") {
    await SearchAdapter.clear();
    return json(res, 200, { ok: true });
  }
  if (method === "POST" && parsed.pathname === "/api/index/persist") {
    const ok = InMemory.persist();
    return json(res, 200, { ok });
  }
  if (method === "POST" && parsed.pathname === "/api/index/load") {
    const ok = InMemory.load();
    return json(res, 200, { ok });
  }
  if (method === "POST" && parsed.pathname === "/api/es/ensure") {
    if (!USE_ES) return json(res, 400, { error: "Elasticsearch disabled" });
    const out = await SearchAdapter.ensureIndex();
    return json(res, 200, out);
  }
  if (method === "POST" && parsed.pathname === "/api/es/migrate") {
    if (!USE_ES) return json(res, 400, { error: "Elasticsearch disabled" });
    const docs = InMemory.listDocs();
    if (!docs || docs.length === 0) {
      return json(res, 200, { migrated: 0, note: "no in-memory docs" });
    }
    await SearchAdapter.ensureIndex();
    const ids = await SearchAdapter.indexBulk(docs);
    return json(res, 200, { migrated: ids.length });
  }
  if (method === "POST" && parsed.pathname === "/api/profile") {
    try {
      const body = await parseBody(req);
      const p = Profiles.upsertProfile(body);
      return json(res, 200, p);
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/profile") {
    const sellerId = String(parsed.query.sellerId || "");
    if (!sellerId) return json(res, 400, { error: "sellerId required" });
    const p = Profiles.getProfile(sellerId);
    if (!p) return json(res, 404, { error: "not found" });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry && p.country && p.country !== hdrCountry && !isAdmin(req)) return json(res, 403, { error: "cross_country_blocked" });
    if (!isAdmin(req)) {
      const { muted, blocked, ...rest } = p;
      return json(res, 200, rest);
    }
    return json(res, 200, p);
  }
  if (method === "POST" && parsed.pathname === "/api/comments") {
    try {
      const body = await parseBody(req);
      const key = body.authorId || (req.headers && req.headers["x-forwarded-for"]) || "anon";
      if (!commentLimiter.consume(key)) {
        return json(res, 429, { error: "rate_limited" });
      }
      const sellerId = body.sellerId;
      const c = Profiles.addComment(sellerId, body);
      const stats = Profiles.recalcStats(sellerId);
      const updated = InMemory.updateSellerStats(sellerId, stats.avgRating, stats.reviewCount);
      return json(res, 200, { comment: c, profile: stats, listingsUpdated: updated });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/comments") {
    const sellerId = String(parsed.query.sellerId || "");
    if (!sellerId) return json(res, 400, { error: "sellerId required" });
    const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
    if (hdrCountry) {
      const p = Profiles.getProfile(sellerId);
      if (p && p.country && p.country !== hdrCountry) return json(res, 403, { error: "cross_country_blocked" });
    }
    const page = parsed.query.page ? Number(parsed.query.page) : 1;
    const pageSize = parsed.query.pageSize ? Number(parsed.query.pageSize) : 20;
    const list = Profiles.listComments(sellerId, page, pageSize);
    return json(res, 200, list);
  }
  if (method === "POST" && parsed.pathname === "/api/seller/recalc") {
    try {
      const body = await parseBody(req);
      const sellerId = body.sellerId;
      const stats = Profiles.recalcStats(sellerId);
      const updated = InMemory.updateSellerStats(sellerId, stats.avgRating, stats.reviewCount);
      return json(res, 200, { profile: stats, listingsUpdated: updated });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/admin/me") {
    return json(res, 200, { isAdmin: isAdmin(req) });
  }
  if (method === "GET" && parsed.pathname === "/api/admin/status") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    const sellerId = String(parsed.query.sellerId || "");
    if (!sellerId) return json(res, 400, { error: "sellerId required" });
    const p = Profiles.getProfile(sellerId) || { id: sellerId, muted: false, blocked: false };
    return json(res, 200, { id: p.id, muted: p.muted || false, blocked: p.blocked || false });
  }
  if (method === "POST" && parsed.pathname === "/api/admin/mute") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    try {
      const body = await parseBody(req);
      const sellerId = String(body.sellerId || "");
      const value = Boolean(body.value);
      if (!sellerId) return json(res, 400, { error: "sellerId required" });
      const p = Profiles.setMuted(sellerId, value);
      const updated = InMemory.updateSellerStats(sellerId, p.avgRating || 0, p.reviewCount || 0);
      AdminLog.record({ admin: req.headers["x-admin-email"] || "", action: "mute", sellerId, value });
      return json(res, 200, { id: p.id, muted: p.muted, updatedListings: updated });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/admin/block") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    try {
      const body = await parseBody(req);
      const sellerId = String(body.sellerId || "");
      const value = Boolean(body.value);
      if (!sellerId) return json(res, 400, { error: "sellerId required" });
      const p = Profiles.setBlocked(sellerId, value);
      const updated = InMemory.updateSellerStats(sellerId, p.avgRating || 0, p.reviewCount || 0);
      AdminLog.record({ admin: req.headers["x-admin-email"] || "", action: "block", sellerId, value });
      return json(res, 200, { id: p.id, blocked: p.blocked, updatedListings: updated });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/admin/audit") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    const sellerId = parsed.query.sellerId ? String(parsed.query.sellerId) : null;
    const limit = parsed.query.limit ? Number(parsed.query.limit) : 100;
    const items = AdminLog.list({ sellerId, limit });
    return json(res, 200, { items });
  }
  if (method === "GET" && parsed.pathname === "/api/admin/moderation") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    const status = parsed.query.status ? String(parsed.query.status) : null;
    const items = ModerationQueue.list(status);
    return json(res, 200, { items });
  }
  if (method === "POST" && parsed.pathname === "/api/admin/moderation/resolve") {
    if (!isAdmin(req)) return json(res, 403, { error: "forbidden" });
    const body = await parseBody(req);
    const ok = ModerationQueue.resolve(body.id, body.status || "resolved");
    return json(res, ok ? 200 : 404, ok ? { ok } : { error: "not_found" });
  }
  if (method === "POST" && parsed.pathname === "/api/chat/send") {
    try {
      const body = await parseBody(req);
      const authedUser = getUserFromAuth(req);
      if (body.from) {
        if (!authedUser || String(authedUser.id) !== String(body.from)) return json(res, 401, { error: "token_mismatch" });
      }
      const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
      if (hdrCountry && body.country && String(body.country) !== hdrCountry) return json(res, 403, { error: "cross_country_blocked" });
      if (hdrCountry) body.country = hdrCountry;
      const msg = Chat.send({ from: body.from || (authedUser && authedUser.id), to: body.to, text: body.text, channel: body.channel, whatsapp: body.whatsapp, audioUrl: body.audioUrl });
      return json(res, 200, msg);
    } catch (e) {
      if (e && e.code && (e.code === "sender_blocked" || e.code === "sender_muted")) {
        return json(res, 403, { error: e.code });
      }
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "GET" && parsed.pathname === "/api/chat/thread") {
    try {
      const authed = requireUser(req);
      const userA = String(parsed.query.userA || "");
      const userB = String(parsed.query.userB || "");
      const limit = parsed.query.limit ? Number(parsed.query.limit) : 50;
      if (!userA || !userB) return json(res, 400, { error: "userA and userB required" });
      if (![userA, userB].includes(String(authed.id)) && !isAdmin(req)) return json(res, 403, { error: "forbidden" });
      const hdrCountry = req.headers["x-country"] ? String(req.headers["x-country"]).trim() : null;
      if (hdrCountry) {
        const a = Profiles.getProfile(userA);
        const b = Profiles.getProfile(userB);
        const aC = a && a.country;
        const bC = b && b.country;
        if ((aC && aC !== hdrCountry) || (bC && bC !== hdrCountry)) return json(res, 403, { error: "cross_country_blocked" });
      }
      const items = Chat.thread({ userA, userB, limit });
      return json(res, 200, { items });
    } catch (e) {
      if (e.message === "auth_required") return json(res, 401, { error: "auth_required" });
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/ai/suggest") {
    try {
      const body = await parseBody(req);
      const dataUrl = String(body.image || "");
      let b64 = null;
      if (dataUrl.startsWith("data:image/")) {
        b64 = dataUrl.split(",")[1];
      }
      const ai = await AI.suggestFromMedia({ title: body.title, description: body.description, imageBase64: b64 });
      if (ai.risk === "blocked") {
        ModerationQueue.add("ai_flagged_listing", { title: body.title, description: body.description });
      }
      return json(res, 200, ai);
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/ai/translate") {
    try {
      const body = await parseBody(req);
      const target = String(body.to || "en");
      if (Array.isArray(body.texts)) {
        const outs = [];
        for (const t of body.texts) {
          const r = await AI.translateText(String(t || ""), target);
          if (!r.ok) return json(res, 400, { error: r.error || "translation_failed" });
          outs.push(r.text);
        }
        return json(res, 200, { texts: outs });
      } else {
        const out = await AI.translateText(String(body.text || ""), target);
        if (!out.ok) return json(res, 400, { error: out.error || "translation_failed" });
        return json(res, 200, { text: out.text });
      }
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/ai/translate") {
    try {
      const body = await parseBody(req);
      const out = await AI.translateText(String(body.text || ""), String(body.to || "en"));
      if (!out.ok) return json(res, 400, { error: out.error || "translation_failed" });
      return json(res, 200, { text: out.text });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/auth/request-otp") {
    try {
      const body = await parseBody(req);
      const out = Auth.requestOtp(body);
      // expose code only in dev
      return json(res, 200, { sent: true, devCode: DEV_MODE ? out.devCode : undefined });
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/auth/verify-otp") {
    try {
      const body = await parseBody(req);
      const out = Auth.verifyOtp(body);
      return json(res, 200, out);
    } catch (e) {
      return json(res, 400, { error: e.message || "bad request" });
    }
  }
  if (method === "POST" && parsed.pathname === "/api/chat/upload-voice") {
    try {
      const body = await parseBody(req);
      const dataUrl = String(body.dataUrl || "");
      if (!dataUrl.startsWith("data:audio/")) return json(res, 400, { error: "dataUrl required (audio)" });
      const [meta, b64] = dataUrl.split(",");
      const ext = meta.includes("webm") ? "webm" : "ogg";
      const buf = Buffer.from(b64, "base64");
      const key = `voice/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      if (AWS_REGION && S3_BUCKET) {
        const client = new S3Client({ region: AWS_REGION });
        await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buf, ContentType: meta.split(";")[0].replace("data:", "") }));
        const base = S3_UPLOAD_BASE || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
        return json(res, 200, { url: `${base}/${key}` });
      } else {
        const dir = path.join(__dirname, "uploads");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const filename = key.replace("voice/", "");
        fs.writeFileSync(path.join(dir, filename), buf);
        return json(res, 200, { url: `/uploads/${filename}` });
      }
    } catch (e) {
      return json(res, 400, { error: e.message || "upload failed" });
    }
  }
  if (method === "GET" && parsed.pathname.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, parsed.pathname);
    if (!fs.existsSync(filePath)) return json(res, 404, { error: "Not found" });
    const stream = fs.createReadStream(filePath);
    stream.on("open", () => {
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      stream.pipe(res);
    });
    stream.on("error", () => json(res, 500, { error: "read error" }));
    return;
  }
  json(res, 404, { error: "Not found" });
});

if (require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port, "0.0.0.0", () => {
    const msg = `OLEXX backend running at http://localhost:${port}/`;
    process.stdout.write(msg + "\n");
  });
}

module.exports = { server };
