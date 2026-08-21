import { useAuth } from "../lib/AuthContext";

export default function Profile() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="card p-6 text-center sm:p-8">
          <p className="text-sm text-slate-500">
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  const roleLabel =
    profile.role === "admin"
      ? "Administrator"
      : profile.role === "faculty"
      ? "Faculty"
      : "Student";

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-4 sm:py-8">

      {/* PAGE HEADER */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Your Vaagdevi Lost Found account details
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* PROFILE HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-7 text-white sm:px-6 sm:py-8">

          {/* Background decoration */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-center gap-4">

            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-2xl font-bold shadow-lg backdrop-blur sm:h-20 sm:w-20 sm:text-3xl">
              {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* Name */}
            <div className="min-w-0">

              <h2 className="break-words text-xl font-bold sm:text-2xl">
                {profile.full_name}
              </h2>

              <p className="mt-1 text-sm text-blue-100">
                {roleLabel}
              </p>

              {profile.is_verified && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                  ✓ Verified Account
                </div>
              )}

            </div>

          </div>
        </div>

        {/* PROFILE DETAILS */}
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">

          {/* FULL NAME */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Full Name
            </p>

            <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 sm:text-base">
              {profile.full_name}
            </p>
          </div>

          {/* COLLEGE ID */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Roll No / College ID
            </p>

            <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 sm:text-base">
              {profile.college_id}
            </p>
          </div>

          {/* EMAIL */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Email
            </p>

            <p className="mt-1.5 break-all text-sm font-semibold text-slate-900 sm:text-base">
              {profile.email}
            </p>
          </div>

          {/* DEPARTMENT */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Department
            </p>

            <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 sm:text-base">
              {profile.department || "Not provided"}
            </p>
          </div>

          {/* PHONE */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </p>

            <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 sm:text-base">
              {profile.phone || "Not provided"}
            </p>
          </div>

          {/* ACCOUNT STATUS */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Account Status
            </p>

            <div className="mt-2">

              {profile.is_verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Pending Admin Verification
                </span>
              )}

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-slate-400">
            Vaagdevi Lost & Found • Account Information
          </p>
        </div>

      </div>
    </main>
  );
}