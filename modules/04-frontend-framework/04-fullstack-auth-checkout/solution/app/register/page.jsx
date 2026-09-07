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
