const buckets = new Map();

function now() {
  return Date.now();
}

function keyFor(id) {
  return String(id || "anon");
}

function createLimiter({ windowMs = 60_000, max = 5 } = {}) {
  return {
    consume: (id) => {
      const k = keyFor(id);
      const t = now();
      let b = buckets.get(k);
      if (!b) {
        b = { ts: t, count: 0 };
        buckets.set(k, b);
      }
      if (t - b.ts > windowMs) {
        b.ts = t;
        b.count = 0;
      }
      if (b.count >= max) return false;
      b.count += 1;
      return true;
    },
    status: (id) => {
      const k = keyFor(id);
      const b = buckets.get(k);
      if (!b) return { remaining: max, resetInMs: 0 };
      const resetInMs = Math.max(0, b.ts + windowMs - now());
      return { remaining: Math.max(0, max - b.count), resetInMs };
    },
  };
}

module.exports = { createLimiter };
