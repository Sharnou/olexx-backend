// Simple heuristic moderation (placeholder for AI model call)
const spamWords = ["free money", "click here", "viagra", "loan fast", "crypto giveaway"];
const sexualWords = ["sex", "nude", "porn", "xxx", "escort", "fetish"];

function normalize(t) {
  return (t || "").toString().toLowerCase();
}

function checkContent(text) {
  const t = normalize(text);
  if (!t) return { flagged: false };
  for (const w of spamWords) {
    if (t.includes(w)) return { flagged: true, reason: "spam" };
  }
  for (const w of sexualWords) {
    if (t.includes(w)) return { flagged: true, reason: "sexual" };
  }
  return { flagged: false };
}

module.exports = { checkContent };
