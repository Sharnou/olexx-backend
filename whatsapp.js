const https = require("https");
const { WHATSAPP_TOKEN, WHATSAPP_NUMBER_ID } = require("./config");

function callWhatsApp(payload) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_NUMBER_ID) {
    return Promise.resolve({ ok: false, reason: "not_configured" });
  }
  const body = JSON.stringify(payload);
  const options = {
    method: "POST",
    host: "graph.facebook.com",
    path: `/v19.0/${WHATSAPP_NUMBER_ID}/messages`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(body);
    req.end();
  });
}

function sendWhatsappText(to, text) {
  return callWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text || "" },
  });
}

function sendWhatsappMedia(to, mediaUrl, mediaType = "audio") {
  // WhatsApp supports type: audio|image|video|document with link hosting
  return callWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: mediaType,
    [mediaType]: { link: mediaUrl },
  });
}

module.exports = { sendWhatsappText, sendWhatsappMedia };
