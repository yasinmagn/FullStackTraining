// Local sample data so this lesson runs standalone (no API needed) —
// the focus here is state management, not data fetching.
// A plain array of objects. Components import it and .map over it to render cards.
export const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
  { id: 4, name: "Headphones Air",  price: 25,  stock: 0,  category: "audio" },
  { id: 5, name: "Bluetooth Speaker", price: 35, stock: 12, category: "audio" },
  { id: 6, name: "Power Bank 10k",  price: 18,  stock: 15, category: "accessories" },
];
