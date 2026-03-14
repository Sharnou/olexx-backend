const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const usersFile = path.join(__dirname, "data-users.json");
const sessionsFile = path.join(__dirname, "data-sessions.json");

const users = new Map();
const sessions = new Map();
const otps = new Map(); // key -> { code, exp }
const { OTP_EMAIL_FROM, OTP_SMS_PROVIDER, DEV_MODE } = require("./config");

function persist() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(Array.from(users.values())));
    fs.writeFileSync(sessionsFile, JSON.stringify(Array.from(sessions.values())));
  } catch {}
}

function load() {
  try {
    if (fs.existsSync(usersFile)) {
      const raw = fs.readFileSync(usersFile, "utf8");
      const arr = JSON.parse(raw) || [];
      users.clear();
      for (const u of arr) users.set(String(u.id), u);
    }
    if (fs.existsSync(sessionsFile)) {
      const raw = fs.readFileSync(sessionsFile, "utf8");
      const arr = JSON.parse(raw) || [];
      sessions.clear();
      for (const s of arr) sessions.set(String(s.token), s);
    }
  } catch {}
}

function id() {
  return crypto.randomBytes(12).toString("hex");
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function otpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function requestOtp(body) {
  const method = String(body.method || "").toLowerCase().trim();
  const value = method === "email" ? String(body.email || "").trim().toLowerCase() : String(body.phone || "").trim();
  if (!value) throw new Error(`${method} required`);
  const code = otpCode();
  const exp = Date.now() + 5 * 60 * 1000;
  otps.set(value, { code, exp });
  persist();
  deliverOtp(method, value, code);
  return { sent: true, devCode: DEV_MODE ? code : undefined };
}

function verifyOtp(body) {
  const method = String(body.method || "").toLowerCase().trim();
  const value = method === "email" ? String(body.email || "").trim().toLowerCase() : String(body.phone || "").trim();
  const code = String(body.code || "").trim();
  if (!value || !code) throw new Error("value and code required");
  const entry = otps.get(value);
  if (!entry || entry.code !== code || entry.exp < Date.now()) throw new Error("invalid_code");
  // clear OTP
  otps.delete(value);
  if (method === "email") {
    return register({ method: "email", email: value, name: body.name || "" });
  } else if (method === "phone") {
    return register({ method: "phone", phone: value, name: body.name || "" });
  }
  throw new Error("invalid method");
}

function findUserBy(method, value) {
  value = String(value || "").toLowerCase().trim();
  for (const u of users.values()) {
    if (method === "email" && String(u.email || "").toLowerCase().trim() === value) return u;
    if (method === "phone" && String(u.phone || "").toLowerCase().trim() === value) return u;
    if (method === "social" && u.social && u.social.provider && u.social.providerId) {
      const k = `${u.social.provider}:${u.social.providerId}`.toLowerCase();
      if (k === value) return u;
    }
  }
  return null;
}

function register(body) {
  const method = String(body.method || "").toLowerCase().trim();
  let u = null;
  if (method === "email") {
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) throw new Error("email required");
    u = findUserBy("email", email);
    if (!u) {
      u = { id: id(), email, name: body.name || "", phone: null, social: null, createdAt: new Date().toISOString() };
      users.set(u.id, u);
    }
  } else if (method === "phone") {
    const phone = String(body.phone || "").trim();
    if (!phone) throw new Error("phone required");
    u = findUserBy("phone", phone);
    if (!u) {
      u = { id: id(), phone, name: body.name || "", email: null, social: null, createdAt: new Date().toISOString() };
      users.set(u.id, u);
    }
  } else if (method === "social") {
    const provider = String(body.provider || "").toLowerCase().trim();
    const providerId = String(body.providerId || "").trim();
    if (!provider || !providerId) throw new Error("provider and providerId required");
    const key = `${provider}:${providerId}`.toLowerCase();
    u = findUserBy("social", key);
    if (!u) {
      u = { id: id(), social: { provider, providerId }, name: body.name || "", email: body.email || null, phone: null, createdAt: new Date().toISOString() };
      users.set(u.id, u);
    }
  } else {
    throw new Error("invalid method");
  }
  const t = token();
  const s = { token: t, userId: u.id, createdAt: new Date().toISOString() };
  sessions.set(t, s);
  persist();
  return { user: u, token: t };
}

function login(body) {
  const method = String(body.method || "").toLowerCase().trim();
  let u = null;
  if (method === "email") {
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) throw new Error("email required");
    u = findUserBy("email", email);
  } else if (method === "phone") {
    const phone = String(body.phone || "").trim();
    if (!phone) throw new Error("phone required");
    u = findUserBy("phone", phone);
  } else if (method === "social") {
    const provider = String(body.provider || "").toLowerCase().trim();
    const providerId = String(body.providerId || "").trim();
    if (!provider || !providerId) throw new Error("provider and providerId required");
    const key = `${provider}:${providerId}`.toLowerCase();
    u = findUserBy("social", key);
  } else {
    throw new Error("invalid method");
  }
  if (!u) throw new Error("not_found");
  const t = token();
  const s = { token: t, userId: u.id, createdAt: new Date().toISOString() };
  sessions.set(t, s);
  persist();
  return { user: u, token: t };
}

function getUserByToken(t) {
  const s = sessions.get(String(t || "").trim());
  if (!s) return null;
  const u = users.get(String(s.userId));
  if (!u) return null;
  return u;
}

function getUser(id) {
  return users.get(String(id)) || null;
}

function deliverOtp(method, value, code) {
  // Stub delivery: in production integrate email/SMS provider
  if (DEV_MODE || OTP_SMS_PROVIDER === "console") {
    console.log(`[OTP] ${method} ${value}: ${code}`);
  }
  // Email/SMS integrations can be added here.
}

load();

process.on("SIGINT", () => {
  persist();
  process.exit(0);
});
process.on("beforeExit", () => {
  persist();
});

module.exports = { register, login, getUserByToken, getUser, requestOtp, verifyOtp };
