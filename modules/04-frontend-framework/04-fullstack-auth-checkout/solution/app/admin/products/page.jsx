"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../components/AuthContext";
import { authedFetch, API } from "../../../lib/api";

const CATEGORIES = [
  { id: 1, name: "phones" },
  { id: 2, name: "computers" },
  { id: 3, name: "accessories" },
  { id: 4, name: "audio" },
];

export default function AdminProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", stock: "", categoryId: "1" });
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

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

  const inputCls = "border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <p className="text-sm text-gray-500">Add new products or remove existing ones.</p>
      </div>

      {message && <p className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">{message}</p>}

      <form onSubmit={createProduct} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 grid grid-cols-2 sm:grid-cols-6 gap-3 items-center">
        <input className={`${inputCls} col-span-2`} placeholder="Name" required
               value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="Price" type="number" step="0.01" min="0.01" required
               value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className={inputCls} placeholder="Stock" type="number" min="0" required
               value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <select className={inputCls} value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id} className="capitalize">{c.name}</option>)}
        </select>
        <button className="bg-emerald-700 text-white rounded-lg p-2 font-medium hover:bg-emerald-800 transition-colors">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl || "/product-images/placeholder.svg"} alt={p.name}
                         className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-500 capitalize">{p.category?.name}</td>
                <td className="px-4 py-2">${p.price}</td>
                <td className="px-4 py-2">
                  <span className={p.stock === 0 ? "text-red-600 font-semibold" : p.stock <= 3 ? "text-amber-600 font-semibold" : ""}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(p.id)} className="text-red-600 hover:text-red-700 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
