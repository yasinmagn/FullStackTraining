# SooqOnline Lab Progression Guide
## Starter Code for Every Lab Session — Backend & Frontend
### Fullstack BYOD Training Program · Somaliland Youth Cohort

**Facilitated by Yasin Magan — CEO, Koobsame.io**

---

## How This Guide Works

Every lab session has a starter folder: it contains the **official solution of the previous lab plus numbered TODO tasks** for this session. If your own code broke last week, start from this week's starter and keep moving — nobody gets left behind. Complete the TODOs in order, run the verification checks in each session brief, then commit and push to GitHub.

The final section documents the complete reference solution (backend + frontend) that all labs build toward.

---


# PHASE 1 — Static Shop (HTML · CSS · JavaScript)


## Lab 1 — HTML Skeleton

**Session brief:** Tasks: complete every TODO in index.html, then create products.html with 8 product cards and link it in the nav. Verify: open index.html in a browser; nav links work; page has header/main/footer; every image has alt text.

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SooqOnline — Shop Online</title>
</head>
<body>
  <header>
    <h1>SooqOnline</h1>
    <nav>
      <a href="index.html">Home</a>
      <!-- TODO 1: add nav links for Products, Cart (0), Login -->
    </nav>
  </header>

  <main>
    <section>
      <h2>Featured Products</h2>
      <article class="product-card">
        <img src="images/phone.jpg" alt="Smartphone X200" />
        <h3>Smartphone X200</h3>
        <p class="price">$120</p>
        <button>Add to Cart</button>
      </article>
      <!-- TODO 2: add 3 more product cards (your own products & prices) -->
    </section>
  </main>

  <!-- TODO 3: add a footer with your name and the year -->
  <!-- TODO 4: create products.html with 8 cards and link it from the nav -->
</body>
</html>
```


---


## Lab 2 — CSS Styling

**Session brief:** Starter = Lab 1 solution. Tasks: complete every TODO in styles.css. Verify: navbar uses Flexbox; catalog uses Grid; at 375px width there is NO horizontal scroll and the grid is 1 column.

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SooqOnline — Shop Online</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>SooqOnline</h1>
    <nav>
      <a href="index.html">Home</a>
      <a href="products.html">Products</a>
      <a href="#">Cart (0)</a>
      <a href="#">Login</a>
    </nav>
  </header>
  <main>
    <section>
      <h2>Featured Products</h2>
      <div class="product-grid">
        <article class="product-card"><h3>Smartphone X200</h3><p class="price">$120</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>Laptop Pro 14</h3><p class="price">$450</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>USB-C Charger</h3><p class="price">$8</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>Headphones Air</h3><p class="price">$25</p><button>Add to Cart</button></article>
      </div>
    </section>
  </main>
  <footer><p>© 2026 SooqOnline · Hargeisa, Somaliland</p></footer>
</body>
</html>
```

#### `styles.css`

```css
:root {
  --brand: #0f6b4f;
  --dark: #1a2332;
  --light: #f5f7f9;
}
* { box-sizing: border-box; margin: 0; }
body { font-family: Arial, sans-serif; color: var(--dark); background: var(--light); }

/* TODO 1: make header a flex row: space-between, centered items, brand background, white text */
header { padding: 12px 24px; }

/* TODO 2: nav = flex with 16px gap; links white, no underline */
nav { }

/* TODO 3: .product-grid = 4-column grid, 20px gap, 24px padding */
.product-grid { }

/* TODO 4: .product-card = white bg, 8px radius, 16px padding, subtle shadow */
.product-card { }
.price { color: var(--brand); font-weight: bold; font-size: 1.2rem; }

/* TODO 5: button = brand bg, white text, no border, 10px 16px padding, 6px radius,
   full width, pointer cursor, hover opacity */
button { }

/* TODO 6: media queries — 2 columns under 900px; 1 column + stacked header under 500px */
```


---


## Lab 3 — JavaScript Fundamentals

**Session brief:** Starter = Lab 2 solution (styles.css complete). Tasks: complete shop.js. Verify: open index.html, DevTools console — run the self-tests at the bottom of shop.js; edge cases return null / 0.

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SooqOnline — Shop Online</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>SooqOnline</h1>
    <nav>
      <a href="index.html">Home</a>
      <a href="products.html">Products</a>
      <a href="#">Cart (0)</a>
      <a href="#">Login</a>
    </nav>
  </header>
  <main>
    <section>
      <h2>Featured Products</h2>
      <div class="product-grid">
        <article class="product-card"><h3>Smartphone X200</h3><p class="price">$120</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>Laptop Pro 14</h3><p class="price">$450</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>USB-C Charger</h3><p class="price">$8</p><button>Add to Cart</button></article>
        <article class="product-card"><h3>Headphones Air</h3><p class="price">$25</p><button>Add to Cart</button></article>
      </div>
    </section>
  </main>
  <footer><p>© 2026 SooqOnline · Hargeisa, Somaliland</p></footer>
  <script src="shop.js"></script>
</body>
</html>
```

#### `shop.js`

```javascript
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
```

#### `styles.css`

```css
:root { --brand: #0f6b4f; --dark: #1a2332; --light: #f5f7f9; }
* { box-sizing: border-box; margin: 0; }
body { font-family: Arial, sans-serif; color: var(--dark); background: var(--light); }
header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: var(--brand); color: white; }
nav { display: flex; gap: 16px; }
nav a { color: white; text-decoration: none; }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px; }
.product-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.price { color: var(--brand); font-weight: bold; font-size: 1.2rem; }
button { background: var(--brand); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; width: 100%; }
button:hover { opacity: 0.9; }
button:disabled { background: #9aa5ad; cursor: not-allowed; }
@media (max-width: 900px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .product-grid { grid-template-columns: 1fr; } header { flex-direction: column; gap: 8px; } }
```


---


## Lab 4 — DOM & Events (Milestone 1)

**Session brief:** Starter = Lab 3 solution. Tasks: complete app.js — render from data, live search, category filters, working cart. Verify: no hardcoded product cards; search filters as you type; cart count + total update; out-of-stock buttons disabled. Git: do the work on a feature branch, merge to main, push.

#### `app.js`

```javascript
const grid = document.getElementById("product-grid");
const cart = [];

// TODO 1: renderProducts(list) — clear the grid, then for each product append an
// <article class="product-card"> with name, price, and an Add to Cart button
// carrying data-id. Disable the button + label "Out of stock" when stock === 0.
function renderProducts(list) {
}
renderProducts(products);

// TODO 2: click handler on the grid — when a BUTTON is clicked, find the product
// by its data-id, add to cart (quantity +1 if already there), then renderCart().
grid.addEventListener("click", (event) => {
});

// TODO 3: renderCart() — update #cart-count, rebuild #cart-list (one <li> per item
// with name, qty, and a Remove button), set #cart-total via cartTotal (reduce!).
function renderCart() {
}

// TODO 4: live search — on input in #search, renderProducts filtered by name
// (case-insensitive). Use .filter — no for loops.
document.getElementById("search").addEventListener("input", (e) => {
});

// TODO 5: category buttons — build one button per unique category (map + Set),
// clicking filters the grid; "All" shows everything.
```

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SooqOnline — Shop Online</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>SooqOnline</h1>
    <nav>
      <a href="index.html">Home</a>
      <a href="#cart-section">Cart (<span id="cart-count">0</span>)</a>
    </nav>
  </header>
  <main>
    <section class="controls">
      <input id="search" type="text" placeholder="Search products..." />
      <div id="category-buttons"><button class="cat" data-cat="all">All</button></div>
    </section>
    <div id="product-grid" class="product-grid"></div>
    <section id="cart-section">
      <h2>Your Cart</h2>
      <ul id="cart-list"></ul>
      <p>Total: $<span id="cart-total">0</span></p>
    </section>
  </main>
  <footer><p>© 2026 SooqOnline</p></footer>
  <script src="shop.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

#### `shop.js`

```javascript
// Lab 3 solution (replace the data with YOUR 10 products)
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
  { id: 4, name: "Headphones Air",  price: 25,  stock: 0,  category: "accessories" },
  { id: 5, name: "Phone Case",      price: 5,   stock: 30, category: "accessories" },
  { id: 6, name: "Smartphone Y10",  price: 85,  stock: 8,  category: "phones" },
];
const findById = (list, id) => list.find(p => p.id === id) ?? null;
const cartTotal = (items) => items.reduce((s, i) => s + i.price * i.quantity, 0);
```

#### `styles.css`

```css
:root { --brand: #0f6b4f; --dark: #1a2332; --light: #f5f7f9; }
* { box-sizing: border-box; margin: 0; }
body { font-family: Arial, sans-serif; color: var(--dark); background: var(--light); }
header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: var(--brand); color: white; }
nav { display: flex; gap: 16px; }
nav a { color: white; text-decoration: none; }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px; }
.product-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.price { color: var(--brand); font-weight: bold; font-size: 1.2rem; }
button { background: var(--brand); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; width: 100%; }
button:hover { opacity: 0.9; }
button:disabled { background: #9aa5ad; cursor: not-allowed; }
@media (max-width: 900px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .product-grid { grid-template-columns: 1fr; } header { flex-direction: column; gap: 8px; } }
.controls { padding: 16px 24px; display: flex; gap: 12px; flex-wrap: wrap; }
#search { padding: 10px; border: 1px solid #ccc; border-radius: 6px; flex: 1; min-width: 200px; }
.cat { width: auto; }
#cart-section { padding: 24px; }
```


---


# PHASE 2 — Backend API (Node.js · Express)


## Lab 5 — Raw Node HTTP Server

**Session brief:** New project (this becomes sooqonline-api). Run: npm run dev — then open http://localhost:3000/products Tasks: TODOs in server.js and data/products.js. Verify: /products returns your JSON array; / returns a welcome JSON; anything else returns 404 JSON.

#### `data/products.js`

```javascript
// TODO 1: paste YOUR 10 products from Lab 3/4 here
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
];
module.exports = { products };
```

#### `package.json`

```json
{
  "name": "sooqonline-api",
  "version": "1.0.0",
  "scripts": { "dev": "node --watch server.js" }
}
```

#### `server.js`

```javascript
const http = require("http");
const { products } = require("./data/products");

