const https = require("https");
const { WHATSAPP_TOKEN, WHATSAPP_NUMBER_ID } = require("./config");

function sendWhatsapp(to, text) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_NUMBER_ID) {
    return { ok: false, reason: "not_configured" };
  }
  const payload = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text || "" },
  });
  const options = {
    method: "POST",
    host: "graph.facebook.com",
    path: `/v19.0/${WHATSAPP_NUMBER_ID}/messages`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(payload);
    req.end();
  });
}

module.exports = { sendWhatsapp };
