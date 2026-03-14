const { USE_RABBIT } = require("./config");
const MQ = require("./mq");
const Jobs = require("./image-jobs");

async function start() {
  if (!USE_RABBIT) return;
  await MQ.consume("olexx.images", async (msg) => {
    if (!msg || !msg.jobId) return;
    const id = String(msg.jobId);
    Jobs.markProcessing(id);
    const images = (msg.payload && msg.payload.images) || [];
    const labels = images
      .map((x) => (x.name || x.url || "").toString().toLowerCase())
      .reduce((acc, n) => {
        if (n.includes("sofa") || n.includes("couch")) acc.add("sofa");
        if (n.includes("chair")) acc.add("chair");
        if (n.includes("table")) acc.add("table");
        if (n.includes("iphone")) acc.add("iphone");
        if (n.includes("bmw")) acc.add("car");
        if (n.includes("laptop") || n.includes("macbook")) acc.add("laptop");
        return acc;
      }, new Set());
    const thumbs = images.map((x) => ({
      name: x.name || null,
      url: x.url || null,
      thumbUrl: x.url ? x.url + "?thumb=1" : null,
    }));
    Jobs.markCompleted(id, { labels: Array.from(labels), variants: { thumbnails: thumbs } });
  });
}

start();