const server = http.createServer((req, res) => {
  // TODO 2: GET /products -> 200 + JSON array (Content-Type: application/json)
  // TODO 3: GET /          -> 200 + { message: "Welcome to SooqOnline API" }
  // TODO 4: anything else  -> 404 + { error: "Not found" }
});

server.listen(3000, () => console.log("SooqOnline API on http://localhost:3000"));

// Stretch (homework): GET /categories -> unique category names (map + Set)
```


---


## Lab 6 — Express CRUD

**Session brief:** Starter = Lab 5 solution, converted to Express (GET routes done as reference). Setup: npm install   Run: npm run dev Tasks: TODOs in server.js (POST/PUT/DELETE + validation + logger middleware). Verify in Thunder Client: all 5 endpoints; missing name -> 400; unknown id -> 404; created -> 201; deleted -> 204.

#### `data/products.js`

```javascript
// TODO 1: paste YOUR 10 products from Lab 3/4 here
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
];
module.exports = { products };
```

#### `package.json`

```json
{
  "name": "sooqonline-api",
  "version": "1.0.0",
  "scripts": { "dev": "node --watch server.js" },
  "dependencies": { "express": "^4.19.0", "cors": "^2.8.5" }
}
```

#### `server.js`

```javascript
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
```


---


## Lab 7 — Layered Structure, Cart & Orders

**Session brief:** Starter = Lab 6 solution, refactored into routes/controllers/services (products layer done as the pattern to copy). Setup: npm install; create .env from .env.example.  Run: npm run dev Tasks: build the cart and orders layers following the products pattern. Fake auth for now: read user id from the x-user-id header. Verify flow in Thunder Client: POST /cart/items x2 -> PUT quantity -> POST /orders -> GET /orders shows it and stock decreased. Empty-cart checkout -> 400.

#### `controllers/products.js`

```javascript
const service = require("../services/products");

