import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Notification } from "../types";
import VaagdeviLogo from "../assets/VaagdeviLogo.png";

import {
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Home,
  ShieldCheck,
  Plus,
  MapPin,
  Package,
  AlertCircle,
  ChevronDown,
  Clock,
  CheckCircle2,
} from "lucide-react";

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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  /*
   * LOAD NOTIFICATIONS
   */
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

  /*
   * CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
   */
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false);
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
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
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

  /*
   * MARK ALL NOTIFICATIONS READ
   */
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

  /*
   * OPEN SEARCH RESULT
   */
  function openSearchItem(itemId: string) {
    setSearch("");
    setSearchResults([]);
    setMobileOpen(false);
    navigate(`/items/${itemId}`);
  }

  /*
   * CLOSE MOBILE MENU
   */
  function closeMobileMenu() {
    setMobileOpen(false);
  }

  /*
   * GET USER INITIAL
   */
  const userInitial =
    profile?.full_name?.charAt(0)?.toUpperCase() || "U";

  /*
   * GUEST NAVBAR
   */
  if (!profile) {
    return (
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link
            to="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
              <img
                src={VaagdeviLogo}
                alt="Vaagdevi College Logo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                Vaagdevi Lost Found
              </h2>

              <p className="hidden text-xs text-slate-500 sm:block">
                Vaagdevi College
              </p>
            </div>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">

        {/* =====================================================
            MAIN NAVBAR
        ====================================================== */}

        <div className="flex h-[68px] items-center justify-between gap-2">

          {/* ===================================================
              LOGO
          =================================================== */}

          <Link
            to="/"
            onClick={closeMobileMenu}
            className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md sm:h-12 sm:w-12">
              <img
                src={VaagdeviLogo}
                alt="Vaagdevi College Logo"
                className="h-full w-full scale-[1.05] object-cover"
              />
            </div>

            <div className="hidden sm:block">
              <h2 className="font-display text-base font-bold leading-tight text-slate-900 md:text-lg">
                Vaagdevi Lost Found
              </h2>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <p className="text-[11px] text-slate-500">
                  Vaagdevi College
                </p>
              </div>
            </div>
          </Link>

          {/* ===================================================
              DESKTOP NAV
          =================================================== */}

          <nav className="hidden items-center gap-1.5 lg:flex">

            {/* DASHBOARD */}

            <Link
              to="/"
              className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              <Home className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />

              <span>Dashboard</span>
            </Link>

            {/* SEARCH */}

            <div className="relative">

              <div className="flex w-64 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 xl:w-72">

                <Search className="mr-2 h-[18px] w-[18px] shrink-0 text-slate-400" />

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
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl xl:w-96">

                  {searching ? (
                    <div className="px-4 py-6 text-center">
                      <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                      <p className="text-sm text-slate-400">
                        Searching...
                      </p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-7 text-center">

                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                        <Search className="h-5 w-5 text-slate-400" />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No items found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try another item name or location
                      </p>

                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto py-2">

                      <div className="flex items-center justify-between px-4 py-2">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Search results
                        </p>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {searchResults.length}
                        </span>

                      </div>

                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            openSearchItem(item.id)
                          }
                          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >

                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                              item.type === "lost"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {item.type === "lost" ? (
                              <AlertCircle className="h-[19px] w-[19px]" />
                            ) : (
                              <Package className="h-[19px] w-[19px]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>

                            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0" />

                              <span className="truncate">
                                {item.location || "Location unavailable"}
                              </span>
                            </div>

                          </div>

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
          </nav>

          {/* ===================================================
              RIGHT SIDE
          =================================================== */}

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">

            {/* REPORT ITEM */}

            <Link
              to="/report"
              className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg sm:inline-flex lg:px-5"
            >
              <Plus className="h-4 w-4" />

              <span>Report Item</span>
            </Link>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <div
              ref={notificationRef}
              className="relative"
            >

              <button
                type="button"
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                  notificationOpen
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-100"
                }`}
                onClick={() => {
                  setNotificationOpen(
                    (value) => !value
                  );

                  if (!notificationOpen) {
                    markAllRead();
                  }
                }}
                aria-label="Notifications"
              >

                <Bell
                  className={`h-5 w-5 ${
                    notificationOpen
                      ? "text-blue-600"
                      : "text-slate-600"
                  }`}
                />

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                )}

              </button>

              {/* NOTIFICATION DROPDOWN */}

              {notificationOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-80">

                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Notifications
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Latest activity
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">
                        {unreadCount} new
                      </span>
                    )}

                  </div>

                  <div className="max-h-96 overflow-y-auto p-2">

                    {notifications.length === 0 && (
                      <div className="px-4 py-8 text-center">

                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                          <Bell className="h-5 w-5 text-slate-400" />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No notifications
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          You're all caught up.
                        </p>

                      </div>
                    )}

                    {notifications.map(
                      (notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => {
                            setNotificationOpen(
                              false
                            );

                            if (
                              notification.link_item_id
                            ) {
                              navigate(
                                `/items/${notification.link_item_id}`
                              );
                            } else {
                              navigate("/");
                            }
                          }}
                          className="group flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"
                        >

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Bell className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="text-sm font-semibold text-slate-800">
                              {notification.title}
                            </p>

                            {notification.body && (
                              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                                {notification.body}
                              </p>
                            )}

                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-3 w-3" />
                              Recent activity
                            </div>

                          </div>

                          {!notification.is_read && (
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          )}

                        </button>
                      )
                    )}

                  </div>

                </div>
              )}
            </div>

            {/* =================================================
                PROFILE
            ================================================= */}

            <div
              ref={profileRef}
              className="relative hidden sm:block"
            >

              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (value) => !value
                  )
                }
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all md:px-3 md:py-2 ${
                  profileOpen
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >

                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">

                  {userInitial}

                  {profile.is_verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
                      <CheckCircle2 className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    </span>
                  )}

                </div>

                <div className="hidden text-left md:block">

                  <p className="max-w-28 truncate text-sm font-semibold text-slate-900">
                    {profile.full_name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {profile.college_id}
                  </p>

                </div>

                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    profileOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {/* PROFILE DROPDOWN */}

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">

                  {/* USER HEADER */}

                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 px-3 py-3">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-bold text-white">
                        {userInitial}
                      </div>

                      <div className="min-w-0">

                        <div className="flex items-center gap-1.5">

                          <p className="truncate font-semibold text-slate-900">
                            {profile.full_name}
                          </p>

                          {profile.is_verified && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 fill-emerald-500 text-emerald-500" />
                          )}

                        </div>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {profile.role === "admin"
                            ? "Administrator"
                            : profile.role ===
                              "faculty"
                            ? "Faculty"
                            : "Student"}
                        </p>

                      </div>

                    </div>

                    <div className="mt-3 space-y-1.5">

                      <p className="text-xs text-slate-500">
                        Roll No:{" "}
                        <span className="font-semibold text-slate-700">
                          {profile.college_id ||
                            "-"}
                        </span>
                      </p>

                      <p className="break-all text-xs text-slate-500">
                        {profile.email}
                      </p>

                    </div>

                  </div>

                  {/* PROFILE */}

                  <Link
                    to="/profile"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>

                    <span>My Profile</span>
                  </Link>

                  {/* ADMIN */}

                  {profile.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                      </div>

                      <span>Admin Control Center</span>
                    </Link>
                  )}

                  {/* SIGN OUT */}

                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      await signOut();
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>

                    <span>Sign Out</span>

                  </button>

                </div>
              )}
            </div>

            {/* =================================================
                ADMIN DESKTOP
            ================================================= */}

            {profile.role === "admin" && (
              <Link
                to="/admin"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-purple-700 lg:inline-flex"
              >
                <ShieldCheck className="h-4 w-4" />

                <span>Admin</span>
              </Link>
            )}

            {/* =================================================
                MOBILE MENU BUTTON
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (value) => !value
                )
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all lg:hidden ${
                mobileOpen
                  ? "border-blue-200 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >

              {mobileOpen ? (
                <X className="h-[22px] w-[22px]" />
              ) : (
                <Menu className="h-[22px] w-[22px]" />
              )}

            </button>

          </div>
        </div>

        {/* =====================================================
            MOBILE MENU
        ====================================================== */}

        {mobileOpen && (
          <div className="border-t border-slate-100 py-3 lg:hidden">

            {/* MOBILE SEARCH */}

            <div className="relative mb-3">

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">

                <Search className="mr-2 h-[18px] w-[18px] shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search lost & found..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />

                {searching && (
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                )}

              </div>

              {/* MOBILE SEARCH RESULTS */}

              {search.trim() && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">

                  {searching ? (
                    <div className="p-5 text-center">

                      <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                      <p className="text-sm text-slate-400">
                        Searching...
                      </p>

                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-5 text-center">

                      <Search className="mx-auto h-5 w-5 text-slate-400" />

                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        No items found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try another item name or location
                      </p>

                    </div>
                  ) : (
                    searchResults.map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            openSearchItem(
                              item.id
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"
                        >

                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              item.type === "lost"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {item.type ===
                            "lost" ? (
                              <AlertCircle className="h-5 w-5" />
                            ) : (
                              <Package className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>

                            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">

                              <MapPin className="h-3 w-3 shrink-0" />

                              <span className="truncate">
                                {item.location ||
                                  "Location unavailable"}
                              </span>

                            </div>

                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              item.type ===
                              "lost"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {item.type.toUpperCase()}
                          </span>

                        </button>
                      )
                    )
                  )}

                </div>
              )}
            </div>

            {/* MOBILE NAV LINKS */}

            <div className="grid gap-2">

              {/* DASHBOARD */}

              <Link
                to="/"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <Home className="h-4 w-4 text-slate-500" />

                <span>Dashboard</span>
              </Link>

              {/* REPORT */}

              <Link
                to="/report"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md"
              >
                <Plus className="h-4 w-4" />

                <span>
                  Report Lost / Found Item
                </span>
              </Link>

              {/* PROFILE */}

              <Link
                to="/profile"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <User className="h-4 w-4 text-slate-500" />

                <span>My Profile</span>
              </Link>

              {/* ADMIN */}

              {profile.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  <ShieldCheck className="h-4 w-4" />

                  <span>Admin Panel</span>
                </Link>
              )}

              {/* SIGN OUT */}

              <button
                type="button"
                onClick={async () => {
                  closeMobileMenu();
                  await signOut();
                }}
                className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" />

                <span>Sign Out</span>
              </button>

            </div>

            {/* MOBILE USER INFO */}

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-bold text-white">

                  {userInitial}

                  {profile.is_verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                    </span>
                  )}

                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-1.5">

                    <p className="truncate text-sm font-bold text-slate-900">
                      {profile.full_name}
                    </p>

                    {profile.is_verified && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 fill-emerald-500 text-emerald-500" />
                    )}

                  </div>

                  <p className="truncate text-xs text-slate-500">
                    {profile.college_id}
                  </p>

                  <p className="truncate text-xs text-slate-400">
                    {profile.email}
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}
      </div>
    </header>
  );
}