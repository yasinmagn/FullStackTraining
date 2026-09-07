// SooqOnline data + logic — complete reference.
// An array of product objects. app.js imports these helpers to build the live page.
const products = [
  { id: 1,  name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2,  name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3,  name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
  { id: 4,  name: "Headphones Air",  price: 25,  stock: 0,  category: "accessories" },
  { id: 5,  name: "Phone Case",      price: 5,   stock: 30, category: "accessories" },
  { id: 6,  name: "Smartphone Y10",  price: 85,  stock: 8,  category: "phones" },
  { id: 7,  name: "Laptop Air 13",   price: 380, stock: 4,  category: "computers" },
  { id: 8,  name: "Bluetooth Speaker", price: 35, stock: 12, category: "audio" },
  { id: 9,  name: "Power Bank 10k",  price: 18,  stock: 15, category: "accessories" },
  { id: 10, name: "Earbuds Mini",    price: 15,  stock: 20, category: "audio" },
];

// Return the product with this id, or null if not found.
// .find() returns the first matching element (or undefined); ?? converts that to null.
function findById(products, id) {
  return products.find((p) => p.id === id) ?? null;
}

// Return a new array of products in this category.
// .filter() builds a NEW array of the elements that pass the test; the original is untouched.
function productsInCategory(products, category) {
  return products.filter((p) => p.category === category);
}

// Return the single cheapest product.
// reduce carries "min" (cheapest so far) across the array, keeping the lower-priced one.
function cheapestProduct(products) {
  return products.reduce((min, p) => (p.price < min.price ? p : min));
}

// Case-insensitive name search — "phone" matches "Smartphone X200".
// Lower-casing both sides makes the search ignore capitalization.
function searchByName(products, text) {
  return products.filter((p) =>
    p.name.toLowerCase().includes(text.toLowerCase())
  );
}

// cartItems look like { price, quantity }; return the total (0 for empty cart).
// reduce accumulates a running sum of price × quantity; 0 is the starting/empty value.
function cartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Self-tests:
// console.log(findById(products, 2));               // Laptop Pro 14
// console.log(findById(products, 999));             // null
// console.log(productsInCategory(products, "accessories").length); // >= 2
// console.log(cheapestProduct(products).name);      // "Phone Case"
// console.log(searchByName(products, "PHONE"));     // case-insensitive!
// console.log(cartTotal([]));                       // 0
// console.log(cartTotal([{ price: 10, quantity: 3 }])); // 30