exports.list = (req, res) => res.json(service.list(req.query));
exports.getOne = (req, res) => {
  const p = service.getById(Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.create = (req, res) => {
  try { res.status(201).json(service.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = (req, res) => {
  const p = service.update(Number(req.params.id), req.body);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.remove = (req, res) => {
  if (!service.remove(Number(req.params.id))) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
};
```

#### `data/products.js`

```javascript
// TODO 1: paste YOUR 10 products from Lab 3/4 here
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
];
module.exports = { products };
```

#### `package.json`

```json
{
  "name": "sooqonline-api",
  "version": "1.0.0",
  "scripts": { "dev": "node --watch server.js" },
  "dependencies": { "express": "^4.19.0", "cors": "^2.8.5", "dotenv": "^16.4.0" }
}
```

#### `routes/cart.js`

```javascript
// TODO (part of TODO 1): build like routes/products.js
// GET    /            -> my cart
// POST   /items       -> add { productId, quantity }
// PUT    /items/:productId  -> set quantity
// DELETE /items/:productId  -> remove
module.exports = require("express").Router();
```

#### `routes/orders.js`

```javascript
// TODO (part of TODO 1): POST / (checkout) · GET / (my orders) · GET /:id
module.exports = require("express").Router();
```

#### `routes/products.js`

```javascript
const router = require("express").Router();
const ctrl = require("../controllers/products");
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
module.exports = router;
```

#### `server.js`

```javascript
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

// Temporary "auth": trust the x-user-id header (replaced by JWT in Lab 8)
app.use((req, res, next) => { req.userId = Number(req.headers["x-user-id"] || 1); next(); });

app.use("/products", require("./routes/products"));
// TODO 1: mount ./routes/cart at /cart and ./routes/orders at /orders

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(process.env.PORT || 3000, () =>
  console.log(`API on http://localhost:${process.env.PORT || 3000}`));
```

#### `services/cart.js`

```javascript
// In-memory carts: { [userId]: [ { productId, quantity } ] }
const productService = require("./products");
const carts = {};

// TODO 2: getCart(userId) -> the user's items array (empty array if none)

// TODO 3: addItem(userId, productId, quantity)
//   - product must exist            -> throw Error("PRODUCT_NOT_FOUND")
//   - product.stock >= quantity     -> else throw Error("INSUFFICIENT_STOCK")
//   - if item exists, increase quantity; else push a new item. Return the cart.

// TODO 4: setQuantity(userId, productId, quantity) — quantity 0 removes the item

// TODO 5: clear(userId)

module.exports = { carts /*, getCart, addItem, setQuantity, clear */ };
```

#### `services/orders.js`

```javascript
const productService = require("./products");
const cartService = require("./cart");
const orders = [];

// TODO 6: checkout(userId)
//   - cart empty -> throw Error("CART_EMPTY")
//   - build items: { productId, name, unitPrice: current price, quantity }
//     re-checking stock for each (throw INSUFFICIENT_STOCK if not enough)
//   - decrement stock only AFTER all checks pass
//   - create { id, userId, items, total (reduce), createdAt, status: "pending" }
//   - push to orders, clear the cart, return the order

// TODO 7: listByUser(userId), getById(userId, orderId) (null if not this user's)

module.exports = { orders /*, checkout, listByUser, getById */ };
```

#### `services/products.js`

```javascript
const { products } = require("../data/products");
let nextId = products.length + 1;

exports.list = ({ category, maxPrice, search } = {}) => {
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return result;
};
exports.getById = (id) => products.find(p => p.id === id) ?? null;
exports.create = ({ name, price, stock, category }) => {
  if (!name) throw new Error("name is required");
  if (typeof price !== "number" || price <= 0) throw new Error("price must be a positive number");
  const product = { id: nextId++, name, price, stock: stock ?? 0, category };
  products.push(product);
  return product;
};
exports.update = (id, fields) => {
  const p = exports.getById(id);
  if (!p) return null;
  Object.assign(p, fields);
  return p;
};
exports.remove = (id) => {
  const i = products.findIndex(p => p.id === id);
  if (i === -1) return false;
  products.splice(i, 1);
  return true;
};
```


---


## Lab 8 — Auth & JWT (Milestone 2)

**Session brief:** Starter = Lab 7 solution (cart/orders working via x-user-id header). Setup: npm install; copy .env.example to .env and set YOUR OWN long random JWT_SECRET. Tasks: complete services/auth.js and middleware/auth.js; replace the x-user-id hack; protect admin product routes. Verify: register -> login -> token works on /cart and /orders; no token -> 401; customer token on POST /products -> 403; wrong password -> same message as wrong email.

#### `BRING-FROM-LAB7.txt`

```
note: bring YOUR solved cart/orders routes+controllers+services from Lab 7 into this folder
```

#### `controllers/products.js`

```javascript
const service = require("../services/products");

exports.list = (req, res) => res.json(service.list(req.query));
exports.getOne = (req, res) => {
  const p = service.getById(Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.create = (req, res) => {
  try { res.status(201).json(service.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = (req, res) => {
  const p = service.update(Number(req.params.id), req.body);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
};
exports.remove = (req, res) => {
  if (!service.remove(Number(req.params.id))) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
};
```

#### `data/products.js`

```javascript
// TODO 1: paste YOUR 10 products from Lab 3/4 here
const products = [
  { id: 1, name: "Smartphone X200", price: 120, stock: 5,  category: "phones" },
  { id: 2, name: "Laptop Pro 14",   price: 450, stock: 2,  category: "computers" },
  { id: 3, name: "USB-C Charger",   price: 8,   stock: 40, category: "accessories" },
];
module.exports = { products };
```

#### `middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");

// TODO 3: requireAuth — read "Authorization: Bearer <token>" header.
//   Missing -> 401 { error: "Login required" }.
//   jwt.verify with JWT_SECRET; put the payload on req.user; call next().
//   Invalid/expired -> 401 { error: "Invalid or expired token" }.
function requireAuth(req, res, next) {
}

// TODO 4: requireAdmin — assume requireAuth ran first.
//   req.user.role !== "admin" -> 403 { error: "Admins only" }.
function requireAdmin(req, res, next) {
}

module.exports = { requireAuth, requireAdmin };
```

#### `package.json`

```json
{
  "name": "sooqonline-api",
  "version": "1.0.0",
  "scripts": { "dev": "node --watch server.js" },
  "dependencies": {
    "express": "^4.19.0", "cors": "^2.8.5", "dotenv": "^16.4.0",
    "bcryptjs": "^2.4.3", "jsonwebtoken": "^9.0.2"
  }
}
```

#### `routes/auth.js`

```javascript
const router = require("express").Router();
const auth = require("../services/auth");

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    res.status(201).json(await auth.register(name, email, password));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ token: await auth.login(email, password) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

module.exports = router;
```

#### `routes/products.js`

```javascript
const router = require("express").Router();
const ctrl = require("../controllers/products");
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
module.exports = router;
```

#### `server.js`

```javascript
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth, requireAdmin } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

app.use("/auth", require("./routes/auth"));

// TODO 5: DELETE the old x-user-id middleware from Lab 7 everywhere.
// Protect /cart and /orders with requireAuth (controllers read req.user.userId now).
app.use("/products", require("./routes/products"));
// app.use("/cart", requireAuth, require("./routes/cart"));
// app.use("/orders", requireAuth, require("./routes/orders"));

// TODO 6: inside routes/products.js protect POST/PUT/DELETE with requireAuth + requireAdmin
// (GET routes stay public — anyone can browse a shop).

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.listen(process.env.PORT || 3000, () => console.log("API running"));
```

#### `services/auth.js`

```javascript
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = []; // { id, name, email, passwordHash, role }

// Seed one admin at startup so the class can test roles immediately
(async () => {
  users.push({
    id: 1, name: "Admin", email: "admin@sooqonline.local",
    passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
  });
})();

// TODO 1: register(name, email, password)
//   - email must contain "@"          -> throw Error("INVALID_EMAIL")
//   - password.length >= 8            -> throw Error("WEAK_PASSWORD")
//   - email not already used          -> throw Error("EMAIL_TAKEN")
//   - hash with bcrypt (10 rounds), role "customer"
//   - return { id, name, email } — NEVER the hash

// TODO 2: login(email, password)
//   - find user; bcrypt.compare
//   - wrong email OR wrong password -> throw Error("INVALID_CREDENTIALS") (same msg!)
//   - return jwt.sign({ userId, role, name }, process.env.JWT_SECRET, { expiresIn: "2h" })

module.exports = { users /*, register, login */ };
```

#### `services/products.js`

```javascript
const { products } = require("../data/products");
let nextId = products.length + 1;

exports.list = ({ category, maxPrice, search } = {}) => {
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return result;
};
exports.getById = (id) => products.find(p => p.id === id) ?? null;
exports.create = ({ name, price, stock, category }) => {
  if (!name) throw new Error("name is required");
  if (typeof price !== "number" || price <= 0) throw new Error("price must be a positive number");
  const product = { id: nextId++, name, price, stock: stock ?? 0, category };
  products.push(product);
  return product;
};
exports.update = (id, fields) => {
  const p = exports.getById(id);
  if (!p) return null;
  Object.assign(p, fields);
  return p;
};
exports.remove = (id) => {
  const i = products.findIndex(p => p.id === id);
  if (i === -1) return false;
  products.splice(i, 1);
  return true;
};
```


---


# PHASE 3 — Database (PostgreSQL · Prisma)


## Lab 9 — SQL Basics

**Session brief:** Run: psql -U postgres -f setup.sql   then work through queries.sql (psql -d sooqonline). Tasks: complete the TODOs in setup.sql (users table) and queries.sql. Verify: 20 products inserted; each query returns sensible results; constraint-breaking inserts FAIL (that is success!).

#### `queries.sql`

```sql
-- Complete each TODO. Test each one in psql before moving on.

-- TODO 3: the 5 cheapest products (name, price)

-- TODO 4: all out-of-stock products

-- TODO 5: products between $10 and $100, sorted by price ascending

-- TODO 6: count of products per category_id (GROUP BY)

-- TODO 7: case-insensitive search for products with 'phone' in the name (ILIKE)

-- TODO 8 (break things on purpose — paste each ERROR message as a comment):
-- a) insert a product with price -5
-- b) insert a product with category_id 999
-- c) insert two users with the same email (after TODO 1)
```

#### `setup.sql`

```sql
DROP DATABASE IF EXISTS sooqonline;
CREATE DATABASE sooqonline;
\c sooqonline

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id INTEGER REFERENCES categories(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- TODO 1: create table users:
--   id serial pk, name text not null, email text not null UNIQUE,
--   password_hash text not null, role text not null default 'customer',
--   created_at timestamptz default now()

INSERT INTO categories (name) VALUES ('phones'), ('computers'), ('accessories'), ('audio');

INSERT INTO products (name, price, stock, category_id) VALUES
('Smartphone X200', 120, 5, 1), ('Smartphone Y10', 85, 8, 1),
('Laptop Pro 14', 450, 2, 2), ('Laptop Air 13', 380, 4, 2),
('USB-C Charger', 8, 40, 3), ('Phone Case', 5, 30, 3),
('Headphones Air', 25, 0, 4), ('Bluetooth Speaker', 35, 12, 4);
-- TODO 2: insert 12 more products of your own (total 20)
```


---


## Lab 10 — Full Schema, Joins & Dashboard

**Session brief:** Starter = Lab 9 solution (schema.sql includes solved users table). Draw the full schema on paper FIRST — instructor sign-off — then complete the TODOs. Verify: 5 seeded orders with items; every dashboard query returns real numbers; deleting an order also deletes its items (CASCADE).

#### `dashboard.sql`

```sql
-- The shop-owner dashboard. Complete every TODO.

-- Reference example (given): order receipt for order 1
SELECT o.id AS order_id, u.name AS customer, p.name AS product,
       oi.quantity, oi.unit_price, oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN users u        ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
WHERE o.id = 1;

-- TODO 4: top 5 best-selling products (name, total units sold)

-- TODO 5: total revenue of all non-cancelled orders

-- TODO 6: revenue per category (category name, revenue) — 3 joins!

-- TODO 7: each customer's total spending, highest first

-- TODO 8: orders containing more than 2 items (GROUP BY + HAVING)
```

#### `schema.sql`

```sql
\c sooqonline

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- TODO 1: create table orders:
--   id serial pk; user_id int not null references users(id);
--   status text not null default 'pending'
--     CHECK (status IN ('pending','paid','shipped','delivered','cancelled'));
--   total numeric(10,2) not null default 0; created_at timestamptz default now()

-- TODO 2: create table order_items:
--   id serial pk; order_id int not null references orders(id) ON DELETE CASCADE;
--   product_id int not null references products(id);
--   quantity int not null CHECK (quantity > 0);
--   unit_price numeric(10,2) not null

-- TODO 3: seed 3 users, then 5 orders with 2-4 order_items each (hand-written INSERTs —
-- yes really: writing the foreign keys by hand is how the relationships click).
```


---


## Lab 11 — Prisma + Postgres (Milestone 3)

**Session brief:** Starter = your Lab 8 API + this Prisma scaffold. Copy prisma/ + these notes into your API repo. Setup: npm install prisma @prisma/client; set DATABASE_URL in .env; npx prisma migrate dev --name init; node prisma/seed.js Tasks: complete schema.prisma TODOs, seed.js TODO, then port services to Prisma (products first with raw pg to feel the layer — see README steps — then Prisma everywhere). Make checkout a transaction. Verify: server restart keeps data; stock=1 + checkout qty 2 -> clean 400, stock unchanged; prisma studio shows your orders.

#### `checkout-transaction-reference.js`

```javascript
// Reference pattern for TODO in services/orders.js — adapt, don't paste blindly.
// The key line: updateMany with { stock: { gte: quantity } } is an ATOMIC
// check-and-decrement. If it updated 0 rows, someone else bought it first.
async function checkout(prisma, userId, cartItems) {
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];
    for (const { productId, quantity } of cartItems) {
      const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data:  { stock: { decrement: quantity } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");
      const product = await tx.product.findUnique({ where: { id: productId } });
      total += Number(product.price) * quantity;
      itemsData.push({ productId, quantity, unitPrice: product.price });
    }
    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: true },
    });
  });
}
module.exports = { checkout };
```

#### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Product {
  id         Int         @id @default(autoincrement())
  name       String
  price      Decimal     @db.Decimal(10, 2)
  stock      Int         @default(0)
  category   Category    @relation(fields: [categoryId], references: [id])
  categoryId Int
  orderItems OrderItem[]
  cartItems  CartItem[]
  createdAt  DateTime    @default(now())
}

// TODO 1: model User — id, name, email @unique, passwordHash, role (default "customer"),
// createdAt; relations: orders Order[], cartItems CartItem[]

// TODO 2: model CartItem — id, user relation, product relation, quantity;
// add @@unique([userId, productId]) so a user has max one row per product

// TODO 3: model Order — id, user relation, status (default "pending"),
// total Decimal @db.Decimal(10,2), items OrderItem[], createdAt

model OrderItem {
  id        Int     @id @default(autoincrement())
  // TODO 4: order relation (onDelete: Cascade), product relation,
  // quantity Int, unitPrice Decimal @db.Decimal(10, 2)
  product   Product @relation(fields: [productId], references: [id])
  productId Int
}
```

#### `prisma/seed.js`

```javascript
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const cats = ["phones", "computers", "accessories", "audio"];
  for (const name of cats) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });

  // TODO 5: seed your 20 products (look up category ids first with findUnique)
}

main().finally(() => prisma.$disconnect());
```


---


# PHASE 4 — Frontend (React · Next.js)


## Lab 12 — React Shop

**Session brief:** New repo (sooqonline-web). Setup: npm install   Run: npm run dev (API from Lab 11 must be running on :3000). Tasks: TODOs in src/App.jsx and src/components/. Port your Phase 1 CSS into src/index.css (started for you). Verify: products load from YOUR API; search refetches with ?search=; cart add/remove/quantity works; loading + error states show.

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SooqOnline</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

#### `package.json`

```json
{
  "name": "sooqonline-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.3.0", "react-dom": "^18.3.0" },
  "devDependencies": { "@vitejs/plugin-react": "^4.3.0", "vite": "^5.4.0" }
}
```

#### `src/App.jsx`

```jsx
import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";

const API = "http://localhost:3000";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // TODO 2: useEffect depending on [search] — fetch `${API}/products?search=${search}`,
  // setProducts + setLoading(false). On fetch failure setError("API not reachable — is your server running?").
  useEffect(() => {
  }, [search]);

  // TODO 3: addToCart(product) — REPLACE state, never mutate:
  // if already in cart, map to quantity+1; else spread in { ...product, quantity: 1 }.
  function addToCart(product) {
  }

  // TODO 4: removeFromCart(id) with .filter
  function removeFromCart(id) {
  }

  // TODO 5: total via reduce
  const total = 0;

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: 16, background: "var(--brand)", color: "white" }}>
        <h1>SooqOnline</h1>
        <span>Cart: {cart.length} items — ${total}</span>
      </header>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Search products..." style={{ margin: 16, padding: 10 }} />

      {error && <p style={{ color: "red", padding: 16 }}>{error}</p>}
      {loading ? <p style={{ padding: 16 }}>Loading…</p> : (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
        </div>
      )}

      <section style={{ padding: 24 }}>
        <h2>Your Cart</h2>
        {/* TODO 6: list cart items with name, quantity, and a Remove button */}
      </section>
    </div>
  );
}

// Stretch: category filter buttons that refetch with ?category=...
```

#### `src/components/ProductCard.jsx`

```jsx
// TODO 1: receive { product, onAdd } as props.
// Render an <article class="product-card"> with name, price,
// and a button that calls onAdd(product); disabled + "Out of stock" when stock === 0.
export default function ProductCard({ product, onAdd }) {
  return null;
}
```

#### `src/index.css`

```css
/* Port the rest of your Phase 1 styles here */
:root { --brand: #0f6b4f; --dark: #1a2332; --light: #f5f7f9; }
* { box-sizing: border-box; margin: 0; }
body { font-family: Arial, sans-serif; color: var(--dark); background: var(--light); }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px; }
@media (max-width: 900px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .product-grid { grid-template-columns: 1fr; } }
```

#### `src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

#### `vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
```


---


## Lab 13 — Next.js Shop

**Session brief:** Recommended: run `npx create-next-app@latest sooqonline-next` (App Router: yes, Tailwind: yes, TypeScript: no), then copy this folder's app/ and components/ files over the generated ones. Complete the TODOs. Run with API on :3000: npm run dev -- -p 3001 Verify: /products is server-rendered (products visible in page source!); /products/[id] works; cart survives navigation; loading.jsx shows on slow network (DevTools throttling).

#### `app/cart/page.jsx`

```jsx
"use client";
import { useCart } from "../../components/CartContext";

// TODO 4: render cart items (name, unit price, quantity with +/- buttons, remove),
// and the total. Empty cart -> friendly message + Link to /products.
export default function CartPage() {
  const { items } = useCart();
  return <h1 className="text-xl font-bold">Cart ({items.length}) — TODO</h1>;
}
```

#### `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `app/layout.jsx`

```jsx
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import CartBadge from "../components/CartBadge";

export const metadata = { title: "SooqOnline" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <CartProvider>
          <header className="flex justify-between items-center px-6 py-3 bg-emerald-700 text-white">
            <Link href="/" className="text-xl font-bold">SooqOnline</Link>
            <nav className="flex gap-4 items-center">
              <Link href="/products">Products</Link>
              <CartBadge />
              {/* Lab 14 adds Login / user greeting here */}
            </nav>
          </header>
          <main className="max-w-5xl mx-auto p-6">{children}</main>
          <footer className="text-center text-sm text-gray-500 py-6">© 2026 SooqOnline</footer>
        </CartProvider>
      </body>
    </html>
  );
}
```

#### `app/page.jsx`

```jsx
// TODO 1: home page — a hero section (shop name + tagline + Link to /products)
// and a "Featured" strip: server-fetch /products and show the first 4.
export default async function HomePage() {
  return <h1 className="text-2xl font-bold">TODO: build the home page</h1>;
}
```

#### `app/products/[id]/page.jsx`

```jsx
// TODO 3: fetch `http://localhost:3000/products/${params.id}` (cache: "no-store").
// If !res.ok render "Product not found." Otherwise show name, price, stock status,
// and <AddToCartButton product={p} />.
export default async function ProductDetail({ params }) {
  return <p>TODO: product {params.id}</p>;
}
```

#### `app/products/error.jsx`

```jsx
"use client";
export default function Error() {
  return <p className="text-red-600">Could not load products — is the API running on :3000?</p>;
}
```

#### `app/products/loading.jsx`

```jsx
export default function Loading() {
  return <p className="animate-pulse">Loading products…</p>;
}
```

#### `app/products/page.jsx`

```jsx
// SERVER component — no "use client", no useEffect. This is the Next.js way.
import AddToCartButton from "../../components/AddToCartButton";

export default async function ProductsPage() {
  const res = await fetch("http://localhost:3000/products", { cache: "no-store" });
  const products = await res.json();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md">
          <a href={`/products/${p.id}`} className="font-semibold">{p.name}</a>
          <p className="text-emerald-700 font-bold">${p.price}</p>
          <AddToCartButton product={p} />
        </div>
      ))}
    </div>
  );
}
// TODO 2: add a client <SearchBox /> component above the grid that navigates to
// /products?search=... (useRouter) and read searchParams here to pass ?search to the API.
```

#### `components/AddToCartButton.jsx`

```jsx
"use client";
import { useCart } from "./CartContext";

