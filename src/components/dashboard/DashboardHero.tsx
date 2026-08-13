export default function DashboardHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">

      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/20 blur-3xl"></div>
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl"></div>

      <div className="relative z-10">

        <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
          🤖 AI Powered Campus Platform
        </span>

        <h1 className="mt-6 text-4xl font-bold leading-tight">
          Find Lost Items
          <br />
          <span className="text-blue-100">
            in Minutes using AI
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-blue-100">
          Upload a picture or describe your lost item.
          Campus Lost AI automatically searches similar items
          reported across Vaagdevi College of Engineering.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">

          <button className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg transition hover:scale-105">
            🔍 Report Lost Item
          </button>

          <button className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20">
            📦 Report Found Item
          </button>

        </div>

      </div>

    </section>
  );
}