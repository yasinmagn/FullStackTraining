// Express is a framework that handles routing/requests for us (no manual if-checks
// on req.url like the raw-http lab). cors lets browsers on other origins call this API.
const express = require("express");
const cors = require("cors");
const { products } = require("./data/products");

const app = express();
// app.use registers middleware — functions that run on every request in order.
app.use(cors());
// express.json() reads a JSON request body and fills in req.body for us.
app.use(express.json());

// Logger middleware — runs on every request, then hands off with next()
// Calling next() passes control to the next middleware/route; forgetting it hangs the request.
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// GET /products — list all products, optionally narrowed by query-string filters
// (e.g. /products?category=phones&maxPrice=100).
app.get("/products", (req, res) => {
  let result = products;
  // req.query holds the ?key=value pairs from the URL.
  const { category, maxPrice, search } = req.query;
  if (category) result = result.filter(p => p.category === category);
  // Query values arrive as strings, so convert maxPrice to a number before comparing.
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  // res.json sends the array as JSON and sets the Content-Type header automatically.
  res.json(result);
});

// Stretch: stats — registered BEFORE "/products/:id" so ":id" doesn't catch "stats".
// Express matches routes top-to-bottom; if :id came first, "/products/stats" would be
// read as id="stats".
app.get("/products/stats", (req, res) => {
  const count = products.length;
  // reduce accumulates the total value of all stock (price × stock, summed).
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const outOfStock = products.filter(p => p.stock === 0).length;
  res.json({ count, totalStockValue, outOfStock });
});

// GET /products/:id — :id is a URL parameter, available as req.params.id.
app.get("/products/:id", (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  // 404 Not Found is the standard status when a requested resource doesn't exist.
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// Simple auto-incrementing id for newly created products (fine for an in-memory demo).
let nextId = products.length + 1;

// POST /products — validate name + price, then create
app.post("/products", (req, res) => {
  const { name, price, stock, category } = req.body;
  // Validate input and reject bad data with 400 Bad Request (the client's mistake).
  if (!name) return res.status(400).json({ error: "name is required" });
  if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  // stock ?? 0 uses 0 only when stock wasn't provided (null/undefined).
  const product = { id: nextId++, name, price, stock: stock ?? 0, category };
  products.push(product);
  // 201 Created is the correct status after successfully making a new resource.
  res.status(201).json(product);
});

// PUT /products/:id — merge supplied fields
app.put("/products/:id", (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  // Object.assign copies the fields from req.body onto the existing product, updating it.
  Object.assign(product, req.body);
  res.json(product);
});

// DELETE /products/:id — remove and return 204
app.delete("/products/:id", (req, res) => {
  const i = products.findIndex(p => p.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: "Product not found" });
  // splice removes 1 element at index i from the array.
  products.splice(i, 1);
  // 204 No Content: success, but there's nothing to send back in the body.
  res.status(204).end();
});

// Fallback route (LAST) — any request that matched no route above lands here as a 404.
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(3000, () => console.log("API on http://localhost:3000"));