export default function AddToCartButton({ product }) {
  const { addItem } = useCart();
  const out = product.stock === 0;
  return (
    <button onClick={() => addItem(product)} disabled={out}
            className="mt-2 bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md w-full">
      {out ? "Out of stock" : "Add to Cart"}
    </button>
  );
}
```

#### `components/CartBadge.jsx`

```jsx
"use client";
import Link from "next/link";
import { useCart } from "./CartContext";

export default function CartBadge() {
  const { items } = useCart();
  return <Link href="/cart">Cart ({items.length})</Link>;
}
```

#### `components/CartContext.jsx`

```jsx
"use client";
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // TODO 5: addItem(product) — same immutable logic as Lab 12
  function addItem(product) {
  }
  // TODO 6: removeItem(id) and setQuantity(id, quantity) (0 removes)
  function removeItem(id) {}
  function setQuantity(id, quantity) {}

  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```


---


## Lab 14 — Fullstack Auth & Checkout (Milestone 4)

**Session brief:** Starter = Lab 13 solution + these auth scaffolds. Copy components/ and app/ additions into your Next.js app. Tasks: complete AuthContext, login/register pages, checkout with real orders, My Orders page, admin products page. Verify the full story: browse -> register -> login (navbar greets you) -> add to cart -> checkout -> stock decreases in DB -> order in "My Orders" -> admin page blocked for customers (server 403, UI hides it too).

#### `app/checkout-page.jsx`

```jsx
// Place as app/checkout/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../components/CartContext";
import { useAuth } from "../components/AuthContext";
import { authedFetch } from "../components/authedFetch";

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");

  // TODO 5: guard — if no token, router.push("/login") (useEffect)

  // TODO 6: placeOrder() — POST /orders with
  // { items: items.map(({id, quantity}) => ({ productId: id, quantity })) } via authedFetch.
  // ok -> clear() + router.push(`/orders`); error -> show the API's error message
  // (INSUFFICIENT_STOCK must display nicely: "Sorry, not enough stock for one of your items").
  async function placeOrder() {
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Checkout</h1>
      {/* order summary: items + total */}
      {message && <p className="text-red-600">{message}</p>}
      <button onClick={placeOrder} className="w-full bg-emerald-700 text-white rounded p-2">
        Place order — ${total}
      </button>
    </div>
  );
}
// TODO 7: app/orders/page.jsx — GET /orders (authed), list order id, date, status, total.
// TODO 8: app/admin/products/page.jsx — table + create form (admin only). Remember:
// the SERVER is the real guard (403); hiding the page in the UI is just politeness.
```

#### `app/login-page.jsx`

```jsx
// Place as app/login/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setToken } = useAuth();
  const router = useRouter();

  // TODO 3: handleSubmit — preventDefault; POST /auth/login with JSON body;
  // !res.ok -> setError("Wrong email or password"); else setToken(data.token)
  // and router.push("/products").
  async function handleSubmit(e) {
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">Login to SooqOnline</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input className="w-full border rounded p-2" type="email" placeholder="Email"
             value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full border rounded p-2" type="password" placeholder="Password"
             value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <button className="w-full bg-emerald-700 text-white rounded p-2">Login</button>
    </form>
  );
}
// TODO 4: build app/register/page.jsx the same way against POST /auth/register,
// then auto-login (or redirect to /login with a success message).
```

#### `components/AuthContext.jsx`

```jsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Course-level choice: token in localStorage (simple). Know the trade-off:
// production apps often use httpOnly cookies (XSS-safe, needs CSRF care).
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null); // { userId, role, name } from the JWT payload

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  // TODO 1: applyToken(t) — decode the payload (middle part of the JWT, atob + JSON.parse),
  // setUser with it, setTokenState(t), save to localStorage.
  function applyToken(t) {
  }

  // TODO 2: logout() — clear state + localStorage
  function logout() {
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
```

#### `components/authedFetch.js`

```javascript
// Helper for authenticated API calls
export function authedFetch(url, options = {}, token) {
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
}
```


---


# FINAL PROJECT — Complete Reference Solution

This is what every lab builds toward. Instructors: share only after Checkpoint 4.


## Backend — sooqonline-api (Express + Prisma + PostgreSQL + JWT)

**Session brief:** Express + Prisma + PostgreSQL + JWT. Matches the training manual (Weeks 5-11). ## Run 1. cp .env.example .env  (set your DB password + a long JWT_SECRET) 2. npm install 3. npx prisma migrate dev --name init 4. node prisma/seed.js 5. npm run dev Admin login: admin@sooqonline.local / admin1234

### Project structure
```
sooqonline-api/
  package.json  .env.example  .gitignore
  prisma/schema.prisma  prisma/seed.js
  src/server.js  src/db.js
  src/middleware/auth.js
  src/routes/{auth,products,cart,orders}.js
  src/controllers/{products,cart,orders}.js
  src/services/{auth,products,cart,orders}.js
```

#### `package.json`

```json
{
  "name": "sooqonline-api",
  "version": "1.0.0",
  "scripts": { "dev": "node --watch src/server.js", "start": "node src/server.js", "seed": "node prisma/seed.js" },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": { "prisma": "^5.18.0" }
}
```

#### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int        @id @default(autoincrement())
  name         String
  email        String     @unique
  passwordHash String
  role         String     @default("customer")
  orders       Order[]
  cartItems    CartItem[]
  createdAt    DateTime   @default(now())
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Product {
  id         Int         @id @default(autoincrement())
  name       String
  price      Decimal     @db.Decimal(10, 2)
  stock      Int         @default(0)
  category   Category    @relation(fields: [categoryId], references: [id])
  categoryId Int
  orderItems OrderItem[]
  cartItems  CartItem[]
  createdAt  DateTime    @default(now())
}

model CartItem {
  id        Int     @id @default(autoincrement())
  user      User    @relation(fields: [userId], references: [id])
  userId    Int
  product   Product @relation(fields: [productId], references: [id])
  productId Int
  quantity  Int
  @@unique([userId, productId])
}

model Order {
  id        Int         @id @default(autoincrement())
  user      User        @relation(fields: [userId], references: [id])
  userId    Int
  status    String      @default("pending")
  total     Decimal     @db.Decimal(10, 2)
  items     OrderItem[]
  createdAt DateTime    @default(now())
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId   Int
  product   Product @relation(fields: [productId], references: [id])
  productId Int
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
}
```

#### `prisma/seed.js`

```javascript
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const catalog = {
  phones: [["Smartphone X200", 120, 5], ["Smartphone Y10", 85, 8], ["Smartphone Z1", 210, 3], ["Feature Phone F2", 20, 25]],
  computers: [["Laptop Pro 14", 450, 2], ["Laptop Air 13", 380, 4], ["Desktop Tower", 520, 2], ["Monitor 24in", 110, 6]],
  accessories: [["USB-C Charger", 8, 40], ["Phone Case", 5, 30], ["Screen Protector", 3, 50], ["Power Bank 10k", 18, 15], ["USB Cable", 2.5, 60], ["Laptop Bag", 22, 10]],
  audio: [["Headphones Air", 25, 0], ["Bluetooth Speaker", 35, 12], ["Earbuds Mini", 15, 20], ["Microphone USB", 28, 5]],
};

async function main() {
  for (const [catName, products] of Object.entries(catalog)) {
    const category = await prisma.category.upsert({
      where: { name: catName }, update: {}, create: { name: catName },
    });
    for (const [name, price, stock] of products) {
      const exists = await prisma.product.findFirst({ where: { name } });
      if (!exists) await prisma.product.create({ data: { name, price, stock, categoryId: category.id } });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@sooqonline.local" },
    update: {},
    create: {
      name: "Admin", email: "admin@sooqonline.local",
      passwordHash: await bcrypt.hash("admin1234", 10), role: "admin",
    },
  });
  console.log("Seed complete. Admin: admin@sooqonline.local / admin1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

#### `src/controllers/cart.js`

```javascript
const service = require("../services/cart");

const ERRORS = { PRODUCT_NOT_FOUND: 404, INSUFFICIENT_STOCK: 400, INVALID_QUANTITY: 400 };
const fail = (res, e) =>
  res.status(ERRORS[e.message] || 500).json({ error: e.message });

exports.getCart = async (req, res) => {
  res.json(await service.getCart(req.user.userId));
};
exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    res.status(201).json(await service.addItem(req.user.userId, Number(productId), Number(quantity ?? 1)));
  } catch (e) { fail(res, e); }
};
exports.setQuantity = async (req, res) => {
  try {
    res.json(await service.setQuantity(req.user.userId, Number(req.params.productId), Number(req.body.quantity)));
  } catch (e) { fail(res, e); }
};
exports.removeItem = async (req, res) => {
  try {
    await service.setQuantity(req.user.userId, Number(req.params.productId), 0);
    res.status(204).end();
  } catch (e) { fail(res, e); }
};
```

#### `src/controllers/orders.js`

```javascript
const service = require("../services/orders");

