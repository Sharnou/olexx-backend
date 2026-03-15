const https = require("https");
const { AI_SEARCH_FETCH_URL, AI_SEARCH_FETCH_KEY } = require("./config");

// Fetch a small list of new AI search engines. This is deliberately lightweight to run during idle windows.
async function fetchAiEngines() {
  if (!AI_SEARCH_FETCH_KEY) return [];
  const url = new URL(AI_SEARCH_FETCH_URL);
  const body = JSON.stringify({
    query: "latest AI search engines and answer engines released this week",
    max_results: 5,
  });
  return new Promise((resolve) => {
    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: AI_SEARCH_FETCH_KEY.startsWith("Bearer ")
            ? AI_SEARCH_FETCH_KEY
            : `Bearer ${AI_SEARCH_FETCH_KEY}`,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          try {
            const json = JSON.parse(chunks);
            const items = [];
            if (Array.isArray(json.results)) {
              for (const r of json.results) {
                const title = r.title || r.name || "";
                const link = r.url || r.link || "";
                if (title) items.push(`${title} — ${link}`.trim());
              }
            }
            resolve(items);
          } catch {
            resolve([]);
          }
        });
      }
    );
    req.on("error", () => resolve([]));
    req.write(body);
    req.end();
  });
}

module.exports = { fetchAiEngines };
