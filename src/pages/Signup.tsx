import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.toLowerCase().endsWith("@vaagdevi.edu.in")) {
      setError("Please use your official @vaagdevi.edu.in email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, college_id: collegeId, role },
      },
    });
    setLoading(false);

    if (error) {
  console.log("SIGNUP ERROR:", error);
  alert(JSON.stringify(error, null, 2));
  setError(error.message);
  return;
}
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-brand-900 px-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <h1 className="font-display font-semibold text-lg mb-2">Check your inbox</h1>
          <p className="text-sm text-slate-600 mb-4">
            Your account has been created successfully. An admin will verify your college membership before you can access the platform.
          </p>
          <Link to="/login" className="btn-primary inline-flex">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-brand-900 px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display font-semibold text-xl mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">Only @vaagdevi.edu.in addresses can register.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">College ID (roll no. / employee ID)</label>
            <input required className="input" value={collegeId} onChange={(e) => setCollegeId(e.target.value)} />
          </div>
          <div>
            <label className="label">I am a</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as "student" | "faculty")}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
          <div>
            <label className="label">College email</label>
            <input
              type="email"
              required
              placeholder="you@vaagdevi.edu.in"
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
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
