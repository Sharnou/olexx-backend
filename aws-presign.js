const { USE_AWS_PRESIGN, AWS_REGION, S3_BUCKET, S3_CDN_BASE } = require("./config");

async function presign(filename, contentType) {
  if (!USE_AWS_PRESIGN || !AWS_REGION || !S3_BUCKET) return null;
  let S3Client, PutObjectCommand, getSignedUrl;
  try {
    // Lazy require; if not installed, return null to fall back
    ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
    ({ getSignedUrl } = require("@aws-sdk/s3-request-presigner"));
  } catch {
    return null;
  }
  const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${filename.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
  const client = new S3Client({ region: AWS_REGION });
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    ACL: "public-read",
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });
  const cdnUrl = S3_CDN_BASE ? `${S3_CDN_BASE}/${encodeURIComponent(key)}` : null;
  return { key, uploadUrl, cdnUrl, headers: { "Content-Type": contentType || "application/octet-stream" } };
}

module.exports = { presign };
