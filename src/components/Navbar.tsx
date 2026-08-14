import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Notification } from "../types";
import VaagdeviLogo from "../assets/VaagdeviLogo.png";

type SearchItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  location: string;
  status: string;
};

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setNotifications((data as Notification[]) ?? []);
      });

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as Notification,
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  useEffect(() => {
  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node;

    if (
      notificationRef.current &&
      !notificationRef.current.contains(target)
    ) {
      setOpen(false);
    }

    if (
      profileRef.current &&
      !profileRef.current.contains(target)
    ) {
      setProfileOpen(false);
    }
  }

  document.addEventListener("mousedown", handleOutsideClick);

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, []);

  /*
   * SEARCH ITEMS
   */
  useEffect(() => {
    const keyword = search.trim();

    if (!keyword) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);

      const safeKeyword = keyword.replace(/[%_]/g, "");

      const { data, error } = await supabase
        .from("items")
        .select("id, title, type, location, status")
        .or(
          `title.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%,category.ilike.%${safeKeyword}%,location.ilike.%${safeKeyword}%`
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("SEARCH ERROR:", error);
        setSearchResults([]);
      } else {
        setSearchResults((data as SearchItem[]) ?? []);
      }

      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function markAllRead() {
    if (!profile) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  }

  function openSearchItem(itemId: string) {
    setSearch("");
    setSearchResults([]);
    navigate(`/items/${itemId}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
            <img
              src={VaagdeviLogo}
              alt="Vaagdevi College Logo"
              className="h-full w-full scale-[1.08] object-cover"
            />
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

            {/* DASHBOARD */}
            <Link
              to="/"
              className="btn-ghost hidden sm:inline-flex"
            >
              Dashboard
            </Link>

            {/* SEARCH */}
            <div className="relative hidden lg:block">

              <div className="flex w-72 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 shrink-0 text-slate-400"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search lost & found..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                {searching && (
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                )}

              </div>

              {/* SEARCH RESULTS */}
              {search.trim() && (
                <div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                  {searching ? (
                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center">

                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">

                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-400"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-4-4" />
                        </svg>

                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-700">
                        No items found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try another item name or location
                      </p>

                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto py-2">

                      <div className="px-4 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Search results
                        </p>
                      </div>

                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            openSearchItem(item.id)
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >

                          {/* ITEM ICON */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              item.type === "lost"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {item.type === "lost" ? (
                              <svg
                                width="19"
                                height="19"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 8v4" />
                                <path d="M12 16h.01" />
                              </svg>
                            ) : (
                              <svg
                                width="19"
                                height="19"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 7h-9l-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                              </svg>
                            )}
                          </div>

                          {/* ITEM INFO */}
                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {item.location}
                            </p>

                          </div>

                          {/* TYPE */}
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                              item.type === "lost"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {item.type === "lost"
                              ? "LOST"
                              : "FOUND"}
                          </span>

                        </button>
                      ))}

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* REPORT */}
            <Link
              to="/report"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              + Report Item
            </Link>

            {/* NOTIFICATIONS */}
<div ref={notificationRef} className="relative">

  <button
    className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
                onClick={() => {
                  setOpen((value) => !value);

                  if (!open) {
                    markAllRead();
                  }
                }}
                aria-label="Notifications"
              >

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-600"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] text-white">
                    {unreadCount}
                  </span>
                )}

              </button>

              {open && (
                <div className="absolute right-0 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">

                  {notifications.length === 0 && (
                    <p className="p-3 text-sm text-slate-400">
                      No notifications yet.
                    </p>
                  )}

                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        setOpen(false);

                        if (notification.link_item_id) {
                          navigate(
                            `/items/${notification.link_item_id}`
                          );
                        } else {
                          navigate("/");
                        }
                      }}
                      className="block w-full rounded-xl p-3 text-left transition hover:bg-slate-50"
                    >

                      <p className="text-sm font-semibold text-slate-800">
                        {notification.title}
                      </p>

                      {notification.body && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {notification.body}
                        </p>
                      )}

                    </button>
                  ))}

                </div>
              )}

            </div>

            {/* PROFILE */}
<div ref={profileRef} className="relative">

  <button
    onClick={() =>
      setProfileOpen((value) => !value)
    }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
              >

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">
                  {profile.full_name
                    ?.charAt(0)
                    ?.toUpperCase() || "U"}
                </div>

                <div className="hidden text-left md:block">

                  <p className="text-sm font-semibold text-slate-900">
                    {profile.full_name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {profile.college_id}
                  </p>

                </div>

                <span className="text-xs text-slate-400">
                  ▼
                </span>

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
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>

                    <span>My Profile</span>
                  </Link>

                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      await signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                      <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
                    </svg>

                    <span>Sign Out</span>

                  </button>

                </div>
              )}

            </div>

            {/* ADMIN */}
            {profile.role === "admin" && (
              <Link
                to="/admin"
                className="btn-ghost hidden sm:inline-flex"
              >
                Admin
              </Link>
            )}

          </nav>
        )}

      </div>
    </header>
  );
}