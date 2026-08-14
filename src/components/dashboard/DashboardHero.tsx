import { useNavigate } from "react-router-dom";

export default function DashboardHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">

      {/* Background Glow */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative z-10">

        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v18" />
            <path d="M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8" />
            <path d="M18.4 5.6L5.6 18.4" />
          </svg>

          AI Powered Campus Platform
        </span>

        {/* Heading */}
        <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
          Find Lost Items
          <br />

          <span className="text-blue-100">
            in Minutes using AI
          </span>
        </h1>

        {/* Description */}
        <p className="mt-5 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
          Upload a picture or describe your lost item.
          Campus Lost AI automatically searches similar items
          reported across Vaagdevi College of Engineering.
        </p>

        {/* ACTION BUTTONS */}
        <div className="mt-8 flex flex-wrap gap-4">

          {/* REPORT LOST */}
          <button
            type="button"
            onClick={() => navigate("/report?type=lost")}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl active:scale-95"
          >

            {/* Search / Lost Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            Report Lost Item

          </button>

          {/* REPORT FOUND */}
          <button
            type="button"
            onClick={() => navigate("/report?type=found")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg active:scale-95"
          >

            {/* Package Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21 8-9-5-9 5 9 5 9-5Z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>

            Report Found Item

          </button>

        </div>

      </div>
    </section>
  );
}