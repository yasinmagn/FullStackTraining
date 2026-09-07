const express = require("express");
const cors = require("cors");
const { products } = require("./data/products");

const app = express();
app.use(cors());
app.use(express.json());

// TODO 1: logger middleware — print "METHOD URL" for every request, then next()

// DONE for you — read and understand, then test:
app.get("/products", (req, res) => {
  let result = products;
  const { category, maxPrice, search } = req.query;
  if (category) result = result.filter(p => p.category === category);
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json(result);
});

app.get("/products/:id", (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

let nextId = products.length + 1;

// TODO 2: POST /products — validate: name required, price is a positive number
// (else 400 with a clear error). On success push { id: nextId++, ...fields } and
// respond 201 with the created product.

// TODO 3: PUT /products/:id — 404 if not found, else merge req.body fields
// (Object.assign) and return the updated product.

// TODO 4: DELETE /products/:id — 404 if not found, else remove it and respond 204.

// TODO 5: fallback route (must be LAST) — 404 { error: "Route not found" }

app.listen(3000, () => console.log("API on http://localhost:3000"));

// Stretch: GET /products/stats -> { count, totalStockValue, outOfStock }
