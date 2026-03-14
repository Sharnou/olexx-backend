const { TAXONOMY, KEYWORDS, BRANDS, getDynamicAttributes } = require("./taxonomy");

function normalizeText(s) {
  return (s || "").toString().toLowerCase();
}

function numberFromText(re, text) {
  const m = text.match(re);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (isNaN(n)) return undefined;
  return n;
}

function scoreCategory(text, imageLabels) {
  const t = normalizeText(text);
  const scores = [];
  const addScore = (path, keys) => {
    let s = 0;
    for (const k of keys) if (t.includes(k)) s += 1;
    if (imageLabels && Array.isArray(imageLabels)) {
      const il = imageLabels.map((x) => normalizeText(x));
      for (const k of keys) {
        for (const lbl of il) if (lbl.includes(k)) s += 2;
      }
    }
    scores.push({ path, s });
  };
  addScore(["Vehicles", "Cars for Sale"], KEYWORDS.vehicles);
  addScore(["Properties", "Apartments for Sale"], KEYWORDS.apartments);
  addScore(["Electronics", "Mobile Phones"], KEYWORDS.mobiles);
  addScore(["Electronics", "Laptops"], KEYWORDS.laptops);
  addScore(["Home & Garden", "Furniture"], KEYWORDS.furniture);
  scores.sort((a, b) => b.s - a.s);
  return scores[0];
}

function extractBrandModel(text, domain) {
  const t = normalizeText(text);
  const brands = (BRANDS[domain] || []).map((b) => ({ label: b, v: b.toLowerCase() }));
  for (const b of brands) {
    if (t.includes(b.v.toLowerCase())) {
      const tokens = text.split(/\s+/);
      const bi = tokens.findIndex((x) => normalizeText(x).includes(b.v.toLowerCase()));
      const model = tokens.slice(bi + 1, bi + 4).join(" ").trim();
      return { brand: b.label, model: model || undefined };
    }
  }
  if (domain === "mobiles") {
    if (t.includes("iphone")) {
      const m = text.match(/iphone\s+([0-9]{1,2}\s*(pro|pro max|max)?)/i);
      return { brand: "Apple", model: m ? `iPhone ${m[1].replace(/\s+/g, " ").trim()}` : "iPhone" };
    }
  }
  return {};
}

function extractVehicleAttributes(text) {
  const t = normalizeText(text);
  const year = numberFromText(/(20[0-9]{2}|19[8-9][0-9])/, t);
  const mileage = numberFromText(/([0-9]{2,3})k?\s*(km|kilometers)/, t) || numberFromText(/([0-9]{4,6})\s*km/, t);
  let fuel;
  if (t.includes("diesel")) fuel = "Diesel";
  else if (t.includes("petrol") || t.includes("gasoline")) fuel = "Petrol";
  else if (t.includes("hybrid")) fuel = "Hybrid";
  else if (t.includes("electric")) fuel = "Electric";
  let transmission;
  if (t.includes("automatic")) transmission = "Automatic";
  else if (t.includes("manual")) transmission = "Manual";
  const { brand, model } = extractBrandModel(text, "cars");
  return { Brand: brand, Model: model, Year: year, Mileage: mileage, Fuel: fuel, Transmission: transmission };
}

function extractApartmentAttributes(text) {
  const t = normalizeText(text);
  const area = numberFromText(/([0-9]{2,4})\s*(sqm|m2|meter)/, t);
  const bedrooms = numberFromText(/([0-9])\s*bed(room)?/i, text);
  const bathrooms = numberFromText(/([0-9])\s*bath(room)?/i, text);
  const floor = numberFromText(/floor\s*([0-9]{1,2})/i, text);
  let payment;
  if (t.includes("installment") || t.includes("installments")) payment = "Installments";
  else if (t.includes("cash")) payment = "Cash";
  return { Area: area, Bedrooms: bedrooms, Bathrooms: bathrooms, Floor: floor, Payment: payment };
}

function extractMobileAttributes(text) {
  const t = normalizeText(text);
  const { brand, model } = extractBrandModel(text, "mobiles");
  const storage = numberFromText(/([0-9]{2,3})\s*gb/, t);
  let color;
  if (t.includes("black")) color = "Black";
  else if (t.includes("white")) color = "White";
  else if (t.includes("blue")) color = "Blue";
  else if (t.includes("red")) color = "Red";
  let condition;
  if (t.includes("new")) condition = "New";
  else if (t.includes("like new")) condition = "Like New";
  else if (t.includes("used")) condition = "Used";
  let battery;
  const b = numberFromText(/([0-9]{2,3})%\s*battery/, t);
  if (b) battery = `${b}%`;
  return { Brand: brand, Model: model, Storage: storage ? `${storage} GB` : undefined, Color: color, Condition: condition, Battery: battery };
}

