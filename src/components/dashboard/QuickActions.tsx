import { Link } from "react-router-dom";

export default function QuickActions() {
  return (
    <div className="grid gap-5 md:grid-cols-4">

      <Link
        to="/report"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="text-4xl">📦</div>
        <h3 className="mt-4 text-lg font-bold">Report Lost</h3>
        <p className="mt-2 text-sm text-slate-500">
          Lost an item? Report it instantly.
        </p>
      </Link>

      <Link
        to="/report"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="text-4xl">🎒</div>
        <h3 className="mt-4 text-lg font-bold">Report Found</h3>
        <p className="mt-2 text-sm text-slate-500">
          Found something? Help someone.
        </p>
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <div className="text-4xl">🤖</div>
        <h3 className="mt-4 text-lg font-bold">AI Match</h3>
        <p className="mt-2 text-sm text-slate-500">
          AI automatically checks similar items.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <div className="text-4xl">💬</div>
        <h3 className="mt-4 text-lg font-bold">Messages</h3>
        <p className="mt-2 text-sm text-slate-500">
          Chat with item owners securely.
        </p>
      </div>

    </div>
  );
}