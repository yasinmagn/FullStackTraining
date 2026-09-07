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

  // TODO 4: handleSubmit — POST `${API}/auth/register` with { name, email, password }.
  // On !res.ok, map EMAIL_TAKEN -> "That email is already registered." and show it.
  // Otherwise auto-login (POST /auth/login), setToken(token), router.push("/products").
  async function handleSubmit(e) {
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
