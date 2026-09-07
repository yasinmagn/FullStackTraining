"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { API } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setToken } = useAuth();
  const router = useRouter();

  // TODO 3: handleSubmit — preventDefault; POST `${API}/auth/login` with a JSON body;
  // if !res.ok -> setError("Wrong email or password"); else read { token }, setToken(token),
  // and router.push("/products").
  async function handleSubmit(e) {
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">Login to SooqOnline</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input className="w-full border rounded p-2" type="email" placeholder="Email"
             value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full border rounded p-2" type="password" placeholder="Password"
             value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <button className="w-full bg-emerald-700 text-white rounded p-2">Login</button>
      <p className="text-sm">No account? <Link href="/register" className="text-emerald-700 underline">Register</Link></p>
    </form>
  );
}
