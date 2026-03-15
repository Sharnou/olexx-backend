const https = require("https");
const { AI_API_KEY, AI_API_URL, AI_MODEL } = require("./config");

function callOpenAI(prompt, imageBase64) {
  if (!AI_API_KEY) return Promise.resolve({ ok: false, reason: "not_configured" });
  const body = {
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are an assistant that extracts marketplace listing details and flags spam/sexual/fake content.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          imageBase64
            ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            : null,
        ].filter(Boolean),
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  };
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const url = new URL(AI_API_URL);
    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Authorization: `Bearer ${AI_API_KEY}`,
      },
    };
    const req = https.request(options, (res) => {
      let chunks = "";
      res.on("data", (d) => (chunks += d));
      res.on("end", () => {
        try {
          const json = JSON.parse(chunks);
          const content = json.choices?.[0]?.message?.content || "";
          resolve({ ok: true, content });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

function parseExtraction(text) {
  const out = { brand: null, model: null, color: null, l1: null, l2: null, priceHint: null, risk: null, suggestion: text };
  const lower = text.toLowerCase();
  if (lower.includes("spam") || lower.includes("sexual")) out.risk = "blocked";
  // naive parsing
  const brandMatch = text.match(/brand:\s*([^\n,]+)/i);
  const modelMatch = text.match(/model:\s*([^\n,]+)/i);
  const priceMatch = text.match(/price[:\s]+([\d,.]+)/i);
  const catMatch = text.match(/category[:\s]+([^\n]+)/i);
  if (brandMatch) out.brand = brandMatch[1].trim();
  if (modelMatch) out.model = modelMatch[1].trim();
  if (priceMatch) out.priceHint = Number(priceMatch[1].replace(/[,]/g, "")) || null;
  if (catMatch) {
    const parts = catMatch[1].split(">");
    out.l1 = parts[0].trim();
    out.l2 = parts[1] ? parts[1].trim() : null;
  }
  return out;
}

async function suggestFromMedia({ title, description, imageBase64 }) {
  const prompt = `Extract brand, model, color, category and fair price from listing. Also flag spam/sexual/fake. Return short bullet text. Title: "${title || ""}" Desc: "${description || ""}".`;
  const ai = await callOpenAI(prompt, imageBase64);
  if (!ai.ok) {
    return {
      suggestion: "AI unavailable, using fallback.",
      brand: null,
      model: null,
      l1: null,
      l2: null,
      priceHint: null,
      risk: null,
    };
  }
  return parseExtraction(ai.content);
}

async function translateText(text, targetLang) {
  // If no key, just echo input to avoid breaking UX
  if (!AI_API_KEY) return { ok: true, text };
  const prompt = `Translate the following content to ${targetLang}. Keep numbers and proper nouns.`;
  const body = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: "You translate text accurately and keep formatting minimal." },
      { role: "user", content: prompt },
      { role: "user", content: text },
    ],
    max_tokens: 600,
    temperature: 0.2,
  };
  const url = new URL(AI_API_URL);
  const data = JSON.stringify(body);
  return new Promise((resolve) => {
    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Bearer ${AI_API_KEY}`,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          try {
            const json = JSON.parse(chunks);
            const content = json.choices?.[0]?.message?.content || "";
            resolve({ ok: true, text: content });
          } catch (e) {
            resolve({ ok: false, error: e.message });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

async function safeTranslate(text, targetLang) {
  const out = await translateText(text, targetLang);
  if (!out.ok) {
    return { ok: true, text }; // fallback to original text on any failure
  }
  return out;
}

module.exports = { suggestFromMedia, translateText: safeTranslate };
