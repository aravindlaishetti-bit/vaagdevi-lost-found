import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Profile, Item } from "../types";
import {
  Activity,
  AlertCircle,
  Archive,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  XCircle,
  Edit3,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Tab = "overview" | "users" | "items" | "matches";
type Filter = "all" | "lost" | "found" | "closed";

type MatchRecord = {
  id: string;
  similarity_score?: number;
  status?: string;
  created_at?: string;
  lost_item?: {
    title?: string;
  };
  found_item?: {
    title?: string;
  };
};

export default function AdminPanel() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  async function loadAll(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
    const m = (matchData as MatchRecord[]) ?? [];

    setProfiles(p);
    setItems(it);
    setMatches(m);

    setStats({
      total: it.length,
      lost: it.filter((i) => i.type === "lost").length,
      found: it.filter((i) => i.type === "found").length,
      claimed: it.filter((i) => i.status === "claimed").length,
      users: p.length,
      pending: p.filter((u) => !u.is_verified).length,
    });

    setLoading(false);
    setRefreshing(false);
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

    await loadAll(true);
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

    await loadAll(true);
    setActionLoading(null);
  }

  // =========================================================
  // DELETE REPORT
  // =========================================================

  async function deleteItem(itemId: string) {
    const confirmed = window.confirm(
      "Delete this report permanently?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    setActionLoading(itemId);

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

    await loadAll(true);
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

  const filteredItems = items.filter((item) => {
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

    return matchesFilter && matchesSearch;
  });

  // =========================================================
  // STAT CARDS
  // =========================================================

  const statCards = [
    {
      label: "Total Reports",
      value: stats.total,
      description: "All campus reports",
      icon: FileText,
      iconClass:
        "bg-blue-50 text-blue-600",
    },
    {
      label: "Lost Items",
      value: stats.lost,
      description: "Items reported lost",
      icon: AlertCircle,
      iconClass:
        "bg-red-50 text-red-600",
    },
    {
      label: "Found Items",
      value: stats.found,
      description: "Items reported found",
      icon: Package,
      iconClass:
        "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Claimed",
      value: stats.claimed,
      description: "Successfully claimed",
      icon: CheckCircle2,
      iconClass:
        "bg-violet-50 text-violet-600",
    },
    {
      label: "Users",
      value: stats.users,
      description: "Registered users",
      icon: Users,
      iconClass:
        "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Pending",
      value: stats.pending,
      description: "Awaiting verification",
      icon: Clock3,
      iconClass:
        "bg-amber-50 text-amber-600",
    },
  ];

  // =========================================================
  // TABS
  // =========================================================

  const tabs = [
    {
      value: "overview" as Tab,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      value: "users" as Tab,
      label: "Users",
      icon: Users,
    },
    {
      value: "items" as Tab,
      label: "Reports",
      icon: FileText,
    },
    {
      value: "matches" as Tab,
      label: "AI Matches",
      icon: Bot,
    },
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-2xl sm:p-8">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-xl">
                <ShieldCheck className="h-3.5 w-3.5" />
                ADMIN CONTROL CENTER
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Vaagdevi Lost & Found
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Manage campus reports, users, verification,
                moderation and AI-powered matching from one
                centralized dashboard.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Platform Online
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  <Activity className="h-3.5 w-3.5" />
                  {stats.total} reports tracked
                </div>

              </div>

            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={() => loadAll(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh Data"}
              </button>

              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-xl">

                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  AI Engine
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-300" />

                  <span className="text-sm font-semibold">
                    Operational
                  </span>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* =====================================================
            TABS
        ====================================================== */}

        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">

          <div className="flex min-w-max gap-1">

            {tabs.map((item) => {
              const Icon = item.icon;
              const active =
                tab === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setTab(item.value)
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}

          </div>

        </div>

        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading ? (

          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">

            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">

              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />

            </div>

            <p className="text-sm font-semibold text-slate-700">
              Loading admin dashboard
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Fetching reports, users and AI matches...
            </p>

          </div>

        ) : (

          <>
            {/* =================================================
                OVERVIEW
            ================================================= */}

            {tab === "overview" && (

              <div>

                {/* STATS */}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

                  {statCards.map((stat) => {

                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.label}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      >

                        <div
                          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconClass} transition-transform duration-300 group-hover:scale-110`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <p className="text-2xl font-bold text-slate-900">
                          {stat.value}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-700 sm:text-sm">
                          {stat.label}
                        </p>

                        <p className="mt-1 hidden text-[11px] text-slate-400 sm:block">
                          {stat.description}
                        </p>

                      </div>
                    );
                  })}

                </div>

                {/* LOWER GRID */}

                <div className="mt-6 grid gap-5 lg:grid-cols-3">

                  {/* CAMPUS ACTIVITY */}

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">

                    <div className="flex items-start justify-between">

                      <div>

                        <div className="flex items-center gap-2">

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <TrendingUp className="h-4 w-4" />
                          </div>

                          <div>

                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                              Reports
                            </p>

                            <h2 className="mt-0.5 text-xl font-bold text-slate-900">
                              Campus activity
                            </h2>

                          </div>

                        </div>

                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        {stats.total} total
                      </span>

                    </div>

                    <div className="mt-7 space-y-6">

                      {/* LOST */}

                      <div>

                        <div className="mb-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                            </span>

                            <span className="text-sm font-semibold text-slate-700">
                              Lost Items
                            </span>

                          </div>

                          <span className="text-sm font-bold text-slate-900">
                            {stats.lost}
                          </span>

                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700"
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

                        <div className="mb-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <Package className="h-3.5 w-3.5" />
                            </span>

                            <span className="text-sm font-semibold text-slate-700">
                              Found Items
                            </span>

                          </div>

                          <span className="text-sm font-bold text-slate-900">
                            {stats.found}
                          </span>

                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
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

                      {/* CLAIMED */}

                      <div>

                        <div className="mb-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>

                            <span className="text-sm font-semibold text-slate-700">
                              Claimed
                            </span>

                          </div>

                          <span className="text-sm font-bold text-slate-900">
                            {stats.claimed}
                          </span>

                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                            style={{
                              width: `${
                                stats.total
                                  ? (stats.claimed /
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

                  {/* ADMIN ACTIONS */}

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                      Administration
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Pending actions
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Items requiring administrator attention.
                    </p>

                    <div className="mt-5 rounded-2xl bg-amber-50 p-4">

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                            <UserCheck className="h-4 w-4" />
                          </div>

                          <div>

                            <p className="text-sm font-bold text-slate-900">
                              Verification
                            </p>

                            <p className="text-xs text-slate-500">
                              Users awaiting approval
                            </p>

                          </div>

                        </div>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                          {stats.pending}
                        </span>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTab("users")
                      }
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Users className="h-4 w-4" />
                      Manage Users
                    </button>

                  </div>

                </div>

                {/* QUICK INSIGHTS */}

                <div className="mt-5 grid gap-4 sm:grid-cols-3">

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400">
                          REGISTERED USERS
                        </p>

                        <p className="text-lg font-bold text-slate-900">
                          {stats.users}
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Sparkles className="h-5 w-5" />
                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400">
                          AI MATCHES
                        </p>

                        <p className="text-lg font-bold text-slate-900">
                          {matches.length}
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Archive className="h-5 w-5" />
                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400">
                          CLAIMED ITEMS
                        </p>

                        <p className="text-lg font-bold text-slate-900">
                          {stats.claimed}
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =================================================
                USERS
            ================================================= */}

            {tab === "users" && (

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 p-5 sm:p-6">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Users className="h-4 w-4" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">
                          User Management
                        </h2>

                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Review registered users and manage verification status.
                      </p>

                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5">

                      <Users className="h-4 w-4 text-blue-600" />

                      <span className="text-xs font-bold text-blue-700">
                        {profiles.length} Registered
                      </span>

                    </div>

                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1100px] text-sm">

                    <thead className="bg-slate-50">

                      <tr>

                        {[
                          "User",
                          "Email",
                          "Roll No",
                          "Department",
                          "Phone",
                          "Role",
                          "Joined",
                          "Status",
                          "Action",
                        ].map((heading) => (

                          <th
                            key={heading}
                            className={`px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                              heading ===
                              "Action"
                                ? "text-right"
                                : ""
                            }`}
                          >
                            {heading}
                          </th>

                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {profiles.length === 0 ? (

                        <tr>

                          <td
                            colSpan={9}
                            className="py-16 text-center"
                          >

                            <Users className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                              No registered users found
                            </p>

                          </td>

                        </tr>

                      ) : (

                        profiles.map((p) => (

                          <tr
                            key={p.id}
                            className="border-t border-slate-100 transition hover:bg-slate-50/70"
                          >

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                {p.avatar_url ? (

                                  <img
                                    src={p.avatar_url}
                                    alt={p.full_name}
                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
                                  />

                                ) : (

                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                                    {p.full_name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase() ||
                                      "U"}
                                  </div>

                                )}

                                <div>

                                  <div className="flex items-center gap-1.5">

                                    <p className="font-semibold text-slate-900">
                                      {p.full_name ||
                                        "Unknown User"}
                                    </p>

                                    {p.is_verified && (
                                      <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                                    )}

                                  </div>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
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

                            <td className="px-5 py-4">

                              <span className="block max-w-[220px] truncate text-slate-600">
                                {p.email || "-"}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {p.college_id ||
                                  "-"}
                              </span>

                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {p.department || "-"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {p.phone || "-"}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                  p.role ===
                                  "admin"
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

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                  p.is_verified
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >

                                {p.is_verified ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5" />
                                )}

                                {p.is_verified
                                  ? "Verified"
                                  : "Pending"}

                              </span>

                            </td>

                            <td className="px-5 py-4 text-right">

                              <button
                                type="button"
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
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  p.is_verified
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}
                              >

                                {actionLoading ===
                                p.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : p.is_verified ? (
                                  <XCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5" />
                                )}

                                {actionLoading ===
                                p.id
                                  ? "Updating"
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

                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">

                  <p className="text-xs text-slate-400">
                    Showing {profiles.length} registered users
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                REPORTS
            ================================================= */}

            {tab === "items" && (

              <div>

                <div className="mb-5 flex flex-col gap-3 md:flex-row">

                  <div className="relative flex-1">

                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="Search reports, locations, categories..."
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                  <select
                    value={filter}
                    onChange={(e) =>
                      setFilter(
                        e.target.value as Filter
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 p-5 sm:p-6">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div>

                        <h2 className="text-xl font-bold text-slate-900">
                          Report Management
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Edit, close or permanently delete campus reports.
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[1050px] text-sm">

                      <thead className="bg-slate-50">

                        <tr>

                          {[
                            "Report",
                            "Type",
                            "Reporter",
                            "Location",
                            "Date",
                            "Status",
                            "Actions",
                          ].map((heading) => (

                            <th
                              key={heading}
                              className={`px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                                heading ===
                                "Actions"
                                  ? "text-right"
                                  : ""
                              }`}
                            >
                              {heading}
                            </th>

                          ))}

                        </tr>

                      </thead>

                      <tbody>

                        {filteredItems.length ===
                        0 ? (

                          <tr>

                            <td
                              colSpan={7}
                              className="py-16 text-center"
                            >

                              <FileText className="mx-auto h-8 w-8 text-slate-300" />

                              <p className="mt-3 text-sm font-semibold text-slate-500">
                                No reports found
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Try changing your search or filter.
                              </p>

                            </td>

                          </tr>

                        ) : (

                          filteredItems.map(
                            (item) => (

                              <tr
                                key={item.id}
                                className="border-t border-slate-100 transition hover:bg-slate-50/70"
                              >

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

                                <td className="px-5 py-4">

                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                      item.type ===
                                      "lost"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-emerald-50 text-emerald-600"
                                    }`}
                                  >

                                    {item.type ===
                                    "lost" ? (
                                      <AlertCircle className="h-3.5 w-3.5" />
                                    ) : (
                                      <Package className="h-3.5 w-3.5" />
                                    )}

                                    {item.type ===
                                    "lost"
                                      ? "Lost"
                                      : "Found"}

                                  </span>

                                </td>

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

                                <td className="px-5 py-4">

                                  <div className="flex max-w-[180px] items-center gap-1.5 text-slate-500">

                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                    <span className="truncate">
                                      {item.location ||
                                        "Unknown"}
                                    </span>

                                  </div>

                                </td>

                                <td className="px-5 py-4 text-slate-500">

                                  {item.date_occurred
                                    ? new Date(
                                        item.date_occurred
                                      ).toLocaleDateString(
                                        "en-IN"
                                      )
                                    : "-"}

                                </td>

                                <td className="px-5 py-4">

                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                      item.status ===
                                      "closed"
                                        ? "bg-slate-100 text-slate-600"
                                        : item.status ===
                                          "claimed"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-blue-50 text-blue-700"
                                    }`}
                                  >

                                    {item.status ===
                                    "closed" ? (
                                      <Lock className="h-3 w-3" />
                                    ) : (
                                      <Activity className="h-3 w-3" />
                                    )}

                                    {item.status ||
                                      "active"}

                                  </span>

                                </td>

                                <td className="px-5 py-4">

                                  <div className="flex justify-end gap-2">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        editItem(
                                          item.id
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      Edit
                                    </button>

                                    {item.status !==
                                      "closed" && (

                                      <button
                                        type="button"
                                        disabled={
                                          actionLoading ===
                                          item.id
                                        }
                                        onClick={() =>
                                          closeItem(
                                            item.id
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                      >

                                        {actionLoading ===
                                        item.id ? (
                                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Lock className="h-3.5 w-3.5" />
                                        )}

                                        Close
                                      </button>

                                    )}

                                    <button
                                      type="button"
                                      disabled={
                                        actionLoading ===
                                        item.id
                                      }
                                      onClick={() =>
                                        deleteItem(
                                          item.id
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                    >

                                      {actionLoading ===
                                      item.id ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}

                                      Delete
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

                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">

                    <p className="text-xs text-slate-400">
                      Showing {filteredItems.length} of{" "}
                      {items.length} reports
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

                <div className="border-b border-slate-100 p-5 sm:p-6">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Bot className="h-5 w-5" />
                        </div>

                        <div>

                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                            AI Engine
                          </p>

                          <h2 className="mt-0.5 text-xl font-bold text-slate-900">
                            AI Match Management
                          </h2>

                        </div>

                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Review automatically detected lost and found item matches.
                      </p>

                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                      AI Online

                    </div>

                  </div>

                </div>

                <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-3">

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Bot className="h-4 w-4" />
                      </div>

                      <div>

                        <p className="text-xs text-slate-400">
                          TOTAL MATCHES
                        </p>

                        <p className="text-xl font-bold text-slate-900">
                          {matches.length}
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>

                      <div>

                        <p className="text-xs text-slate-400">
                          HIGH CONFIDENCE
                        </p>

                        <p className="text-xl font-bold text-slate-900">
                          {
                            matches.filter(
                              (m) =>
                                (m.similarity_score ??
                                  0) >=
                                0.75
                            ).length
                          }
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <div>

                        <p className="text-xs text-slate-400">
                          ENGINE STATUS
                        </p>

                        <p className="text-xl font-bold text-emerald-600">
                          Online
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[850px] text-sm">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Lost Item
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Found Item
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Confidence
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Status
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {matches.length === 0 ? (

                        <tr>

                          <td
                            colSpan={4}
                            className="py-16 text-center"
                          >

                            <Bot className="mx-auto h-9 w-9 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                              No AI matches found
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Matches will appear here when the AI engine detects candidates.
                            </p>

                          </td>

                        </tr>

                      ) : (

                        matches.map((match) => {

                          const confidence =
                            Math.round(
                              (match.similarity_score ??
                                0) * 100
                            );

                          const confidenceClass =
                            confidence >= 75
                              ? "text-emerald-600"
                              : confidence >= 55
                              ? "text-amber-600"
                              : "text-slate-500";

                          return (

                            <tr
                              key={match.id}
                              className="border-t border-slate-100 transition hover:bg-slate-50/70"
                            >

                              <td className="px-5 py-4">

                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                  </div>

                                  <p className="font-semibold text-slate-800">
                                    {match.lost_item
                                      ?.title ??
                                      "-"}
                                  </p>

                                </div>

                              </td>

                              <td className="px-5 py-4">

                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Package className="h-4 w-4" />
                                  </div>

                                  <p className="font-semibold text-slate-800">
                                    {match.found_item
                                      ?.title ??
                                      "-"}
                                  </p>

                                </div>

                              </td>

                              <td className="px-5 py-4">

                                <div className="flex items-center gap-3">

                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">

                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all"
                                      style={{
                                        width: `${Math.min(
                                          confidence,
                                          100
                                        )}%`,
                                      }}
                                    />

                                  </div>

                                  <span
                                    className={`font-bold ${confidenceClass}`}
                                  >
                                    {confidence}%
                                  </span>

                                </div>

                              </td>

                              <td className="px-5 py-4">

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                    match.status ===
                                    "confirmed"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
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
    </div>
  );
}