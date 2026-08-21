import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Item, ItemType } from "../types";
import { ItemCard } from "../components/ItemCard";
import DashboardHero from "../components/dashboard/DashboardHero";
import DashboardStats from "../components/dashboard/DashboardStats";
import QuickActions from "../components/dashboard/QuickActions";
import AISuggestions from "../components/dashboard/AISuggestions";
import clsx from "clsx";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  PackageOpen,
  Sparkles,
  X,
} from "lucide-react";

type Filter = "all" | ItemType | "mine";

export default function Dashboard() {
  const { profile } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, [filter, profile?.id]);

  async function load(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    let query = supabase
      .from("items")
      .select(
        "*, item_images(id, storage_path), profiles(full_name, department)"
      )
      .order("created_at", { ascending: false });

    if (filter === "lost" || filter === "found") {
      query = query.eq("type", filter);
    }

    if (filter === "mine" && profile) {
      query = query.eq("reporter_id", profile.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("DASHBOARD LOAD ERROR:", error);
      setItems([]);
    } else {
      setItems((data as unknown as Item[]) ?? []);
    }

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      (
        item.title +
        " " +
        item.description +
        " " +
        (item.category ?? "") +
        " " +
        item.location +
        " " +
        (item.profiles?.full_name ?? "")
      )
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  function clearSearch() {
    setSearch("");
  }

  const filterLabels: Record<Filter, string> = {
    all: "All reports",
    lost: "Lost items",
    found: "Found items",
    mine: "My reports",
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">

      {/* =====================================================
          HERO
      ====================================================== */}

      <div className="mb-8">
        <DashboardHero />
      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

      <div className="mb-8">
        <DashboardStats />
      </div>

      {/* =====================================================
          QUICK ACTIONS
      ====================================================== */}

      <div className="mb-8">
        <QuickActions />
      </div>

      {/* =====================================================
          AI SUGGESTIONS
      ====================================================== */}

      <div className="mb-10">
        <AISuggestions />
      </div>

      {/* =====================================================
          CAMPUS BOARD HEADER
      ====================================================== */}

      <section className="mb-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              CAMPUS COMMUNITY
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Campus board
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Welcome back,{" "}
              <span className="font-semibold text-slate-700">
                {profile?.full_name?.split(" ")[0] ?? "Student"}
              </span>
              . Find what you lost or help someone find theirs.
            </p>

          </div>

          {/* SEARCH */}

          <div className="relative w-full lg:max-w-md">

            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search items, categories, locations..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          FILTER TOOLBAR
      ====================================================== */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* FILTERS */}

          <div className="flex flex-wrap items-center gap-1.5">

            <div className="mr-1 hidden items-center gap-1.5 px-2 text-xs font-semibold text-slate-400 sm:flex">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </div>

            {(["all", "lost", "found", "mine"] as Filter[]).map(
              (filterOption) => (

                <button
                  key={filterOption}
                  type="button"
                  onClick={() => setFilter(filterOption)}
                  className={clsx(
                    "rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm",
                    filter === filterOption
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {filterLabels[filterOption]}
                </button>

              )
            )}

          </div>

          {/* RIGHT SIDE */}

          <div className="flex items-center justify-between gap-3 px-1 sm:justify-end">

            <p className="text-xs font-medium text-slate-400">
              {visible.length}{" "}
              {visible.length === 1 ? "report" : "reports"}
            </p>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={clsx(
                  "h-3.5 w-3.5",
                  refreshing && "animate-spin"
                )}
              />

              <span>
                {refreshing ? "Refreshing" : "Refresh"}
              </span>
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          SEARCH RESULT MESSAGE
      ====================================================== */}

      {search.trim() && !loading && (
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">

          <Search className="h-4 w-4 text-blue-500" />

          <span>
            Showing results for{" "}
            <span className="font-semibold text-slate-800">
              "{search}"
            </span>
          </span>

        </div>
      )}

      {/* =====================================================
          CONTENT
      ====================================================== */}

      {loading ? (

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {Array.from({ length: 8 }).map((_, index) => (

            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="aspect-[4/3] animate-pulse bg-slate-100" />

              <div className="space-y-3 p-4">

                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />

                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />

                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />

              </div>

            </div>

          ))}

        </div>

      ) : visible.length === 0 ? (

        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

            <PackageOpen className="h-7 w-7 text-slate-400" />

          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            No reports found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {search.trim()
              ? "Try a different keyword, category or location."
              : filter === "mine"
              ? "You haven't reported any items yet."
              : "There are no reports in this section yet."}
          </p>

          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Clear search
            </button>
          )}

        </div>

      ) : (

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
            />
          ))}

        </div>

      )}

      {/* =====================================================
          FOOTER INFO
      ====================================================== */}

      {!loading && visible.length > 0 && (
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">

          <p>
            Showing {visible.length} of {items.length} reports
          </p>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Campus board is live
          </div>

        </div>
      )}

    </div>
  );
}