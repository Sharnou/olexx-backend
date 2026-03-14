const http = require("http");
const https = require("https");
const { URL } = require("url");
const { ES_HOST, ES_INDEX } = require("./config");
const { TAXONOMY } = require("./taxonomy");

function req(method, path, body) {
  const u = new URL(ES_HOST);
  const isHttps = u.protocol === "https:";
  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    method,
    path,
    headers: { "Content-Type": "application/json" },
  };
  return new Promise((resolve, reject) => {
    const lib = isHttps ? https : http;
    const r = lib.request(opts, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        const code = res.statusCode || 0;
        if (code >= 200 && code < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve({});
          }
        } else {
          resolve({ error: true, status: code, body: data });
        }
      });
    });
    r.on("error", reject);
    if (body !== undefined) r.write(typeof body === "string" ? body : JSON.stringify(body));
    r.end();
  });
}

async function existsIndex() {
  const u = new URL(ES_HOST);
  const path = `/${encodeURIComponent(ES_INDEX)}`;
  const isHttps = u.protocol === "https:";
  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    method: "HEAD",
    path,
  };
  return new Promise((resolve) => {
    const lib = isHttps ? https : http;
    const r = lib.request(opts, (res) => resolve((res.statusCode || 0) === 200));
    r.on("error", () => resolve(false));
    r.end();
  });
}

async function ensureIndex() {
  const ok = await existsIndex();
  if (ok) return { created: false };
  const body = {
    mappings: {
      dynamic: true,
      properties: {
        title: { type: "text" },
        description: { type: "text" },
        category: {
          properties: {
            l1: { type: "keyword" },
            l2: { type: "keyword" },
          },
        },
        attributes: { type: "object", enabled: true },
        seller: {
          properties: {
            rating: { type: "float" },
            reviews: { type: "integer" },
          },
        },
        createdAt: { type: "date" },
        price: { type: "double" },
      },
    },
  };
  const res = await req("PUT", `/${encodeURIComponent(ES_INDEX)}`, body);
  return { created: true, res };
}

async function indexDoc(doc) {
  const id = doc.id;
  const body = { ...doc };
  if (!body.createdAt) body.createdAt = new Date().toISOString();
  if (id) {
    const r = await req("PUT", `/${encodeURIComponent(ES_INDEX)}/_doc/${encodeURIComponent(id)}`, body);
    return id;
  } else {
    const r = await req("POST", `/${encodeURIComponent(ES_INDEX)}/_doc`, body);
    const _id = r && r._id ? r._id : `${Date.now()}`;
    return _id;
  }
}

async function indexBulk(docs) {
  const lines = [];
  for (const d of docs || []) {
    const id = d.id;
    const meta = { index: { _index: ES_INDEX } };
    if (id) meta.index._id = id;
    lines.push(JSON.stringify(meta));
    const body = { ...d };
    if (!body.createdAt) body.createdAt = new Date().toISOString();
    lines.push(JSON.stringify(body));
  }
  const payload = lines.join("\n") + "\n";
  const res = await req("POST", `/${encodeURIComponent(ES_INDEX)}/_bulk`, payload);
  const ids = [];
  if (res && res.items) {
    for (const it of res.items) {
      const k = it.index || it.create || it.update || it;
      if (k && k._id) ids.push(k._id);
    }
  }
  return ids;
}

function buildQuery(q) {
  const must = [];
  const filter = [];
  if (q.text) {
    must.push({
      multi_match: {
        query: q.text,
        fields: ["title^3", "description^2", "category.l1", "category.l2", "attributes.*"],
        type: "best_fields",
      },
    });
  }
  if (q.l1) filter.push({ term: { "category.l1": q.l1 } });
  if (q.l2) filter.push({ term: { "category.l2": q.l2 } });
  if (q.filters) {
    for (const [k, v] of Object.entries(q.filters)) {
      const path = `attributes.${k}`;
      if (v && typeof v === "object") {
        const r = {};
        if (v.gte !== undefined) r.gte = v.gte;
        if (v.lte !== undefined) r.lte = v.lte;
        if (Object.keys(r).length) filter.push({ range: { [path]: r } });
        if (v.eq !== undefined) filter.push({ term: { [path]: v.eq } });
      } else {
        filter.push({ term: { [path]: v } });
      }
    }
  }
  const functions = [
    {
      filter: { bool: { must: [{ range: { "seller.reviews": { gte: 5 } } }, { range: { "seller.rating": { gte: 4.5 } } }] } },
      weight: 1.3,
    },
    {
      filter: { bool: { must: [{ range: { "seller.reviews": { gte: 3 } } }, { range: { "seller.rating": { lte: 2.0 } } }] } },
      weight: 0.7,
    },
  ];
  const query = {
    function_score: {
      query: { bool: { must, filter } },
      functions,
      score_mode: "multiply",
      boost_mode: "multiply",
    },
  };
  const sort = [];
  if (q.sort === "newest") sort.push({ createdAt: { order: "desc" } });
  if (q.sort === "cheapest") sort.push({ price: { order: "asc" } });
  if (sort.length === 0) sort.push("_score");
  return { query, sort };
}

async function search(q) {
  const page = Math.max(1, Number(q.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
  const { query, sort } = buildQuery(q || {});
  const res = await req("POST", `/${encodeURIComponent(ES_INDEX)}/_search`, {
    from: (page - 1) * pageSize,
    size: pageSize,
    query,
    sort,
  });
  const hits = (res && res.hits && res.hits.hits) || [];
  const total = res && res.hits && res.hits.total && res.hits.total.value ? res.hits.total.value : hits.length;
  const items = hits.map((h) => h._source);
  return { total, page, pageSize, items };
}

function suggest(text) {
  const t = (text || "").toString().toLowerCase();
  const out = new Set();
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

async function clear() {
  await req("DELETE", `/${encodeURIComponent(ES_INDEX)}`);
  await ensureIndex();
  return { ok: true };
}

module.exports = { ensureIndex, indexDoc: (d) => indexDoc(d), indexBulk: (ds) => indexBulk(ds), search: (q) => search(q), suggest, clear };
