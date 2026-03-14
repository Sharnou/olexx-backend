const TAXONOMY = [
  {
    l1: "Vehicles",
    categories: [
      {
        l2: "Cars for Sale",
        attributes: ["Brand", "Model", "Year", "Mileage", "Fuel Type", "Transmission"],
      },
    ],
  },
  {
    l1: "Properties",
    categories: [
      {
        l2: "Apartments for Sale",
        attributes: ["Area", "Bedrooms", "Bathrooms", "Floor Level", "Payment Option"],
      },
    ],
  },
  {
    l1: "Electronics",
    categories: [
      {
        l2: "Mobile Phones",
        attributes: ["Brand", "Storage Capacity", "Color", "Condition", "Battery Health"],
      },
      {
        l2: "Laptops",
        attributes: ["Brand", "Processor", "RAM Size", "Screen Size", "GPU"],
      },
    ],
  },
  {
    l1: "Home & Garden",
    categories: [
      {
        l2: "Furniture",
        attributes: ["Type", "Material", "Condition"],
      },
    ],
  },
];

const KEYWORDS = {
  vehicles: [
    "car",
    "cars",
    "sedan",
    "suv",
    "coupe",
    "hatchback",
    "bmw",
    "mercedes",
    "toyota",
    "honda",
    "hyundai",
    "kia",
    "ford",
    "chevrolet",
    "nissan",
    "tesla",
    "mileage",
    "km",
    "automatic",
    "manual",
    "petrol",
    "diesel",
    "hybrid",
    "electric",
    "model",
    "year",
  ],
  apartments: [
    "apartment",
    "flat",
    "unit",
    "studio",
    "bedroom",
    "bathroom",
    "sqm",
    "m2",
    "meter",
    "area",
    "floor",
    "installment",
    "cash",
    "sale",
  ],
  mobiles: [
    "iphone",
    "samsung",
    "galaxy",
    "xiaomi",
    "redmi",
    "oppo",
    "vivo",
    "huawei",
    "pixel",
    "nokia",
    "oneplus",
    "storage",
    "gb",
    "battery",
    "condition",
    "color",
  ],
  laptops: [
    "laptop",
    "notebook",
    "macbook",
    "dell",
    "hp",
    "lenovo",
    "asus",
    "acer",
    "msi",
    "thinkpad",
    "surface",
    "ram",
    "cpu",
    "processor",
    "i5",
    "i7",
    "ryzen",
    "gpu",
    "nvidia",
    "screen",
    "inch",
  ],
  furniture: [
    "sofa",
    "couch",
    "table",
    "chair",
    "bed",
    "wardrobe",
    "desk",
    "material",
    "wood",
    "metal",
    "leather",
    "fabric",
    "condition",
  ],
};

const BRANDS = {
  cars: ["BMW", "Mercedes", "Toyota", "Honda", "Hyundai", "Kia", "Ford", "Chevrolet", "Nissan", "Tesla"],
  mobiles: ["Apple", "Samsung", "Xiaomi", "OPPO", "Vivo", "Huawei", "Google", "Nokia", "OnePlus"],
  laptops: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI", "Microsoft"],
};

function getDynamicAttributes(path) {
  const [l1, l2] = path;
  for (const group of TAXONOMY) {
    if (group.l1 === l1) {
      for (const cat of group.categories) {
        if (cat.l2 === l2) return cat.attributes.slice();
      }
    }
  }
  return [];
}

function getAllL2() {
  const arr = [];
  for (const group of TAXONOMY) {
    for (const cat of group.categories) {
      arr.push([group.l1, cat.l2]);
    }
  }
  return arr;
}

module.exports = { TAXONOMY, KEYWORDS, BRANDS, getDynamicAttributes, getAllL2 };
