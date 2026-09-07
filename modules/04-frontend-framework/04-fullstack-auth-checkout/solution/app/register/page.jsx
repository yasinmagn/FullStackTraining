"use client";
import { useState } from "react";
import Link from "next/link";
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

  const field = "w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-brand";

  return (
    <div className="max-w-sm mx-auto mt-6 sm:mt-12">
      <div className="bg-white rounded-2xl border border-line shadow-card p-6 sm:p-8">
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="text-sm text-muted mt-1 mb-5">Join SooqOnline in a few seconds.</p>
        {error && <p className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className={field} placeholder="Full name"
                 value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={field} type="email" placeholder="Email"
                 value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={field} type="password" placeholder="Password (min 8 chars)"
                 value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <button className="w-full rounded-lg bg-brand hover:bg-brand-deep text-white font-medium py-2.5 transition-colors">
            Create account
          </button>
        </form>
        <p className="text-sm text-muted mt-4">
          Already have an account? <Link href="/login" className="text-brand font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
