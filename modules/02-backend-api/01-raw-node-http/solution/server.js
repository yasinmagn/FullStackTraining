// require() loads a module. "http" is built into Node — no install needed.
const http = require("http");
// Import our product data from a local file (the ./ means "relative to this file").
const { products } = require("./data/products");

// createServer takes a function that runs on EVERY incoming request.
// req = what the client asked for; res = what we send back.
const server = http.createServer((req, res) => {
  // We manually inspect the HTTP method (GET/POST/...) and the URL path to decide
  // what to do. This "routing by hand" is exactly what Express will automate later.

  // GET /products -> 200 + JSON array
  if (req.method === "GET" && req.url === "/products") {
    // writeHead sets the status code (200 = OK) and headers.
    // Content-Type: application/json tells the client the body is JSON.
    res.writeHead(200, { "Content-Type": "application/json" });
    // res.end sends the body and finishes the response. JSON.stringify turns our
    // JavaScript array into a JSON text string (you can only send text over HTTP).
    return res.end(JSON.stringify(products));
  }

  // GET / -> 200 + welcome message
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Welcome to SooqOnline API" }));
  }

  // Stretch: GET /categories -> unique category names (map + Set)
  // map() pulls out each product's category; new Set() removes duplicates; ...spreads
  // the Set back into a plain array.
  if (req.method === "GET" && req.url === "/categories") {
    const categories = [...new Set(products.map(p => p.category))];
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(categories));
  }

  // If none of the routes above matched, respond 404 (Not Found).
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// listen starts the server on port 3000; the callback runs once it's ready.
server.listen(3000, () => console.log("SooqOnline API on http://localhost:3000"));
