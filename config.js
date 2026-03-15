const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";
const DEV_MODE = process.env.DEV_MODE !== "false"; // default true for local runs
const ES_HOST = process.env.ES_HOST || "http://localhost:9200";
const ES_INDEX = process.env.ES_INDEX || "olexx-listings";
const USE_ES = process.env.USE_ES === "true" || false;
const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
const USE_RABBIT = process.env.USE_RABBIT === "true" || false;
const S3_UPLOAD_BASE = process.env.S3_UPLOAD_BASE || "https://example-bucket.s3.amazonaws.com";
const S3_CDN_BASE = process.env.S3_CDN_BASE || "https://example-cdn.olexx/files";
const USE_AWS_PRESIGN = process.env.USE_AWS_PRESIGN === "true" || false;
const AWS_REGION = process.env.AWS_REGION || null;
const S3_BUCKET = process.env.S3_BUCKET || null;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || null;
const WHATSAPP_NUMBER_ID = process.env.WHATSAPP_NUMBER_ID || null; // WhatsApp Business API phone number id
const AI_API_KEY = process.env.AI_API_KEY || null; // OpenAI-compatible key
const AI_API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const AI_SEARCH_FETCH_URL = process.env.AI_SEARCH_FETCH_URL || "https://api.tavily.com/search";
const AI_SEARCH_FETCH_KEY = process.env.AI_SEARCH_FETCH_KEY || null;
const AUTO_AI_ENABLE = process.env.AUTO_AI_ENABLE === "true";
const AUTO_AI_URL = process.env.AUTO_AI_URL || AI_API_URL;
const AUTO_AI_KEY = process.env.AUTO_AI_KEY || AI_API_KEY;
const OTP_EMAIL_FROM = process.env.OTP_EMAIL_FROM || null; // optional: from address
const OTP_SMS_PROVIDER = process.env.OTP_SMS_PROVIDER || "console"; // console|stub
const TWILIO_SID = process.env.TWILIO_SID || null;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || null;
const TWILIO_FROM = process.env.TWILIO_FROM || null;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || null;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
module.exports = { SUPER_ADMIN_EMAIL, DEV_MODE, ES_HOST, ES_INDEX, USE_ES, RABBIT_URL, USE_RABBIT, S3_UPLOAD_BASE, S3_CDN_BASE, USE_AWS_PRESIGN, AWS_REGION, S3_BUCKET, WHATSAPP_TOKEN, WHATSAPP_NUMBER_ID, AI_API_KEY, AI_API_URL, AI_MODEL, AUTO_AI_ENABLE, AUTO_AI_URL, AUTO_AI_KEY, OTP_EMAIL_FROM, OTP_SMS_PROVIDER, TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, SENDGRID_API_KEY, ADMIN_EMAILS };
