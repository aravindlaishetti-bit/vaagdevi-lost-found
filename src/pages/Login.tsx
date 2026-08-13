import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-brand-900 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto h-10 w-10 rounded-lg bg-brand-600 text-white grid place-items-center font-display font-bold mb-3">
            V
          </div>
          <h1 className="font-display font-semibold text-xl">Vaagdevi Lost &amp; Found</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with your college email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">College email</label>
            <input
              type="email"
              required
              placeholder="20951a0501@vaagdevi.edu.in"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          New here?{" "}
          <Link to="/signup" className="text-brand-600 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
