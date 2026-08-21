import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";

export default function DashboardHero() {
  const { profile } = useAuth();

  const firstName =
    profile?.full_name?.trim().split(" ")[0] || "Student";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">

      {/* BACKGROUND DECORATION */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

      {/* CONTENT */}
      <div className="relative z-10 max-w-3xl">

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />

          <span className="text-[11px] font-semibold tracking-wide text-white/90 sm:text-xs">
            VAAGDEVI LOST & FOUND
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Welcome back, {firstName}! 👋
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
          Find what you lost, report what you found, and let AI help connect
          the right items across your campus.
        </p>

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

          <Link
            to="/report"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl"
          >
            Report an Item →
          </Link>

          <Link
            to="/search"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Search Campus Board
          </Link>

        </div>

      </div>

      {/* AI BADGE */}
      <div className="relative z-10 mt-7 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur sm:absolute sm:bottom-6 sm:right-6 sm:mt-0 sm:w-64">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">
          🤖
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-white">
            AI-Powered Matching
          </p>

          <p className="mt-0.5 text-[10px] leading-4 text-blue-100">
            Smart matching helps identify possible lost & found pairs.
          </p>
        </div>

      </div>

    </section>
  );
}