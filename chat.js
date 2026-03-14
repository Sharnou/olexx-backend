const fs = require("fs");
const path = require("path");
const Profiles = require("./profiles");
const file = path.join(__dirname, "data-chat.json");

let messages = [];

function canSend(senderId) {
  const p = Profiles.getProfile(senderId);
  if (!p) return true;
  if (p.blocked) return false;
  if (p.muted) return false;
  return true;
}

function send({ from, to, text }) {
  const sender = String(from || "").trim();
  const recipient = String(to || "").trim();
  if (!sender || !recipient) throw new Error("from/to required");
  if (!text) throw new Error("text required");
  if (!canSend(sender)) {
    const p = Profiles.getProfile(sender) || {};
    const err = p.blocked ? "sender_blocked" : "sender_muted";
    const e = new Error(err);
    e.code = err;
    throw e;
  }
  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from: sender,
    to: recipient,
    text: String(text),
    at: new Date().toISOString(),
  };
  messages.push(msg);
  persist();
  return msg;
}

function thread({ userA, userB, limit = 50 }) {
  const a = String(userA || "");
  const b = String(userB || "");
  const arr = messages.filter((m) => (m.from === a && m.to === b) || (m.from === b && m.to === a));
  const slice = arr.slice(-Math.min(500, limit));
  return slice;
}

function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(messages));
    return true;
  } catch {
    return false;
  }
}

function load() {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      messages = JSON.parse(raw) || [];
    }
  } catch {
    messages = [];
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

module.exports = { send, thread };
