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
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 text-white grid place-items-center font-display font-bold">
            V
          </div>
          <span className="font-display font-semibold text-slate-900 hidden sm:block">
            Vaagdevi Lost &amp; Found
          </span>
        </Link>

        {profile && (
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link to="/" className="btn-ghost hidden sm:inline-flex">
              Dashboard
            </Link>
            <Link to="/report" className="btn-primary">
              + Report item
            </Link>

            <div className="relative">
              <button
                className="btn-ghost relative"
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

            {profile.role === "admin" && (
              <Link to="/admin" className="btn-ghost hidden sm:inline-flex">
                Admin
              </Link>
            )}

            <button onClick={signOut} className="btn-ghost">
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
