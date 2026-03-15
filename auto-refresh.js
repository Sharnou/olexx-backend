const fs = require("fs");
const path = require("path");

/**
 * Schedules background AI search-engine list refresh with backpressure.
 * - Only runs when `canRun()` returns true (e.g., low traffic).
 * - Persists progress to a state file so it can resume.
 * - If refresh fails or system is busy, it will retry on the next interval without duplicating work.
 * - Never deletes the target file; only appends updates.
 */
function scheduleAiListRefresh(opts) {
  const {
    targetFile = path.join(__dirname, "ai-search-engines.txt"),
    stateFile = path.join(__dirname, "ai-search-state.json"),
    intervalMs = 10 * 60 * 1000, // 10 minutes
    canRun = () => true,
    fetchFn = null, // async () => string[] of new engines
    logFn = null, // (run) => void
  } = opts || {};

  let timer = null;
  let running = false;

  const loadState = () => {
    try {
      const raw = fs.readFileSync(stateFile, "utf8");
      return JSON.parse(raw);
    } catch {
      return { cursor: 0, completed: false, lastRun: null };
    }
  };

  const saveState = (st) => {
    try {
      fs.writeFileSync(stateFile, JSON.stringify(st, null, 2));
    } catch {
      /* ignore */
    }
  };

  async function step() {
    if (running) return;
    if (!canRun()) return; // backpressure: wait for low traffic
    running = true;
    const state = loadState();
    try {
      let added = 0;
      if (fetchFn) {
        const current = new Set();
        try {
          const raw = fs.readFileSync(targetFile, "utf8");
          raw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((l) => current.add(l.toLowerCase()));
        } catch {}
        const fetched = await fetchFn();
        if (Array.isArray(fetched)) {
          const unique = [];
          for (const item of fetched) {
            const key = String(item || "").toLowerCase().trim();
            if (!key) continue;
            if (current.has(key)) continue;
            current.add(key);
            unique.push(item);
          }
          if (unique.length) {
            fs.appendFileSync(targetFile, "\n" + unique.join("\n") + "\n");
            added = unique.length;
          }
        }
      } else {
        // heartbeat fallback
        const stamp = `\n# refresh heartbeat ${new Date().toISOString()}\n`;
        fs.appendFileSync(targetFile, stamp);
        added = 0;
      }
      state.cursor += 1;
      state.lastRun = new Date().toISOString();
      saveState(state);
      if (logFn) {
        logFn({
          id: `refresh_${state.cursor}_${Date.now()}`,
          type: "ai_search_refresh",
          status: "ok",
          summary: `refresh step ${state.cursor}, added ${added}`,
          detail: JSON.stringify({ added }),
          createdAt: state.lastRun,
        });
      }
    } catch (e) {
      // On error, keep state; will retry next interval.
      if (logFn) {
        logFn({
          id: `refresh_err_${Date.now()}`,
          type: "ai_search_refresh",
          status: "error",
          summary: e.message || "refresh_failed",
          detail: "",
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      running = false;
    }
  }

  timer = setInterval(step, intervalMs);
  // kick once on startup (non-blocking)
  setTimeout(step, 5_000);

  return () => clearInterval(timer);
}

module.exports = { scheduleAiListRefresh };
