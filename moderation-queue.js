const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "data-moderation.json");

let items = [];

function load() {
  try {
    if (fs.existsSync(file)) items = JSON.parse(fs.readFileSync(file, "utf8")) || [];
  } catch {
    items = [];
  }
}

function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
  } catch {}
}

function add(reason, payload) {
  const it = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    reason,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  items.push(it);
  persist();
  return it.id;
}

function list(status) {
  if (status) return items.filter((i) => i.status === status);
  return items;
}

function resolve(id, status) {
  const it = items.find((i) => i.id === id);
  if (!it) return false;
  it.status = status || "resolved";
  it.resolvedAt = new Date().toISOString();
  persist();
  return true;
}

load();

module.exports = { add, list, resolve };