exports.checkout = async (req, res) => {
  try {
    // Accept either the server-side cart (default) or an explicit items array
    const order = await service.checkout(req.user.userId, req.body?.items);
    res.status(201).json(order);
  } catch (e) {
    const codes = { CART_EMPTY: 400, INSUFFICIENT_STOCK: 400, PRODUCT_NOT_FOUND: 404 };
    res.status(codes[e.message] || 500).json({ error: e.message });
  }
};
exports.listMine = async (req, res) => {
  res.json(await service.listByUser(req.user.userId));
};
exports.getOne = async (req, res) => {
  const order = await service.getById(req.user.userId, Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
};
```

#### `src/controllers/products.js`

```javascript
const service = require("../services/products");

exports.list = async (req, res, next) => {
  try { res.json(await service.list(req.query)); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const p = await service.getById(Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (e) { next(e); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await service.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const p = await service.update(Number(req.params.id), req.body);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
};
exports.remove = async (req, res, next) => {
  try {
    const ok = await service.remove(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Product not found" });
    res.status(204).end();
  } catch (e) { next(e); }
};
```

#### `src/db.js`

```javascript
const { PrismaClient } = require("@prisma/client");
module.exports = new PrismaClient();
```

#### `src/middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}

module.exports = { requireAuth, requireAdmin };
```

#### `src/routes/auth.js`

```javascript
const router = require("express").Router();
const auth = require("../services/auth");

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    res.status(201).json(await auth.register(name, email, password));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ token: await auth.login(email, password) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

module.exports = router;
```

#### `src/routes/cart.js`

```javascript
const router = require("express").Router();
const ctrl = require("../controllers/cart");

router.get("/", ctrl.getCart);
router.post("/items", ctrl.addItem);
router.put("/items/:productId", ctrl.setQuantity);
router.delete("/items/:productId", ctrl.removeItem);

module.exports = router;
```

#### `src/routes/orders.js`

```javascript
const router = require("express").Router();
const ctrl = require("../controllers/orders");

router.post("/", ctrl.checkout);
router.get("/", ctrl.listMine);
router.get("/:id", ctrl.getOne);

module.exports = router;
```

#### `src/routes/products.js`

```javascript
const router = require("express").Router();
const ctrl = require("../controllers/products");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", requireAuth, requireAdmin, ctrl.create);
router.put("/:id", requireAuth, requireAdmin, ctrl.update);
router.delete("/:id", requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
```

#### `src/server.js`

```javascript
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

app.get("/", (req, res) => res.json({ message: "Welcome to SooqOnline API" }));
app.use("/auth", require("./routes/auth"));
app.use("/products", require("./routes/products"));
app.use("/cart", requireAuth, require("./routes/cart"));
app.use("/orders", requireAuth, require("./routes/orders"));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SooqOnline API on http://localhost:${port}`));
```

#### `src/services/auth.js`

```javascript
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");

async function register(name, email, password) {
  if (!name) throw new Error("name is required");
  if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
  if (!password || password.length < 8) throw new Error("WEAK_PASSWORD");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { id: user.id, name: user.name, email: user.email };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

module.exports = { register, login };
```

#### `src/services/cart.js`

```javascript
const prisma = require("../db");

async function getCart(userId) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
}

async function addItem(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("INVALID_QUANTITY");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  if (product.stock < newQuantity) throw new Error("INSUFFICIENT_STOCK");

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: newQuantity },
    create: { userId, productId, quantity },
  });
  return getCart(userId);
}

async function setQuantity(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");
  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
    return getCart(userId);
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (product.stock < quantity) throw new Error("INSUFFICIENT_STOCK");

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity },
    create: { userId, productId, quantity },
  });
  return getCart(userId);
}

