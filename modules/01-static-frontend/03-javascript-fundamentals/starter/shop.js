// SooqOnline data + logic. Complete every TODO, test in the browser console.
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
  { id: 4, name: "Headphones Air",  price: 25,  stock: 0,  category: "accessories" },
  // TODO 1: add 6 more products of your own (at least 3 categories total)
];

// TODO 2: return the product with this id, or null if not found
function findById(products, id) {
}

// TODO 3: return a new array of products in this category
function productsInCategory(products, category) {
}

// TODO 4: return the single cheapest product
function cheapestProduct(products) {
}

// TODO 5: case-insensitive name search — "phone" matches "Smartphone X200"
function searchByName(products, text) {
}

// TODO 6: cartItems look like { price, quantity }; return the total (0 for empty cart)
function cartTotal(cartItems) {
}

// Self-tests — uncomment as you finish each TODO:
// console.log(findById(products, 2));               // Laptop Pro 14
// console.log(findById(products, 999));             // null
// console.log(productsInCategory(products, "accessories").length); // >= 2
// console.log(cheapestProduct(products).name);      // cheapest one
// console.log(searchByName(products, "PHONE"));     // case-insensitive!
// console.log(cartTotal([]));                       // 0
// console.log(cartTotal([{price:10,quantity:3}]));  // 30