function extractLaptopAttributes(text) {
  const { brand, model } = extractBrandModel(text, "laptops");
  const t = normalizeText(text);
  const ram = numberFromText(/([0-9]{1,2})\s*gb\s*ram/, t) || numberFromText(/ram\s*([0-9]{1,2})\s*gb/, t);
  let cpu;
  if (t.includes("i3")) cpu = "Intel i3";
  else if (t.includes("i5")) cpu = "Intel i5";
  else if (t.includes("i7")) cpu = "Intel i7";
  else if (t.includes("ryzen 5")) cpu = "Ryzen 5";
  else if (t.includes("ryzen 7")) cpu = "Ryzen 7";
  const screen = numberFromText(/([0-9]{2})\.?[0-9]?\s*inch/, t);
  let gpu;
  if (t.includes("rtx")) gpu = "NVIDIA RTX";
  else if (t.includes("gtx")) gpu = "NVIDIA GTX";
  else if (t.includes("integrated")) gpu = "Integrated";
  return { Brand: brand, Model: model, RAM: ram ? `${ram} GB` : undefined, Processor: cpu, Screen: screen ? `${screen} inch` : undefined, GPU: gpu };
}

function extractFurnitureAttributes(text) {
  const t = normalizeText(text);
  let type;
  if (t.includes("sofa") || t.includes("couch")) type = "Sofa";
  else if (t.includes("table")) type = "Table";
  else if (t.includes("chair")) type = "Chair";
  else if (t.includes("bed")) type = "Bed";
  let material;
  if (t.includes("wood")) material = "Wood";
  else if (t.includes("metal")) material = "Metal";
  else if (t.includes("leather")) material = "Leather";
  else if (t.includes("fabric")) material = "Fabric";
  let condition;
  if (t.includes("new")) condition = "New";
  else if (t.includes("like new")) condition = "Like New";
  else if (t.includes("used")) condition = "Used";
  return { Type: type, Material: material, Condition: condition };
}

function buildSeo(title, path, attrs) {
  const tags = [];
  if (path && path.length) tags.push(...path);
  for (const k of Object.keys(attrs || {})) {
    const v = attrs[k];
    if (v) tags.push(v.toString());
  }
  const uniq = Array.from(new Set(tags.filter(Boolean).map((x) => x.toString().toLowerCase())));
  const description = `OLEXX listing: ${title}. ${uniq.slice(0, 8).join(", ")}`;
  return { tags: uniq, description };
}

function runAiClassifier(input) {
  const text = [input.title || "", input.description || ""].filter(Boolean).join(" ").trim();
  const best = scoreCategory(text, input.imageLabels || null);
  let path = best && best.s > 0 ? best.path : undefined;
  let attributes = {};
  if (path) {
    const key = path.join("::");
    if (key === "Vehicles::Cars for Sale") attributes = extractVehicleAttributes(text);
    else if (key === "Properties::Apartments for Sale") attributes = extractApartmentAttributes(text);
    else if (key === "Electronics::Mobile Phones") attributes = extractMobileAttributes(text);
    else if (key === "Electronics::Laptops") attributes = extractLaptopAttributes(text);
    else if (key === "Home & Garden::Furniture") attributes = extractFurnitureAttributes(text);
  }
  const attrsList = path ? getDynamicAttributes(path) : [];
  const mapped = {};
  for (const a of attrsList) {
    if (/brand/i.test(a)) mapped[a] = attributes.Brand || attributes.brand || undefined;
    else if (/model/i.test(a)) mapped[a] = attributes.Model || attributes.model || undefined;
    else if (/year/i.test(a)) mapped[a] = attributes.Year || attributes.year || undefined;
    else if (/mileage/i.test(a)) mapped[a] = attributes.Mileage || attributes.mileage || undefined;
    else if (/fuel/i.test(a)) mapped[a] = attributes.Fuel || attributes.fuel || undefined;
    else if (/transmission/i.test(a)) mapped[a] = attributes.Transmission || attributes.transmission || undefined;
    else if (/area/i.test(a)) mapped[a] = attributes.Area || attributes.area || undefined;
    else if (/bedrooms?/i.test(a)) mapped[a] = attributes.Bedrooms || attributes.bedrooms || undefined;
    else if (/bathrooms?/i.test(a)) mapped[a] = attributes.Bathrooms || attributes.bathrooms || undefined;
    else if (/floor/i.test(a)) mapped[a] = attributes.Floor || attributes.floor || undefined;
    else if (/payment/i.test(a)) mapped[a] = attributes.Payment || attributes.payment || undefined;
    else if (/storage/i.test(a)) mapped[a] = attributes.Storage || attributes.storage || undefined;
    else if (/battery/i.test(a)) mapped[a] = attributes.Battery || attributes.battery || undefined;
    else if (/ram/i.test(a)) mapped[a] = attributes.RAM || attributes.ram || undefined;
    else if (/processor|cpu/i.test(a)) mapped[a] = attributes.Processor || attributes.cpu || undefined;
    else if (/screen/i.test(a)) mapped[a] = attributes.Screen || attributes.screen || undefined;
    else if (/gpu/i.test(a)) mapped[a] = attributes.GPU || attributes.gpu || undefined;
    else if (/type/i.test(a)) mapped[a] = attributes.Type || attributes.type || undefined;
    else if (/material/i.test(a)) mapped[a] = attributes.Material || attributes.material || undefined;
    else if (/color/i.test(a)) mapped[a] = attributes.Color || attributes.color || undefined;
    else if (/condition/i.test(a)) mapped[a] = attributes.Condition || attributes.condition || undefined;
  }
  const seo = buildSeo(input.title || "", path || [], mapped);
  return {
    category: path ? { l1: path[0], l2: path[1] } : null,
    attributes: mapped,
    seo,
  };
}

module.exports = { runAiClassifier };