async function clear(userId) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

module.exports = { getCart, addItem, setQuantity, clear };
```

#### `src/services/orders.js`

```javascript
const prisma = require("../db");
const cartService = require("./cart");

async function checkout(userId, explicitItems) {
  // Source of items: explicit body (frontend cart) or the server-side cart
  let items = explicitItems;
  if (!items) {
    const cart = await cartService.getCart(userId);
    items = cart.map(({ productId, quantity }) => ({ productId, quantity }));
  }
  if (!items || items.length === 0) throw new Error("CART_EMPTY");

  const order = await prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];

    for (const { productId, quantity } of items) {
      // Atomic check-and-decrement: only succeeds if stock is still sufficient.
      const updated = await tx.product.updateMany({
        where: { id: Number(productId), stock: { gte: Number(quantity) } },
        data:  { stock: { decrement: Number(quantity) } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT_STOCK");

      const product = await tx.product.findUnique({ where: { id: Number(productId) } });
      total += Number(product.price) * Number(quantity);
      itemsData.push({ productId: product.id, quantity: Number(quantity), unitPrice: product.price });
    }

    return tx.order.create({
      data: { userId, total, items: { create: itemsData } },
      include: { items: { include: { product: true } } },
    });
  });

  await cartService.clear(userId);
  return order;
}

async function listByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getById(userId, id) {
  return prisma.order.findFirst({
    where: { id, userId },
    include: { items: { include: { product: true } } },
  });
}

module.exports = { checkout, listByUser, getById };
```

#### `src/services/products.js`

```javascript
const prisma = require("../db");

