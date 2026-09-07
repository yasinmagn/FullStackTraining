const express = require("express");
const cors = require("cors");
const { products } = require("./data/products");

const app = express();
app.use(cors());
app.use(express.json());

// Logger middleware — runs on every request, then hands off with next()
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get("/products", (req, res) => {
  let result = products;
  const { category, maxPrice, search } = req.query;
  if (category) result = result.filter(p => p.category === category);
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json(result);
});

// Stretch: stats — registered BEFORE "/products/:id" so ":id" doesn't catch "stats"
app.get("/products/stats", (req, res) => {
  const count = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const outOfStock = products.filter(p => p.stock === 0).length;
  res.json({ count, totalStockValue, outOfStock });
});

app.get("/products/:id", (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

let nextId = products.length + 1;

// POST /products — validate name + price, then create
app.post("/products", (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  const product = { id: nextId++, name, price, stock: stock ?? 0, category };
  products.push(product);
  res.status(201).json(product);
});

// PUT /products/:id — merge supplied fields
app.put("/products/:id", (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  Object.assign(product, req.body);
  res.json(product);
});

// DELETE /products/:id — remove and return 204
app.delete("/products/:id", (req, res) => {
  const i = products.findIndex(p => p.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: "Product not found" });
  products.splice(i, 1);
  res.status(204).end();
});

// Fallback route (LAST) — 404 for anything unmatched
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(3000, () => console.log("API on http://localhost:3000"));
