const http = require("http");
const { products } = require("./data/products");

const server = http.createServer((req, res) => {
  // GET /products -> 200 + JSON array
  if (req.method === "GET" && req.url === "/products") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(products));
  }

  // GET / -> 200 + welcome message
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Welcome to SooqOnline API" }));
  }

  // Stretch: GET /categories -> unique category names (map + Set)
  if (req.method === "GET" && req.url === "/categories") {
    const categories = [...new Set(products.map(p => p.category))];
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(categories));
  }

  // anything else -> 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000, () => console.log("SooqOnline API on http://localhost:3000"));
