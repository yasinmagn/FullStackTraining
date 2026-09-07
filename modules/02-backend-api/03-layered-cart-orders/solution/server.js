// This app is split into LAYERS to keep code organized as it grows:
//   routes  -> which URL maps to which handler
//   controllers -> read the request, call a service, send the response (HTTP concerns)
//   services -> the actual business logic and data (no knowledge of req/res)
// dotenv loads variables from a .env file into process.env (e.g. PORT).
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

// Temporary "auth": trust the x-user-id header (replaced by JWT in Lab 8)
// Real auth verifies identity; here we just read a header so carts/orders have a user.
app.use((req, res, next) => { req.userId = Number(req.headers["x-user-id"] || 1); next(); });

// Mount each route file under a URL prefix. A request to /cart/items goes to routes/cart.js.
app.use("/products", require("./routes/products"));
app.use("/cart", require("./routes/cart"));
app.use("/orders", require("./routes/orders"));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Prefer a PORT from the environment, falling back to 3000 for local development.
app.listen(process.env.PORT || 3000, () =>
  console.log(`API on http://localhost:${process.env.PORT || 3000}`));