async function list({ category, maxPrice, search } = {}) {
  return prisma.product.findMany({
    where: {
      ...(category && { category: { name: category } }),
      ...(maxPrice && { price: { lte: Number(maxPrice) } }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    },
    include: { category: true },
    orderBy: { id: "asc" },
  });
}

async function getById(id) {
  return prisma.product.findUnique({ where: { id }, include: { category: true } });
}

async function create({ name, price, stock, categoryId }) {
  if (!name) throw new Error("name is required");
  if (typeof price !== "number" || price <= 0) throw new Error("price must be a positive number");
  if (!categoryId) throw new Error("categoryId is required");
  return prisma.product.create({ data: { name, price, stock: stock ?? 0, categoryId } });
}

async function update(id, { name, price, stock, categoryId }) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return null;
  if (price !== undefined && (typeof price !== "number" || price <= 0)) {
    throw new Error("price must be a positive number");
  }
  return prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(stock !== undefined && { stock }),
      ...(categoryId !== undefined && { categoryId }),
    },
  });
}

async function remove(id) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return false;
  await prisma.product.delete({ where: { id } });
  return true;
}

module.exports = { list, getById, create, update, remove };
```


## Frontend — sooqonline-next (Next.js + Tailwind)

**Session brief:** Matches the training manual (Weeks 12-14). Talks to sooqonline-api on :3000. ## Run 1. npm install 2. cp .env.local.example .env.local   (API URL; keep default for local dev) 3. npm run dev   (opens on :3001 so the API keeps :3000) Admin login: admin@sooqonline.local / admin1234

### Project structure
```
sooqonline-next/
  package.json  next.config.js  tailwind.config.js  postcss.config.js  .env.local.example
  lib/api.js
  app/layout.jsx  app/page.jsx  app/globals.css
  app/products/page.jsx  app/products/[id]/page.jsx  app/products/{loading,error}.jsx
  app/cart/page.jsx  app/checkout/page.jsx  app/orders/page.jsx
  app/login/page.jsx  app/register/page.jsx  app/admin/products/page.jsx
  components/{Navbar,AuthContext,CartContext,AddToCartButton,SearchBox}.jsx
```

#### `app/admin/products/page.jsx`

```jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthContext";
import { authedFetch, API } from "../../../lib/api";

export default function AdminProductsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", stock: "", categoryId: "1" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    load();
  }, []);

  async function load() {
    const res = await fetch(`${API}/products`);
    setProducts(await res.json());
  }

  async function createProduct(e) {
    e.preventDefault();
    setMessage("");
    const res = await authedFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
      }),
    }, token);
    if (res.status === 403) { setMessage("Admins only — the server said no."); return; }
    if (!res.ok) { setMessage((await res.json()).error); return; }
    setForm({ name: "", price: "", stock: "", categoryId: "1" });
    load();
  }

  async function remove(id) {
    const res = await authedFetch(`/products/${id}`, { method: "DELETE" }, token);
    if (res.status === 403) { setMessage("Admins only — the server said no."); return; }
    load();
  }

  // UI politeness — the SERVER (403) is the real guard
  if (user && user.role !== "admin") return <p className="text-red-600">Admins only.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin — Products</h1>
      {message && <p className="text-red-600 mb-3">{message}</p>}
      <form onSubmit={createProduct} className="bg-white rounded-lg p-4 shadow mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <input className="border rounded p-2 col-span-2" placeholder="Name" required
               value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded p-2" placeholder="Price" type="number" step="0.01" required
               value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="border rounded p-2" placeholder="Stock" type="number" required
               value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <button className="bg-emerald-700 text-white rounded p-2">Add</button>
      </form>
      <table className="w-full bg-white rounded-lg shadow text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3">{p.name}</td>
              <td className="p-3">${p.price}</td>
              <td className="p-3">{p.stock}</td>
              <td className="p-3 text-right">
                <button onClick={() => remove(p.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### `app/cart/page.jsx`

```jsx
"use client";
import Link from "next/link";
import { useCart } from "../../components/CartContext";

export default function CartPage() {
  const { items, setQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="mb-3">Your cart is empty.</p>
        <Link href="/products" className="text-emerald-700 underline">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="bg-white rounded-lg p-4 shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-gray-500">${i.price} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(i.id, i.quantity - 1)} className="border rounded px-2">−</button>
              <span>{i.quantity}</span>
              <button onClick={() => setQuantity(i.id, i.quantity + 1)} className="border rounded px-2">+</button>
              <button onClick={() => removeItem(i.id)} className="text-red-600 ml-2">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-6">
        <p className="text-xl font-bold">Total: ${total}</p>
        <Link href="/checkout" className="bg-emerald-700 text-white px-5 py-2 rounded-md">Checkout</Link>
      </div>
    </div>
  );
}
```

#### `app/checkout/page.jsx`

```jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../components/CartContext";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

const NICE_ERRORS = {
  INSUFFICIENT_STOCK: "Sorry, not enough stock for one of your items.",
  CART_EMPTY: "Your cart is empty.",
};

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  async function placeOrder() {
    setPlacing(true);
    setMessage("");
    const res = await authedFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
      }),
    }, token);

    if (res.ok) {
      const order = await res.json();
      clear();
      router.push(`/orders?placed=${order.id}`);
    } else {
      const { error } = await res.json();
      setMessage(NICE_ERRORS[error] || error || "Something went wrong.");
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <ul className="bg-white rounded-lg p-4 shadow divide-y">
        {items.map((i) => (
          <li key={i.id} className="py-2 flex justify-between">
            <span>{i.name} × {i.quantity}</span>
            <span>${Number(i.price) * i.quantity}</span>
          </li>
        ))}
      </ul>
      {message && <p className="text-red-600">{message}</p>}
      <button onClick={placeOrder} disabled={placing || items.length === 0}
              className="w-full bg-emerald-700 disabled:bg-gray-400 text-white rounded-md p-3 font-semibold">
        {placing ? "Placing order…" : `Place order — $${total}`}
      </button>
    </div>
  );
}
```

#### `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `app/layout.jsx`

```jsx
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import { AuthProvider } from "../components/AuthContext";
import Navbar from "../components/Navbar";

export const metadata = { title: "SooqOnline", description: "Shop online in Somaliland" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="max-w-5xl w-full mx-auto p-6 flex-1">{children}</main>
            <footer className="text-center text-sm text-gray-500 py-6">
              © 2026 SooqOnline · Hargeisa, Somaliland
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### `app/login/page.jsx`

```jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { API } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setToken } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) { setError("Wrong email or password"); return; }
    const { token } = await res.json();
    setToken(token);
    router.push("/products");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">Login to SooqOnline</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input className="w-full border rounded p-2" type="email" placeholder="Email"
             value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full border rounded p-2" type="password" placeholder="Password"
             value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <button className="w-full bg-emerald-700 text-white rounded p-2">Login</button>
      <p className="text-sm">No account? <Link href="/register" className="text-emerald-700 underline">Register</Link></p>
    </form>
  );
}
```

#### `app/orders/page.jsx`

```jsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

