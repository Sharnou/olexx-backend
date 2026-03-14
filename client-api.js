function OlexxClient(baseUrl, adminEmail) {
  this.base = baseUrl.replace(/\/+$/, "");
  this.adminEmail = adminEmail || null;
}

OlexxClient.prototype._headers = function (isAdmin) {
  const h = { "Content-Type": "application/json" };
  if (isAdmin && this.adminEmail) h["x-admin-email"] = this.adminEmail;
  return h;
};

OlexxClient.prototype.health = function () {
  return fetch(this.base + "/health").then((r) => r.json());
};

OlexxClient.prototype.taxonomy = function () {
  return fetch(this.base + "/api/taxonomy").then((r) => r.json());
};

OlexxClient.prototype.classify = function (title, description, imageLabels) {
  return fetch(this.base + "/api/classify", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify({ title, description, imageLabels }),
  }).then((r) => r.json());
};

OlexxClient.prototype.index = function (doc) {
  return fetch(this.base + "/api/index", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify(doc),
  }).then((r) => r.json());
};

OlexxClient.prototype.indexBulk = function (docs) {
  return fetch(this.base + "/api/index/bulk", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify({ docs }),
  }).then((r) => r.json());
};

OlexxClient.prototype.search = function (query) {
  return fetch(this.base + "/api/search", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify(query),
  }).then((r) => r.json());
};

OlexxClient.prototype.suggest = function (text) {
  return fetch(this.base + "/api/suggest?text=" + encodeURIComponent(text)).then((r) => r.json());
};

OlexxClient.prototype.clearIndex = function () {
  return fetch(this.base + "/api/index/clear", { method: "POST", headers: this._headers(false) }).then((r) => r.json());
};

OlexxClient.prototype.persistIndex = function () {
  return fetch(this.base + "/api/index/persist", { method: "POST", headers: this._headers(false) }).then((r) => r.json());
};

OlexxClient.prototype.loadIndex = function () {
  return fetch(this.base + "/api/index/load", { method: "POST", headers: this._headers(false) }).then((r) => r.json());
};

OlexxClient.prototype.getProfile = function (sellerId) {
  return fetch(this.base + "/api/profile?sellerId=" + encodeURIComponent(sellerId)).then((r) => r.json());
};

OlexxClient.prototype.upsertProfile = function (profile) {
  return fetch(this.base + "/api/profile", { method: "POST", headers: this._headers(false), body: JSON.stringify(profile) }).then((r) => r.json());
};

OlexxClient.prototype.register = function (payload) {
  return fetch(this.base + "/api/auth/register", { method: "POST", headers: this._headers(false), body: JSON.stringify(payload) }).then((r) => r.json());
};

OlexxClient.prototype.login = function (payload) {
  return fetch(this.base + "/api/auth/login", { method: "POST", headers: this._headers(false), body: JSON.stringify(payload) }).then((r) => r.json());
};

