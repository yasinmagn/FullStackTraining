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
app.use("/cart", require("./routes/cart"));
app.use("/orders", require("./routes/orders"));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(process.env.PORT || 3000, () =>
  console.log(`API on http://localhost:${process.env.PORT || 3000}`));
