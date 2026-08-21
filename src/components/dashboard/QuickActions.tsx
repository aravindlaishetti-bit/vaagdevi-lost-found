import { Link } from "react-router-dom";

export default function QuickActions() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Quick actions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Get things done quickly from your campus dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {/* REPORT LOST */}
        <Link
          to="/report?type=lost"
          className="group rounded-2xl border border-red-100 bg-red-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:bg-red-100 hover:shadow-md"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105">
              🔴
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Report Lost
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Lost something?
              </p>
            </div>

          </div>
        </Link>

        {/* REPORT FOUND */}
        <Link
          to="/report?type=found"
          className="group rounded-2xl border border-emerald-100 bg-emerald-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-100 hover:shadow-md"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105">
              🟢
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Report Found
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Found something?
              </p>
            </div>

          </div>
        </Link>

        {/* SEARCH */}
        <Link
          to="/search"
          className="group rounded-2xl border border-blue-100 bg-blue-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-100 hover:shadow-md"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105">
              🔎
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Search Items
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Browse campus reports.
              </p>
            </div>

          </div>
        </Link>

        {/* MY REPORTS */}
        <Link
          to="/dashboard?filter=mine"
          className="group rounded-2xl border border-violet-100 bg-violet-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-100 hover:shadow-md"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105">
              📋
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                My Reports
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                View your submissions.
              </p>
            </div>

          </div>
        </Link>

      </div>
    </section>
  );
}