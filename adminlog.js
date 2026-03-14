const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "data-admin-audit.json");

let logs = [];

function record({ at, admin, action, sellerId, value }) {
  const entry = {
    at: at || new Date().toISOString(),
    admin: String(admin || ""),
    action: String(action || ""),
    sellerId: String(sellerId || ""),
    value: Boolean(value),
  };
  logs.push(entry);
  persist();
  return entry;
}

function list({ sellerId, limit = 100 }) {
  let arr = logs;
  if (sellerId) arr = arr.filter((x) => x.sellerId === String(sellerId));
  return arr.slice(-Math.min(limit, 1000)).reverse();
}

function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(logs));
    return true;
  } catch {
    return false;
  }
}

function load() {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      logs = JSON.parse(raw) || [];
    }
  } catch {
    logs = [];
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

module.exports = { record, list };
