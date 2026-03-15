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
      // Placeholder refresh: in a real refresh, fetch new engines and append.
      // We avoid duplication by advancing cursor; here we simply record a heartbeat.
      const stamp = `\n# refresh heartbeat ${new Date().toISOString()}\n`;
      fs.appendFileSync(targetFile, stamp);
      state.cursor += 1;
      state.lastRun = new Date().toISOString();
      saveState(state);
    } catch (e) {
      // On error, keep state; will retry next interval.
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
