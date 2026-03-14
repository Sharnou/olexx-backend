const { USE_RABBIT, RABBIT_URL } = require("./config");

let amqp = null;
try {
  amqp = require("amqplib");
} catch {
  amqp = null;
}

let conn = null;
let ch = null;

async function ensure() {
  if (!USE_RABBIT || !amqp) return false;
  if (conn && ch) return true;
  try {
    conn = await amqp.connect(RABBIT_URL);
    ch = await conn.createChannel();
    return true;
  } catch {
    conn = null;
    ch = null;
    return false;
  }
}

async function assertQueue(name) {
  if (!(await ensure())) return false;
  try {
    await ch.assertQueue(name, { durable: true });
    return true;
  } catch {
    return false;
  }
}

async function publish(name, msg) {
  const ok = await assertQueue(name);
  if (!ok) return false;
  try {
    ch.sendToQueue(name, Buffer.from(JSON.stringify(msg)), { persistent: true });
    return true;
  } catch {
    return false;
  }
}

async function consume(name, handler) {
  const ok = await assertQueue(name);
  if (!ok) return false;
  try {
    await ch.consume(
      name,
      async (m) => {
        if (!m) return;
        let payload = null;
        try {
          payload = JSON.parse(m.content.toString());
        } catch {}
        try {
          await handler(payload);
          ch.ack(m);
        } catch {
          ch.nack(m, false, true);
        }
      },
      { noAck: false }
    );
    return true;
  } catch {
    return false;
  }
}

module.exports = { publish, consume, ensure };
