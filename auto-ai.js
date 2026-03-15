const fs = require("fs");
const path = require("path");
const https = require("https");
const { TAXONOMY } = require("./taxonomy");
const DB = require("./db");
const { AUTO_AI_URL, AUTO_AI_KEY, AUTO_AI_ENABLE } = require("./config");
const InMemory = require("./search");

function buildSitemapXml(base) {
  const docs = InMemory.listDocs ? InMemory.listDocs() : [];
  const urls = [];
  const now = new Date().toISOString();
  urls.push({ loc: "/", lastmod: now });
  urls.push({ loc: "/admin.html", lastmod: now });
  const popular = ["/popular/electronics", "/popular/cars", "/popular/properties"];
  popular.forEach((p) => urls.push({ loc: p, lastmod: now }));
  const electronicsSubs = [
    "computers/laptops",
    "computers/desktops",
    "computers/accessories",
    "tv-audio/video",
    "gaming/consoles",
    "gaming/games-accessories",
    "cameras/imaging",
    "home-appliances/large",
    "home-appliances/climate",
    "home-appliances/kitchen",
  ];
  electronicsSubs.forEach((p) => urls.push({ loc: `/category/Electronics/${p}`, lastmod: now }));
  for (const group of TAXONOMY) {
    urls.push({ loc: `/category/${encodeURIComponent(group.l1)}`, lastmod: now });
    for (const cat of group.categories) {
      urls.push({ loc: `/category/${encodeURIComponent(group.l1)}/${encodeURIComponent(cat.l2)}`, lastmod: now });
    }
  }
  const citySet = new Set();
  const districtSet = new Set();
  for (const d of docs || []) {
    if (d.city) citySet.add(d.city);
    if (d.location && d.location.district) districtSet.add(`${d.city || "city"}/${d.location.district}`);
    urls.push({
      loc: `/listing/${encodeURIComponent(d.id)}`,
      lastmod: d.createdAt ? new Date(d.createdAt).toISOString() : now,
    });
  }
  for (const c of citySet) urls.push({ loc: `/city/${encodeURIComponent(c)}`, lastmod: now });
  for (const cd of districtSet) urls.push({ loc: `/city/${encodeURIComponent(cd)}`, lastmod: now });
  const popularSearches = ["iphone", "corolla", "ps5", "lenovo laptop", "smart tv"];
  popularSearches.forEach((q) => urls.push({ loc: `/search?q=${encodeURIComponent(q)}`, lastmod: now }));
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${base}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`)
      .join("\n") +
    "\n</urlset>";
  return xml;
}

function callAutoAI(payload) {
  return new Promise((resolve) => {
    if (!AUTO_AI_KEY || !AUTO_AI_URL) return resolve({ ok: false, reason: "not_configured" });
    const url = new URL(AUTO_AI_URL);
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Bearer ${AUTO_AI_KEY}`,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          try {
            const json = JSON.parse(chunks);
            resolve({ ok: true, data: json });
          } catch (e) {
            resolve({ ok: false, reason: e.message });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, reason: err.message }));
    req.write(data);
    req.end();
  });
}

async function runAutoUpgrade(baseUrl = "http://localhost:3000") {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const sitemap = buildSitemapXml(baseUrl);

  const bannerPath = path.join(__dirname, "public", "banner.txt");
  const summary = [];
  // Write sitemap to disk for crawlers (keeps runtime route too)
  fs.writeFileSync(path.join(__dirname, "public", "sitemap.xml"), sitemap);
  summary.push("Sitemap regenerated");

  // Update banner copy with timestamp (AI optional)
  let banner = `OLEXX — fresh update at ${new Date().toISOString()}`;
  if (AUTO_AI_ENABLE) {
    const ai = await callAutoAI({
      task: "refresh theme banner and tagline",
      context: "OLEXX marketplace wants happy users. Keep it concise.",
    });
    if (ai.ok && ai.data?.banner) {
      banner = String(ai.data.banner).slice(0, 240);
      summary.push("Banner updated by AI");
    } else {
      summary.push("Banner fallback (AI unavailable)");
    }
  } else {
    summary.push("Banner updated (auto AI disabled)");
  }
  fs.writeFileSync(bannerPath, banner);

  const detail = { sitemapBytes: sitemap.length, banner };
  DB.saveAutoAiRun({ id, status: "ok", summary: summary.join("; "), detail: JSON.stringify(detail) });
  return { id, summary, detail };
}

module.exports = { runAutoUpgrade, buildSitemapXml };
