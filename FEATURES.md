# OLEXX Feature Checklist (15 points)

1. **Header Component**
```jsx
export default function Header() {
  return (
    <header className="bg-primary text-white p-4 flex justify-between">
      <div className="text-xl font-bold">OLEXX</div>
      <div className="flex gap-4">
        <a href="/sell" className="bg-yellow-400 px-4 py-2 rounded">Sell</a>
      </div>
    </header>
  );
}
```

2. **Ad Card**
```jsx
export default function AdCard({ ad }) {
  return (
    <div className="border rounded shadow">
      <img src={ad.image} className="h-40 w-full object-cover" />
      <div className="p-3">
        <h3 className="font-semibold">{ad.title}</h3>
        <p className="text-green-600">{ad.price}</p>
      </div>
    </div>
  );
}
```

3. **Sell Page Form** — supports 5 photos OR 1 video (30s).
```jsx
export default function Sell() {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Post Ad</h1>
      <input placeholder="Title" className="border p-2 w-full mt-4" />
      <textarea placeholder="Description" className="border p-2 w-full mt-4" />
      <input type="file" multiple accept="image/*,video/*" className="mt-4" />
      <button className="bg-primary text-white p-3 mt-4 rounded">Publish</button>
    </div>
  );
}
```

4. **Database (PostgreSQL)**
```
Users: id, name, email, password, country, role, created_at
Ads: id, title, description, price, category, country, city, images, video, user_id, is_featured, created_at
```

5. **Admin Super Control**
- Admin email: `Ahmed_sharnou@yahoo.com`
- Powers: delete users, block users, feature ads, delete ads, ban IP
```js
function checkAdmin(user) {
  if (user.email === "Ahmed_sharnou@yahoo.com") return "superadmin";
}
```

6. **Country-Separated Marketplace**
```js
export async function getAds(country) {
  const ads = await db.query("SELECT * FROM ads WHERE country=$1", [country]);
  return ads;
}
```
- Egypt users see Egypt ads; UAE users see UAE ads.
- Location via IP geolocation, browser language, GPS.

7. **AI Sell With Photo**
```js
export async function generateListing(image) {
  const result = await aiVision(image);
  return {
    title: result.title,
    description: result.description,
    category: result.category,
    price: result.estimated_price,
  };
}
```
Example: “Toyota Corolla 2017 Clean”, category “Vehicles > Cars”, estimated price 190000 EGP.

8. **AI Translation Engine**
```js
export async function translate(text, lang) {
  return aiTranslate(text, lang);
}
```
Automatic ad translations per user language.

9. **AI Fraud Detection**
```js
function detectFraud(ad) {
  if (ad.price < marketPrice * 0.4) return "suspicious";
}
```
Checks: fake prices, duplicate images, scam keywords, stolen listings.

10. **AI Recommendation Engine**
```js
function recommend(user) {
  if (user.views.includes("cars")) return "vehicles";
}
```
Personalized feed per interests.

11. **AI Auto Fix Errors System**
```ts
// lib/aiFix.ts
import fs from "fs";
export async function aiFixErrors(file) {
  const code = fs.readFileSync(file, "utf8");
  const response = await aiModel({ task: "fix code errors", input: code });
  fs.writeFileSync(file, response.fixedCode);
  return "fixed";
}
```

12. **Automatic Code Monitor**
```js
import chokidar from "chokidar";
import { aiFixErrors } from "./aiFix";
const watcher = chokidar.watch("./");
watcher.on("change", (file) => aiFixErrors(file));
```
Workflow: detect bug → send to AI → AI rewrites → save.

13. **AI Marketplace Automation**
- Listing optimization (titles), price suggestions, semantic search, fraud blocking—running continuously.

14. **Deployment**
- Setup: `npx create-next-app xtox && cd xtox && npm install tailwindcss`
- Deploy: `vercel deploy` or AWS; use CDN for media.

15. **Security**
- JWT login, captcha, email verification, rate limiting, AI fraud detection.

16. **AI Auto-Moderation System**
- Pipeline: submit ad → AI content scan → AI image analysis → fraud detection → publish/block.
- Checks: illegal items, fake prices, scam keywords, duplicate photos, spam, adult content, weapons/restricted items.
```js
export async function moderateAd(ad) {
  const textResult = await aiTextModeration(ad.description);
  const imageResult = await aiImageScan(ad.images);
  if (textResult.flagged || imageResult.flagged) return { status: "blocked" };
  return { status: "approved" };
}
import imageHash from "image-hash";
function checkDuplicate(image) {
  const hash = imageHash(image);
  return database.hashExists(hash);
}
```

17. **Global Server Architecture**
- Multi-region stack: CDN → Load Balancer → API Servers (Next.js) → Microservices (AI, moderation, pricing, recommendation) → PostgreSQL cluster → Object storage.
- Regions: US, Europe, Middle East, Asia, Africa.
- Country marketplace query: `SELECT * FROM ads WHERE country = 'Egypt';`
- Media stored in buckets by country (e.g., `/media/ads/egypt`, `/uae`, `/usa`).

18. **Android + iOS Apps**
- React Native recommended; one codebase for both platforms.
- Structure: `OLEXX-mobile/screens` (Home, Search, Sell, Messages, Profile), `components` (AdCard, UploadMedia), `services` (api, auth).
```jsx
import React from "react";
import { View, Text, Image } from "react-native";
export default function AdCard({ ad }) {
  return (
    <View>
      <Image source={{ uri: ad.image }} />
      <Text>{ad.title}</Text>
      <Text>{ad.price}</Text>
    </View>
  );
}
```
- Media upload via `expo-image-picker`; push notifications for messages, price drops, featured ads.

19. **Automatic Revenue System**
- Streams: Featured Ads, Top Search Placement, Store Accounts, Display Ads, Premium Seller Plans.
- Featured flag: `is_featured = true`; query: `SELECT * FROM ads ORDER BY is_featured DESC;`
- Store pages: `/store/<slug>` with badge, analytics, unlimited ads, priority ranking.
- AI dynamic promotion pricing:
```js
function promotionPrice(category) {
  if (category === "vehicles") return 5;
  return 2;
}
```
- Seller dashboard metrics: views, clicks, messages, conversion, revenue.

20. **AI Smart Search**
- Natural language → structured intent (category, location, price range).
```js
export function aiSearch(query) {
  return aiModel({ intent: query });
}
```

21. **AI Recommendation Engine (feeds)**
- Personalized feed logic (e.g., users who view cars get vehicle ads).
```js
function recommendAds(user) {
  if (user.views.includes("cars")) return "vehicle_ads";
}
```

22. **Platform Security**
- Protections: captcha, email + phone verification, rate limiting, AI fraud detection.
```js
if (loginAttempts > 5) {
  blockIP();
}
```

23. **Auto System Maintenance AI**
- Monitors overload, bugs, slow queries; can restart services.
```js
setInterval(() => {
  checkServerHealth();
}, 30000);
```

**Final Result**
- AI moderation, fraud detection, smart search, dynamic pricing, recommendations.
- Web (Next.js) + Android/iOS (React Native).
- Revenue: featured ads, stores, promotions, ads.
- Infra: multi-region servers, CDN, cloud object storage.