export default function OrdersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const placed = params.get("placed");
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) { router.push("/login"); return; }
    authedFetch("/orders", {}, saved)
      .then((res) => res.ok ? res.json() : [])
      .then(setOrders);
  }, [token, router]);

  if (!orders) return <p className="animate-pulse">Loading your orders…</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {placed && <p className="bg-green-100 text-green-800 rounded p-3 mb-4">Order #{placed} placed successfully!</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex justify-between">
              <span className="font-semibold">Order #{o.id}</span>
              <span className="capitalize text-sm bg-gray-100 rounded px-2 py-1">{o.status}</span>
            </div>
            <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
            <ul className="text-sm mt-2">
              {o.items.map((i) => (
                <li key={i.id}>{i.product?.name} × {i.quantity} — ${Number(i.unitPrice) * i.quantity}</li>
              ))}
            </ul>
            <p className="font-bold mt-2">Total: ${o.total}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### `app/page.jsx`

```jsx
import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import { API } from "../lib/api";

export default async function HomePage() {
  let featured = [];
  try {
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    featured = (await res.json()).slice(0, 4);
  } catch { /* API down — hero still renders */ }

  return (
    <div>
      <section className="bg-emerald-700 text-white rounded-xl p-10 text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to SooqOnline</h1>
        <p className="mb-4">Quality products, delivered across Somaliland.</p>
        <Link href="/products" className="bg-white text-emerald-700 px-5 py-2 rounded-md font-semibold">
          Browse Products
        </Link>
      </section>
      <h2 className="text-xl font-bold mb-4">Featured</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {featured.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow">
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### `app/products/[id]/page.jsx`

```jsx
import AddToCartButton from "../../../components/AddToCartButton";
import { API } from "../../../lib/api";

export default async function ProductDetail({ params }) {
  const res = await fetch(`${API}/products/${params.id}`, { cache: "no-store" });
  if (!res.ok) return <p>Product not found.</p>;
  const p = await res.json();

  return (
    <div className="max-w-md bg-white rounded-lg p-6 shadow">
      <h1 className="text-2xl font-bold">{p.name}</h1>
      <p className="text-gray-500">{p.category?.name}</p>
      <p className="text-emerald-700 text-2xl font-bold my-2">${p.price}</p>
      <p className={p.stock > 0 ? "text-green-700" : "text-red-600"}>
        {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
      </p>
      <AddToCartButton product={p} />
    </div>
  );
}
```

#### `app/products/error.jsx`

```jsx
"use client";
export default function Error() {
  return <p className="text-red-600">Could not load products — is the API running?</p>;
}
```

#### `app/products/loading.jsx`

```jsx
export default function Loading() {
  return <p className="animate-pulse">Loading products…</p>;
}
```

#### `app/products/page.jsx`

```jsx
import Link from "next/link";
import AddToCartButton from "../../components/AddToCartButton";
import SearchBox from "../../components/SearchBox";
import { API } from "../../lib/api";

export default async function ProductsPage({ searchParams }) {
  const query = new URLSearchParams();
  if (searchParams?.search) query.set("search", searchParams.search);
  if (searchParams?.category) query.set("category", searchParams.category);

  const res = await fetch(`${API}/products?${query}`, { cache: "no-store" });
  const products = await res.json();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <SearchBox />
      {products.length === 0 && <p>No products found.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md">
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            <p className="text-sm text-gray-500">{p.category?.name}</p>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### `app/register/page.jsx`

```jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { API } from "../../lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setToken } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      setError(error === "EMAIL_TAKEN" ? "That email is already registered." : error);
      return;
    }
    // Auto-login after successful registration
    const loginRes = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const { token } = await loginRes.json();
    setToken(token);
    router.push("/products");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">Create your account</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input className="w-full border rounded p-2" placeholder="Full name"
             value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full border rounded p-2" type="email" placeholder="Email"
             value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full border rounded p-2" type="password" placeholder="Password (min 8 chars)"
             value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <button className="w-full bg-emerald-700 text-white rounded p-2">Register</button>
    </form>
  );
}
```

#### `components/AddToCartButton.jsx`

```jsx
"use client";
import { useCart } from "./CartContext";

export default function AddToCartButton({ product }) {
  const { addItem } = useCart();
  const out = product.stock === 0;
  return (
    <button onClick={() => addItem(product)} disabled={out}
            className="mt-2 bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md w-full">
      {out ? "Out of stock" : "Add to Cart"}
    </button>
  );
}
```

#### `components/AuthContext.jsx`

```jsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Course choice: token in localStorage (simple to learn).
// Production apps often prefer httpOnly cookies (XSS-safe, needs CSRF care).
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("token");
    if (saved) applyToken(saved);
  }, []);

  function decode(t) {
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  }

  function applyToken(t) {
    const payload = decode(t);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return logout();
    setUser({ userId: payload.userId, role: payload.role, name: payload.name });
    setTokenState(t);
    localStorage.setItem("token", t);
  }

  function logout() {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
```

#### `components/CartContext.jsx`

```jsx
"use client";
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function addItem(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function setQuantity(id, quantity) {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }

  function clear() { setItems([]); }

  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
```

#### `components/Navbar.jsx`

```jsx
"use client";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

export default function Navbar() {
  const { items } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-emerald-700 text-white">
      <Link href="/" className="text-xl font-bold">SooqOnline</Link>
      <nav className="flex gap-4 items-center text-sm sm:text-base">
        <Link href="/products">Products</Link>
        <Link href="/cart">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</Link>
        {user ? (
          <>
            <Link href="/orders">My Orders</Link>
            {user.role === "admin" && <Link href="/admin/products">Admin</Link>}
            <span className="hidden sm:inline">Hello, {user.name}</span>
            <button onClick={logout} className="underline">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register" className="bg-white text-emerald-700 px-3 py-1 rounded">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
```

#### `components/SearchBox.jsx`

```jsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("search") || "");

  function submit(e) {
    e.preventDefault();
    router.push(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mb-5">
      <input value={value} onChange={(e) => setValue(e.target.value)}
             placeholder="Search products..."
             className="flex-1 border rounded-md p-2" />
      <button className="bg-emerald-700 text-white px-4 rounded-md">Search</button>
    </form>
  );
}
```

#### `lib/api.js`

```javascript
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function authedFetch(path, options = {}, token) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
```

#### `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
module.exports = {};
```

#### `package.json`

```json
{
  "name": "sooqonline-next",
  "version": "1.0.0",
  "private": true,
  "scripts": { "dev": "next dev -p 3001", "build": "next build", "start": "next start -p 3001" },
  "dependencies": { "next": "^14.2.0", "react": "^18.3.0", "react-dom": "^18.3.0" },
  "devDependencies": { "autoprefixer": "^10.4.19", "postcss": "^8.4.38", "tailwindcss": "^3.4.4" }
}
```

#### `postcss.config.js`

```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

#### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
```


---

*SooqOnline Lab Progression Guide — Fullstack BYOD Training Program*
*Facilitated by Yasin Magan, CEO of Koobsame.io*

---

# APPENDIX — UI Screen Documentation (Final Demo Project)

Rendered UI previews of the reference solution, generated from the final project's design and seed data. This is what the guided shop looks like when all 14 labs are complete — use these as the visual target during labs and as the benchmark at Checkpoint 4.

## 1. Home page (`/`)
Hero banner with call-to-action and the four featured products, server-fetched from the API. Built in Labs 13–14.

![Home page](screenshots/01-home.png)

## 2. Product catalog (`/products`)
Server-rendered grid with search; out-of-stock products show a disabled button. The card grid is responsive (4 columns desktop, 1 column phone). Built across Labs 2, 12, 13.

![Product catalog](screenshots/02-products.png)

## 3. Product detail (`/products/[id]`)
Dynamic route fetching one product; stock status in green/red. Built in Lab 13.

![Product detail](screenshots/03-product-detail.png)

## 4. Shopping cart (`/cart`)
Client-side cart state via CartContext: quantity +/− controls, remove, live total (reduce). Built in Labs 12–13.

![Cart](screenshots/04-cart.png)

## 5. Checkout (`/checkout`)
Order summary and Place Order — sends the authenticated POST /orders which runs the transactional, stock-decrementing checkout on the server. Guests are redirected to login. Built in Lab 14 (server logic: Labs 7, 11).

![Checkout](screenshots/05-checkout.png)

## 6. Login (`/login`)
JWT auth flow; wrong credentials show a single generic error on purpose. Built in Labs 8 and 14.

![Login](screenshots/06-login.png)

## 7. My Orders (`/orders`)
Order history from GET /orders with status badges and the post-checkout success banner. Built in Lab 14.

![My Orders](screenshots/07-orders.png)

## 8. Admin — Products (`/admin/products`)
Admin-only product management (create + delete). The navbar shows the Admin link only for the admin role — and the server enforces 403 regardless. Built in Lab 14.

![Admin products](screenshots/08-admin.png)

## 9–10. Mobile views (390px)
The phone test every lab must pass: catalog and cart at mobile width — no horizontal scroll, tappable buttons.

![Catalog mobile](screenshots/09-products-mobile.png)
![Cart mobile](screenshots/10-cart-mobile.png)

---

*Facilitated by Yasin Magan, CEO of Koobsame.io*
