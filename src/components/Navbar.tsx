import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Notification } from "../types";

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications((data as Notification[]) ?? []));

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (!profile) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg">
    🎓
  </div>

  <div className="hidden sm:block">
    <h2 className="font-display text-lg font-bold text-slate-900">
      Vaagdevi Lost Found
    </h2>
    <p className="text-xs text-slate-500">
      Vaagdevi College
    </p>
  </div>
</Link>

        {profile && (
          <nav className="flex items-center gap-2">
            <Link to="/" className="btn-ghost hidden sm:inline-flex">
              Dashboard
            </Link>
            <div className="hidden lg:flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 w-72">
  <span className="mr-2 text-slate-400">🔍</span>
  <input
    type="text"
    placeholder="Search lost & found items..."
    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
  />
</div>
            <Link
  to="/report"
  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
>
  + Report Item
</Link>

            <div className="relative">
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
                onClick={() => {
                  setOpen((o) => !o);
                  if (!open) markAllRead();
                }}
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-ember text-[10px] text-white grid place-items-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-80 card p-2 max-h-96 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="p-3 text-sm text-slate-400">No notifications yet.</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setOpen(false);
                        navigate("/");
                      }}
                      className="w-full text-left rounded-lg p-2.5 hover:bg-slate-50 block"
                    >
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.body && (
  <p className="text-xs text-slate-500 mt-0.5">
    {n.body}
  </p>
)}
                    </button>
                  ))}
                </div>
              )}
            </div>

<div className="relative">
  <button
    onClick={() => setProfileOpen((value) => !value)}
    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
  >
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">
      {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
    </div>

    <div className="hidden md:block text-left">
      <p className="text-sm font-semibold text-slate-900">
        {profile.full_name}
      </p>
      <p className="text-xs text-slate-500">
        {profile.college_id}
      </p>
    </div>

    <span className="text-xs text-slate-400">▼</span>
  </button>

  {profileOpen && (
    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      <div className="border-b border-slate-100 px-3 py-3">
        <p className="font-semibold text-slate-900">
          {profile.full_name}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Roll No: {profile.college_id}
        </p>

        <p className="mt-1 break-all text-xs text-slate-500">
          {profile.email}
        </p>
      </div>

      <Link
        to="/profile"
        onClick={() => setProfileOpen(false)}
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        👤
        <span>My Profile</span>
      </Link>

      <button
        onClick={async () => {
          setProfileOpen(false);
          await signOut();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        🚪
        <span>Sign Out</span>
      </button>
    </div>
  )}
</div>

            {profile.role === "admin" && (
              <Link to="/admin" className="btn-ghost hidden sm:inline-flex">
                Admin
              </Link>
            )}
            
          </nav>
        )}
      </div>
    </header>
  );
}
