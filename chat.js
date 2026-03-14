const fs = require("fs");
const path = require("path");
const Profiles = require("./profiles");
const Notifications = require("./notifications");
const Whatsapp = require("./whatsapp");
const Moderation = require("./moderation");
const ModerationQueue = require("./moderation-queue");
const file = path.join(__dirname, "data-chat.json");

let messages = [];

function canSend(senderId) {
  const p = Profiles.getProfile(senderId);
  if (!p) return true;
  if (p.blocked) return false;
  if (p.muted) return false;
  return true;
}

function send({ from, to, text, channel = "text", whatsapp, audioUrl }) {
  const sender = String(from || "").trim();
  const recipient = String(to || "").trim();
  const wa = String(whatsapp || "").trim();
  if (!recipient) throw new Error("to required");
  if (!sender && !wa) throw new Error("from or whatsapp required");
  const mode = ["text", "voice", "whatsapp_voice"].includes(channel) ? channel : "text";
  if (mode === "text" && !text) throw new Error("text required");
  if (mode === "voice" && !audioUrl) throw new Error("audioUrl required for voice");
  if (mode === "whatsapp_voice" && !wa && !sender) throw new Error("whatsapp number or sender required");
  // AI/heuristic moderation for spam/sexual; auto-block sender
  if (text) {
    const mod = Moderation.checkContent(text);
    if (mod.flagged) {
      if (sender) Profiles.setBlocked(sender, true); // auto block fake/spam/sexual senders
      ModerationQueue.add("chat_flagged", { from: sender || wa, to: recipient, channel: mode, reason: mod.reason || "flagged" });
      const e = new Error(`auto_blocked_${mod.reason}`);
      e.code = "auto_blocked";
      throw e;
    }
  }
  if (sender) {
    if (!canSend(sender)) {
      const p = Profiles.getProfile(sender) || {};
      const err = p.blocked ? "sender_blocked" : "sender_muted";
      const e = new Error(err);
      e.code = err;
      throw e;
    }
  }
  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from: sender || wa,
    to: recipient,
    text: text ? String(text) : null,
    channel: mode,
    fromWhatsapp: wa || null,
    audioUrl: audioUrl || null,
    at: new Date().toISOString(),
  };
  messages.push(msg);
  persist();
  notifyRecipient(recipient, msg);
  return msg;
}

function notifyRecipient(recipientId, msg) {
  const profile = Profiles.getProfile(recipientId);
  if (!profile) return;
  // Always push in-app notification
  Notifications.push(recipientId, { type: "chat_msg", from: msg.from, channel: msg.channel, at: msg.at });
  // If profile has whatsapp and channel implies WhatsApp, flag a WhatsApp notification (number not exposed)
  if (profile.whatsapp && (msg.channel === "whatsapp_voice" || msg.fromWhatsapp)) {
    Notifications.push(recipientId, { type: "whatsapp_alert", masked: "***", at: msg.at });
    const text = msg.text || "You have a new OLEXX chat message";
    const hasAudio = Boolean(msg.audioUrl);
    if (hasAudio) {
      Whatsapp.sendWhatsappMedia(profile.whatsapp, msg.audioUrl, "audio");
    } else {
      Whatsapp.sendWhatsappText(profile.whatsapp, text);
    }
  }
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
