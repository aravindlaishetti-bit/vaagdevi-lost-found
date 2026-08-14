import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Profile, Item } from "../types";

type Tab = "overview" | "users" | "items" | "matches";
type Filter = "all" | "lost" | "found" | "closed";

export default function AdminPanel() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    lost: 0,
    found: 0,
    claimed: 0,
    users: 0,
    pending: 0,
  });

  // =========================================================
  // LOAD ADMIN DATA
  // =========================================================

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const [
      { data: profileData, error: profileError },
      { data: itemData, error: itemError },
      { data: matchData, error: matchError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("items")
        .select("*, profiles(full_name, department)")
        .order("created_at", { ascending: false }),

      supabase
        .from("matches")
        .select(`
          *,
          lost_item:lost_item_id(title),
          found_item:found_item_id(title)
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (profileError) {
      console.error("PROFILE LOAD ERROR:", profileError);
    }

    if (itemError) {
      console.error("ITEM LOAD ERROR:", itemError);
    }

    if (matchError) {
      console.error("MATCH LOAD ERROR:", matchError);
    }

    const p = (profileData as Profile[]) ?? [];
    const it = (itemData as unknown as Item[]) ?? [];

    setProfiles(p);

    console.log("ADMIN PROFILES:", p);
console.log("ADMIN PROFILE COUNT:", p.length);

    setItems(it);
    setMatches(matchData ?? []);

    setStats({
      total: it.length,
      lost: it.filter((i) => i.type === "lost").length,
      found: it.filter((i) => i.type === "found").length,
      claimed: it.filter((i) => i.status === "claimed").length,
      users: p.length,
      pending: p.filter((u) => !u.is_verified).length,
    });

    setLoading(false);
  }

  // =========================================================
  // USER VERIFICATION
  // =========================================================

  async function toggleVerify(
    userId: string,
    verified: boolean
  ) {
    setActionLoading(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        is_verified: verified,
      })
      .eq("id", userId);

    if (error) {
      alert(
        "Failed to update user:\n\n" +
          error.message
      );

      setActionLoading(null);
      return;
    }

    await loadAll();

    setActionLoading(null);
  }

  // =========================================================
  // CLOSE REPORT
  // =========================================================

  async function closeItem(itemId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to close this report?"
    );

    if (!confirmed) return;

    setActionLoading(itemId);

    const { error } = await supabase
      .from("items")
      .update({
        status: "closed",
      })
      .eq("id", itemId);

    if (error) {
      alert(
        "Failed to close report:\n\n" +
          error.message
      );

      setActionLoading(null);
      return;
    }

    await loadAll();

    setActionLoading(null);
  }

  // =========================================================
  // DELETE REPORT
  // =========================================================

  async function deleteItem(itemId: string) {
    const confirmed = window.confirm(
      "⚠️ Delete this report permanently?\n\n" +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    setActionLoading(itemId);

    // Delete image records
    const { error: imageError } = await supabase
      .from("item_images")
      .delete()
      .eq("item_id", itemId);

    if (imageError) {
      console.error(
        "IMAGE DELETE ERROR:",
        imageError
      );
    }

    // Delete matches where item is lost
    const { error: lostMatchError } =
      await supabase
        .from("matches")
        .delete()
        .eq("lost_item_id", itemId);

    if (lostMatchError) {
      console.error(
        "LOST MATCH DELETE ERROR:",
        lostMatchError
      );
    }

    // Delete matches where item is found
    const { error: foundMatchError } =
      await supabase
        .from("matches")
        .delete()
        .eq("found_item_id", itemId);

    if (foundMatchError) {
      console.error(
        "FOUND MATCH DELETE ERROR:",
        foundMatchError
      );
    }

    // Finally delete item
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId);

    if (error) {
      alert(
        "Failed to delete report.\n\n" +
          error.message +
          "\n\nIf RLS is blocking this action, an admin policy is required in Supabase."
      );

      setActionLoading(null);
      return;
    }

    await loadAll();

    setActionLoading(null);
  }

  // =========================================================
  // EDIT REPORT
  // =========================================================

  function editItem(itemId: string) {
    navigate(`/items/${itemId}/edit`);
  }

  // =========================================================
  // FILTER REPORTS
  // =========================================================

  const filteredItems = items.filter(
    (item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "closed"
          ? item.status === "closed"
          : item.type === filter;

      const searchableText = (
        item.title +
        " " +
        item.description +
        " " +
        (item.category ?? "") +
        " " +
        (item.location ?? "") +
        " " +
        (item.profiles?.full_name ?? "")
      ).toLowerCase();

      const matchesSearch = search.trim()
        ? searchableText.includes(
            search.toLowerCase()
          )
        : true;

      return (
        matchesFilter &&
        matchesSearch
      );
    }
  );

  // =========================================================
  // STAT CARDS
  // =========================================================

  const statCards = [
    {
      label: "Total Reports",
      value: stats.total,
      icon: "📋",
      description: "All campus reports",
    },
    {
      label: "Lost Items",
      value: stats.lost,
      icon: "🔍",
      description: "Items reported lost",
    },
    {
      label: "Found Items",
      value: stats.found,
      icon: "🎒",
      description: "Items reported found",
    },
    {
      label: "Claimed",
      value: stats.claimed,
      icon: "✅",
      description: "Successfully claimed",
    },
    {
      label: "Users",
      value: stats.users,
      icon: "👥",
      description: "Registered users",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: "⏳",
      description: "Awaiting verification",
    },
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-7 text-white shadow-2xl md:p-9">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              🛡️ ADMIN CONTROL CENTER
            </div>

            <h1 className="text-3xl font-bold md:text-4xl">
              Vaagdevi Lost & Found
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Manage campus reports, users, AI matches
              and moderation from one place.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl">

            <p className="text-xs uppercase tracking-wider text-white/40">
              System Status
            </p>

            <div className="mt-2 flex items-center gap-2">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-sm font-semibold">
                Platform Online
              </span>

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

        {[
          ["overview", "📊 Overview"],
          ["users", "👥 Users"],
          ["items", "📋 Reports"],
          ["matches", "🤖 AI Matches"],
        ].map(([value, label]) => (

          <button
            key={value}
            onClick={() =>
              setTab(value as Tab)
            }
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === value
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>

        ))}

      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (

        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading admin data...
          </p>

        </div>

      ) : (

        <>
          {/* =================================================
              OVERVIEW
          ================================================= */}

          {tab === "overview" && (

            <div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">

                {statCards.map((stat) => (

                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >

                    <div className="mb-4 flex items-center justify-between">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-xl transition-transform duration-300 group-hover:scale-110">
                        {stat.icon}
                      </div>

                    </div>

                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {stat.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {stat.description}
                    </p>

                  </div>

                ))}

              </div>

              {/* ACTIVITY */}

              <div className="mt-7 grid gap-5 md:grid-cols-2">

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Reports
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Campus activity
                  </h2>

                  <div className="mt-5 space-y-4">

                    {/* LOST */}

                    <div>

                      <div className="mb-2 flex justify-between text-sm">

                        <span className="text-slate-500">
                          Lost
                        </span>

                        <span className="font-semibold">
                          {stats.lost}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${
                              stats.total
                                ? (stats.lost /
                                    stats.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        />

                      </div>

                    </div>

                    {/* FOUND */}

                    <div>

                      <div className="mb-2 flex justify-between text-sm">

                        <span className="text-slate-500">
                          Found
                        </span>

                        <span className="font-semibold">
                          {stats.found}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{
                            width: `${
                              stats.total
                                ? (stats.found /
                                    stats.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* ADMINISTRATION */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                    Administration
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Pending actions
                  </h2>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-amber-50 p-4">

                    <div>

                      <p className="font-semibold text-slate-900">
                        User verification
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Users waiting for approval
                      </p>

                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                      {stats.pending}
                    </span>

                  </div>

                  <button
                    onClick={() =>
                      setTab("users")
                    }
                    className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Manage Users →
                  </button>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              USERS
          ================================================= */}

          {tab === "users" && (

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              {/* HEADER */}

              <div className="border-b border-slate-100 p-5">

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                  <div>

                    <h2 className="text-xl font-bold text-slate-900">
                      User Management
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      View and manage all registered
                      Vaagdevi Lost & Found users.
                    </p>

                  </div>

                  <div className="rounded-xl bg-blue-50 px-4 py-2">

                    <span className="text-xs font-semibold text-blue-600">
                      {profiles.length} Registered Users
                    </span>

                  </div>

                </div>

              </div>

              {/* USER TABLE */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1150px] text-sm">

                  <thead className="bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-left">
                        User
                      </th>

                      <th className="px-5 py-4 text-left">
                        Email
                      </th>

                      <th className="px-5 py-4 text-left">
                        Roll No
                      </th>

                      <th className="px-5 py-4 text-left">
                        Department
                      </th>

                      <th className="px-5 py-4 text-left">
                        Phone
                      </th>

                      <th className="px-5 py-4 text-left">
                        Role
                      </th>

                      <th className="px-5 py-4 text-left">
                        Joined
                      </th>

                      <th className="px-5 py-4 text-left">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {profiles.length === 0 ? (

                      <tr>

                        <td
                          colSpan={9}
                          className="py-12 text-center text-slate-400"
                        >
                          No registered users found.
                        </td>

                      </tr>

                    ) : (

                      profiles.map((p) => (

                        <tr
                          key={p.id}
                          className="border-t border-slate-100 transition hover:bg-slate-50/70"
                        >

                          {/* USER */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              {p.avatar_url ? (

                                <img
                                  src={p.avatar_url}
                                  alt={p.full_name}
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
                                />

                              ) : (

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">

                                  {p.full_name
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                    "U"}

                                </div>

                              )}

                              <div className="min-w-[150px]">

                                <p className="font-semibold text-slate-900">
                                  {p.full_name ||
                                    "Unknown User"}
                                </p>

                                <p className="text-xs text-slate-400">
                                  ID:{" "}
                                  {p.id.slice(
                                    0,
                                    8
                                  )}
                                  ...
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* EMAIL */}

                          <td className="px-5 py-4">

                            <p className="max-w-[220px] truncate text-slate-600">
                              {p.email || "-"}
                            </p>

                          </td>

                          {/* ROLL NO */}

                          <td className="px-5 py-4">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {p.college_id || "-"}
                            </span>

                          </td>

                          {/* DEPARTMENT */}

                          <td className="px-5 py-4 text-slate-600">
                            {p.department || "-"}
                          </td>

                          {/* PHONE */}

                          <td className="px-5 py-4 text-slate-600">
                            {p.phone || "-"}
                          </td>

                          {/* ROLE */}

                          <td className="px-5 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                p.role === "admin"
                                  ? "bg-purple-50 text-purple-700"
                                  : p.role ===
                                    "faculty"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {p.role}
                            </span>

                          </td>

                          {/* JOINED */}

                          <td className="px-5 py-4 text-slate-500">

                            {p.created_at
                              ? new Date(
                                  p.created_at
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "-"}

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                p.is_verified
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  p.is_verified
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                }`}
                              />

                              {p.is_verified
                                ? "Verified"
                                : "Pending"}

                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4 text-right">

                            <button
                              disabled={
                                actionLoading ===
                                p.id
                              }
                              onClick={() =>
                                toggleVerify(
                                  p.id,
                                  !p.is_verified
                                )
                              }
                              className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                p.is_verified
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              }`}
                            >

                              {actionLoading ===
                              p.id
                                ? "Updating..."
                                : p.is_verified
                                ? "Revoke"
                                : "Verify"}

                            </button>

                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

              {/* FOOTER */}

              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">

                <p className="text-xs text-slate-400">
                  Showing {profiles.length} registered users
                </p>

              </div>

            </div>
          )}

          {/* =================================================
              REPORTS / ITEMS
          ================================================= */}

          {tab === "items" && (

            <div>

              {/* SEARCH + FILTER */}

              <div className="mb-5 flex flex-col gap-3 md:flex-row">

                <div className="relative flex-1">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    🔍
                  </span>

                  <input
                    type="text"
                    placeholder="Search reports, locations, categories..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                </div>

                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target.value as Filter
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                >

                  <option value="all">
                    All Reports
                  </option>

                  <option value="lost">
                    Lost
                  </option>

                  <option value="found">
                    Found
                  </option>

                  <option value="closed">
                    Closed
                  </option>

                </select>

              </div>

              {/* REPORT TABLE */}

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 p-5">

                  <h2 className="text-xl font-bold text-slate-900">
                    Report Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Edit, close or permanently delete
                    user reports.
                  </p>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1000px] text-sm">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-5 py-4 text-left">
                          Report
                        </th>

                        <th className="px-5 py-4 text-left">
                          Type
                        </th>

                        <th className="px-5 py-4 text-left">
                          Reporter
                        </th>

                        <th className="px-5 py-4 text-left">
                          Location
                        </th>

                        <th className="px-5 py-4 text-left">
                          Date
                        </th>

                        <th className="px-5 py-4 text-left">
                          Status
                        </th>

                        <th className="px-5 py-4 text-right">
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredItems.length ===
                      0 ? (

                        <tr>

                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-400"
                          >
                            No reports found.
                          </td>

                        </tr>

                      ) : (

                        filteredItems.map(
                          (item) => (

                            <tr
                              key={item.id}
                              className="border-t border-slate-100 hover:bg-slate-50/70"
                            >

                              {/* REPORT */}

                              <td className="px-5 py-4">

                                <div className="max-w-[230px]">

                                  <p className="truncate font-semibold text-slate-900">
                                    {item.title}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-slate-400">
                                    {item.category ||
                                      "Uncategorized"}
                                  </p>

                                </div>

                              </td>

                              {/* TYPE */}

                              <td className="px-5 py-4">

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    item.type ===
                                    "lost"
                                      ? "bg-red-50 text-red-600"
                                      : "bg-emerald-50 text-emerald-600"
                                  }`}
                                >

                                  {item.type ===
                                  "lost"
                                    ? "🔍 Lost"
                                    : "🎒 Found"}

                                </span>

                              </td>

                              {/* REPORTER */}

                              <td className="px-5 py-4">

                                <p className="font-medium text-slate-700">
                                  {item.profiles
                                    ?.full_name ||
                                    "-"}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {item.profiles
                                    ?.department ||
                                    ""}
                                </p>

                              </td>

                              {/* LOCATION */}

                              <td className="px-5 py-4 text-slate-500">
                                📍 {item.location}
                              </td>

                              {/* DATE */}

                              <td className="px-5 py-4 text-slate-500">

                                {item.date_occurred
                                  ? new Date(
                                      item.date_occurred
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )
                                  : "-"}

                              </td>

                              {/* STATUS */}

                              <td className="px-5 py-4">

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                                  {item.status}
                                </span>

                              </td>

                              {/* ACTIONS */}

                              <td className="px-5 py-4">

                                <div className="flex justify-end gap-2">

                                  {/* EDIT */}

                                  <button
                                    onClick={() =>
                                      editItem(
                                        item.id
                                      )
                                    }
                                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                                  >
                                    ✏️ Edit
                                  </button>

                                  {/* CLOSE */}

                                  {item.status !==
                                    "closed" && (

                                    <button
                                      disabled={
                                        actionLoading ===
                                        item.id
                                      }
                                      onClick={() =>
                                        closeItem(
                                          item.id
                                        )
                                      }
                                      className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                    >

                                      {actionLoading ===
                                      item.id
                                        ? "..."
                                        : "🔒 Close"}

                                    </button>

                                  )}

                                  {/* DELETE */}

                                  <button
                                    disabled={
                                      actionLoading ===
                                      item.id
                                    }
                                    onClick={() =>
                                      deleteItem(
                                        item.id
                                      )
                                    }
                                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                  >

                                    {actionLoading ===
                                    item.id
                                      ? "..."
                                      : "🗑️ Delete"}

                                  </button>

                                </div>

                              </td>

                            </tr>

                          )
                        )

                      )}

                    </tbody>

                  </table>

                </div>

                <div className="border-t border-slate-100 px-5 py-4">

                  <p className="text-xs text-slate-400">
                    Showing{" "}
                    {filteredItems.length}{" "}
                    of {items.length} reports
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              AI MATCHES
          ================================================= */}

          {tab === "matches" && (

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                      AI Engine
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      AI Match Management
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Review automatically detected
                      lost and found matches.
                    </p>

                  </div>

                  <div className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 sm:block">
                    ● AI Online
                  </div>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[800px] text-sm">

                  <thead className="bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-left">
                        Lost Item
                      </th>

                      <th className="px-5 py-4 text-left">
                        Found Item
                      </th>

                      <th className="px-5 py-4 text-left">
                        Confidence
                      </th>

                      <th className="px-5 py-4 text-left">
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {matches.length === 0 ? (

                      <tr>

                        <td
                          colSpan={4}
                          className="py-12 text-center text-slate-400"
                        >
                          No AI matches found.
                        </td>

                      </tr>

                    ) : (

                      matches.map((match) => {

                        const confidence =
                          Math.round(
                            (match.similarity_score ??
                              0) * 100
                          );

                        return (

                          <tr
                            key={match.id}
                            className="border-t border-slate-100"
                          >

                            <td className="px-5 py-4 font-medium text-slate-800">
                              🔍{" "}
                              {match.lost_item
                                ?.title ?? "-"}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-800">
                              🎒{" "}
                              {match.found_item
                                ?.title ?? "-"}
                            </td>

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">

                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                                    style={{
                                      width: `${Math.min(
                                        confidence,
                                        100
                                      )}%`,
                                    }}
                                  />

                                </div>

                                <span className="font-bold text-blue-600">
                                  {confidence}%
                                </span>

                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                                {match.status ||
                                  "suggested"}
                              </span>

                            </td>

                          </tr>

                        );

                      })

                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}