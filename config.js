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
module.exports = { SUPER_ADMIN_EMAIL, DEV_MODE, ES_HOST, ES_INDEX, USE_ES, RABBIT_URL, USE_RABBIT, S3_UPLOAD_BASE, S3_CDN_BASE, USE_AWS_PRESIGN, AWS_REGION, S3_BUCKET, WHATSAPP_TOKEN, WHATSAPP_NUMBER_ID };
