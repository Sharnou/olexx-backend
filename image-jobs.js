const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "data-image-jobs.json");
const jobs = new Map();

function ensureId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createJob(payload) {
  const id = ensureId();
  const j = {
    id,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    payload: payload || {},
    result: null,
  };
  jobs.set(id, j);
  persist();
  return id;
}

function getStatus(id) {
  const j = jobs.get(String(id));
  if (!j) return null;
  return { id: j.id, status: j.status, updatedAt: j.updatedAt };
}

function getResult(id) {
  const j = jobs.get(String(id));
  if (!j) return null;
  return { id: j.id, status: j.status, result: j.result, updatedAt: j.updatedAt };
}

function markProcessing(id) {
  const j = jobs.get(String(id));
  if (!j) return false;
  j.status = "processing";
  j.updatedAt = new Date().toISOString();
  persist();
  return true;
}

function markCompleted(id, result) {
  const j = jobs.get(String(id));
  if (!j) return false;
  j.status = "completed";
  j.result = result || {};
  j.updatedAt = new Date().toISOString();
  persist();
  return true;
}

function simulateLabels(images) {
  const labels = new Set();
  for (const img of images || []) {
    const n = (img.name || img.url || "").toString().toLowerCase();
    if (n.includes("sofa") || n.includes("couch")) labels.add("sofa");
    if (n.includes("chair")) labels.add("chair");
    if (n.includes("table")) labels.add("table");
    if (n.includes("iphone")) labels.add("iphone");
    if (n.includes("bmw")) labels.add("car");
    if (n.includes("laptop") || n.includes("macbook")) labels.add("laptop");
  }
  return Array.from(labels);
}

function scheduleLocalProcessing(id) {
  setTimeout(() => {
    const j = jobs.get(String(id));
    if (!j) return;
    markProcessing(id);
    const labels = simulateLabels(j.payload.images || []);
    const thumbs = (j.payload.images || []).map((x) => ({
      name: x.name || null,
      url: x.url || null,
      thumbUrl: x.url ? x.url + "?thumb=1" : null,
    }));
    markCompleted(id, { labels, variants: { thumbnails: thumbs } });
  }, 100);
}

function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(Array.from(jobs.values())));
  } catch {}
}

function load() {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const arr = JSON.parse(raw) || [];
      jobs.clear();
      for (const j of arr) jobs.set(j.id, j);
    }
  } catch {}
}

process.on("SIGINT", () => {
  persist();
  process.exit(0);
});
process.on("beforeExit", () => {
  persist();
});

load();

module.exports = {
  createJob,
  getStatus,
  getResult,
  markProcessing,
  markCompleted,
  scheduleLocalProcessing,
};
