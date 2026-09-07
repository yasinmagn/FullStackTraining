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
app.use((req, res, next) => { req.userId = Number(req.headers["x-user-id"] || 1); next(); });

app.use("/products", require("./routes/products"));
// app.use("/cart", requireAuth, require("./routes/cart"));
// app.use("/orders", requireAuth, require("./routes/orders"));
app.use("/cart", require("./routes/cart"));
app.use("/orders", require("./routes/orders"));

// TODO 6: inside routes/products.js protect POST/PUT/DELETE with requireAuth + requireAdmin
// (GET routes stay public — anyone can browse a shop).

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.listen(process.env.PORT || 3000, () => console.log("API running"));
