import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Item, ItemType } from "../types";
import { ItemCard } from "../components/ItemCard";
import DashboardHero from "../components/dashboard/DashboardHero";
import DashboardStats from "../components/dashboard/DashboardStats";
import QuickActions from "../components/dashboard/QuickActions";
import AISuggestions from "../components/dashboard/AISuggestions";
import clsx from "clsx";

type Filter = "all" | ItemType | "mine";

export default function Dashboard() {
  const { profile } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [filter, profile?.id]);

  async function load() {
    setLoading(true);

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

    setLoading(false);
  }

  const visible = items.filter((item) =>
    (
      item.title +
      item.description +
      (item.category ?? "") +
      item.location
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">

      {/* HERO */}
      <div className="mb-8">
        <DashboardHero />
      </div>

      {/* STATS */}
      <div className="mb-8">
        <DashboardStats />
      </div>

      {/* QUICK ACTIONS */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* AI SUGGESTIONS */}
      <div className="mb-8">
        <AISuggestions />
      </div>

      {/* CAMPUS BOARD */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="font-display text-2xl font-semibold">
            Campus board
          </h1>

          <p className="text-sm text-slate-500">
            Welcome back,{" "}
            {profile?.full_name?.split(" ")[0] ?? "Student"}.
          </p>
        </div>

        <input
          type="search"
          placeholder="Search by title, category, location…"
          className="input w-full sm:max-w-xs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

      </div>

      {/* FILTERS */}
      <div className="mb-6 flex flex-wrap gap-2">

        {(["all", "lost", "found", "mine"] as Filter[]).map(
          (filterOption) => (

            <button
              key={filterOption}
              type="button"
              onClick={() => setFilter(filterOption)}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition",
                filter === filterOption
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {filterOption === "mine"
                ? "My reports"
                : filterOption}

            </button>

          )
        )}

      </div>

      {/* CONTENT */}
      {loading ? (

        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>

      ) : visible.length === 0 ? (

        <div className="card p-10 text-center text-slate-500">

          <p className="font-medium">
            Nothing here yet.
          </p>

          <p className="mt-1 text-sm">
            Be the first to report a lost or found item.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">

          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
            />
          ))}

        </div>

      )}

    </div>
  );
}