// The product service owns the in-memory data and all the rules for reading/changing it.
const { products } = require("../data/products");
let nextId = products.length + 1;

// Destructure the filters from the query object (default {} so calling with no args is safe).
exports.list = ({ category, maxPrice, search } = {}) => {
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return result;
};
exports.getById = (id) => products.find(p => p.id === id) ?? null;
exports.create = ({ name, price, stock, category }) => {
  // Validate here in the service so the data can never be saved in a bad state,
  // no matter which controller or route calls create().
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
