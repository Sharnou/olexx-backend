const { runAiClassifier } = require("./classifier");
const { visibilityFromRating } = require("./ranking");
const Search = require("./search");

function test(title) {
  const out = runAiClassifier({ title });
  console.log(JSON.stringify({ title, out }, null, 2));
}

console.log("Classifier tests");
test("iPhone 15 Pro Max 256GB Blue like new 95% battery");
test("BMW 320i 2018 automatic 120k km petrol");
test("Apartment for sale 120 sqm 3 bedrooms 2 bathrooms floor 5 cash");
test("Dell Inspiron laptop i7 16GB RAM 15 inch NVIDIA");
test("Sofa leather brown like new");

console.log("Ranking tests");
console.log(visibilityFromRating(4.7, 12));
console.log(visibilityFromRating(3.8, 10));
console.log(visibilityFromRating(1.8, 6));

console.log("Search tests");
Search.clear();
Search.indexDoc({
  id: "1",
  title: "iPhone 15 Pro Max 256GB Blue like new 95% battery",
  category: { l1: "Electronics", l2: "Mobile Phones" },
  attributes: { Brand: "Apple", Storage: "256 GB", Color: "Blue", Condition: "Like New", Battery: "95%" },
  seller: { rating: 4.9, reviews: 30 },
  price: 45000,
});
Search.indexDoc({
  id: "2",
  title: "BMW 320i 2018 automatic 120k km petrol",
  category: { l1: "Vehicles", l2: "Cars for Sale" },
  attributes: { Brand: "BMW", Model: "320i", Year: 2018, Mileage: 120, Fuel: "Petrol", Transmission: "Automatic" },
  seller: { rating: 4.2, reviews: 8 },
  price: 1200000,
});
Search.indexDoc({
  id: "3",
  title: "Apartment for sale 120 sqm 3 bedrooms 2 bathrooms floor 5 cash",
  category: { l1: "Properties", l2: "Apartments for Sale" },
  attributes: { Area: 120, Bedrooms: 3, Bathrooms: 2, Floor: 5, Payment: "Cash" },
  seller: { rating: 1.9, reviews: 7 },
  price: 4800000,
});
console.log(
  Search.search({
    text: "iphone",
    l1: "Electronics",
    page: 1,
    pageSize: 5,
  })
);
console.log(
  Search.search({
    text: "bmw 320i",
    l1: "Vehicles",
    page: 1,
    pageSize: 5,
  })
);
console.log(
  Search.search({
    l1: "Properties",
    l2: "Apartments for Sale",
    filters: { Bedrooms: { gte: 3 }, Area: { gte: 100, lte: 150 } },
    sort: "newest",
  })
);
