import { useAuth } from "../lib/AuthContext";

export default function Profile() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card p-8 text-center">
          <p className="text-slate-500">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your Vaagdevi Lost Found account details
        </p>
      </div>

      <div className="card overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
              {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-sm text-blue-100">
                {profile.role === "admin"
                  ? "Administrator"
                  : profile.role === "faculty"
                  ? "Faculty"
                  : "Student"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Full Name
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.full_name}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Roll No / College ID
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.college_id}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </p>
            <p className="mt-1 break-all font-semibold text-slate-900">
              {profile.email}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Department
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.department || "Not provided"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Phone
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.phone || "Not provided"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Account Status
            </p>
            <p
              className={`mt-1 font-semibold ${
                profile.is_verified ? "text-green-600" : "text-amber-600"
              }`}
            >
              {profile.is_verified ? "Verified" : "Pending Admin Verification"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}