OlexxClient.prototype.me = function (token) {
  return fetch(this.base + "/api/auth/me", { headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.listingsCreate = function (token, listing) {
  return fetch(this.base + "/api/listings", { method: "POST", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }), body: JSON.stringify(listing) }).then((r) => r.json());
};

OlexxClient.prototype.listingsMine = function (token, page, pageSize) {
  const qs = `?page=${page || 1}&pageSize=${pageSize || 20}`;
  return fetch(this.base + "/api/listings/mine" + qs, { headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.listingsUpdate = function (token, id, partial) {
  const qs = `?id=${encodeURIComponent(id)}`;
  return fetch(this.base + "/api/listings" + qs, { method: "PUT", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }), body: JSON.stringify(partial) }).then((r) => r.json());
};

OlexxClient.prototype.listingsDelete = function (token, id) {
  const qs = `?id=${encodeURIComponent(id)}`;
  return fetch(this.base + "/api/listings" + qs, { method: "DELETE", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.savedAdd = function (token, name, query) {
  return fetch(this.base + "/api/saved-searches", { method: "POST", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }), body: JSON.stringify({ name, query }) }).then((r) => r.json());
};

OlexxClient.prototype.savedList = function (token) {
  return fetch(this.base + "/api/saved-searches", { headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.savedRemove = function (token, id) {
  const qs = `?id=${encodeURIComponent(id)}`;
  return fetch(this.base + "/api/saved-searches" + qs, { method: "DELETE", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.favAdd = function (token, listingId) {
  return fetch(this.base + "/api/favorites", { method: "POST", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }), body: JSON.stringify({ listingId }) }).then((r) => r.json());
};

OlexxClient.prototype.favList = function (token) {
  return fetch(this.base + "/api/favorites", { headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.favRemove = function (token, listingId) {
  const qs = `?listingId=${encodeURIComponent(listingId)}`;
  return fetch(this.base + "/api/favorites" + qs, { method: "DELETE", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.notifications = function (token) {
  return fetch(this.base + "/api/notifications", { headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }) }).then((r) => r.json());
};

OlexxClient.prototype.notificationRead = function (token, id) {
  return fetch(this.base + "/api/notifications/read", { method: "POST", headers: Object.assign(this._headers(false), { Authorization: "Bearer " + token }), body: JSON.stringify({ id }) }).then((r) => r.json());
};

OlexxClient.prototype.addComment = function (sellerId, rating, text, authorId, authorName) {
  return fetch(this.base + "/api/comments", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify({ sellerId, rating, text, authorId, authorName }),
  }).then((r) => r.json());
};

OlexxClient.prototype.listComments = function (sellerId, page, pageSize) {
  const q = `sellerId=${encodeURIComponent(sellerId)}&page=${page || 1}&pageSize=${pageSize || 20}`;
  return fetch(this.base + "/api/comments?" + q).then((r) => r.json());
};

OlexxClient.prototype.recalcSeller = function (sellerId) {
  return fetch(this.base + "/api/seller/recalc", { method: "POST", headers: this._headers(false), body: JSON.stringify({ sellerId }) }).then((r) => r.json());
};

OlexxClient.prototype.adminMe = function () {
  return fetch(this.base + "/api/admin/me", { headers: this._headers(true) }).then((r) => r.json());
};

OlexxClient.prototype.adminStatus = function (sellerId) {
  return fetch(this.base + "/api/admin/status?sellerId=" + encodeURIComponent(sellerId), { headers: this._headers(true) }).then((r) => r.json());
};

OlexxClient.prototype.adminMute = function (sellerId, value) {
  return fetch(this.base + "/api/admin/mute", { method: "POST", headers: this._headers(true), body: JSON.stringify({ sellerId, value }) }).then((r) => r.json());
};

OlexxClient.prototype.adminBlock = function (sellerId, value) {
  return fetch(this.base + "/api/admin/block", { method: "POST", headers: this._headers(true), body: JSON.stringify({ sellerId, value }) }).then((r) => r.json());
};

OlexxClient.prototype.adminAudit = function (sellerId, limit) {
  const q = [];
  if (sellerId) q.push("sellerId=" + encodeURIComponent(sellerId));
  if (limit) q.push("limit=" + Number(limit));
  const qs = q.length ? "?" + q.join("&") : "";
  return fetch(this.base + "/api/admin/audit" + qs, { headers: this._headers(true) }).then((r) => r.json());
};

OlexxClient.prototype.chatSend = function (from, to, text) {
  return fetch(this.base + "/api/chat/send", { method: "POST", headers: this._headers(false), body: JSON.stringify({ from, to, text }) }).then((r) => r.json());
};

OlexxClient.prototype.chatThread = function (userA, userB, limit) {
  const q = `userA=${encodeURIComponent(userA)}&userB=${encodeURIComponent(userB)}&limit=${limit || 50}`;
  return fetch(this.base + "/api/chat/thread?" + q, { headers: this._headers(false) }).then((r) => r.json());
};

OlexxClient.prototype.uploadImages = function (sellerId, listingId, images) {
  return fetch(this.base + "/api/upload", {
    method: "POST",
    headers: this._headers(false),
    body: JSON.stringify({ sellerId, listingId, images }),
  }).then((r) => r.json());
};

OlexxClient.prototype.uploadStatus = function (jobId) {
  return fetch(this.base + "/api/upload/status?jobId=" + encodeURIComponent(jobId), { headers: this._headers(false) }).then((r) => r.json());
};

OlexxClient.prototype.uploadResult = function (jobId) {
  return fetch(this.base + "/api/upload/result?jobId=" + encodeURIComponent(jobId), { headers: this._headers(false) }).then((r) => r.json());
};

if (typeof module !== "undefined") module.exports = { OlexxClient };
