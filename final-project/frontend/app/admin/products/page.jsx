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
