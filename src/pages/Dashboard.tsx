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
  }, [filter]);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("*, item_images(id, storage_path), profiles(full_name, department)")
      .order("created_at", { ascending: false });

    if (filter === "lost" || filter === "found") query = query.eq("type", filter);
    if (filter === "mine" && profile) query = query.eq("reporter_id", profile.id);

    const { data, error } = await query;
    if (!error) setItems((data as unknown as Item[]) ?? []);
    setLoading(false);
  }

  const visible = items.filter((i) =>
    (i.title + i.description + (i.category ?? "") + i.location).toLowerCase().includes(search.toLowerCase())
  );

  return (
  <div className="mx-auto max-w-6xl px-4 py-6">

    <div className="mb-8">
      <DashboardHero />
    </div>

    <div className="mb-8">
      <DashboardStats />
    </div>
    <div className="mb-8">
  <QuickActions />
</div>

<div className="mb-8">
  <AISuggestions />
</div>

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"></div>

      <DashboardHero />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl">Campus board</h1>
          <p className="text-sm text-slate-500">Welcome back, {profile?.full_name?.split(" ")[0]}.</p>
        </div>
        <input
          placeholder="Search by title, category, location…"
          className="input sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "lost", "found", "mine"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize",
              filter === f ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600"
            )}
          >
            {f === "mine" ? "My reports" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading items…</p>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p className="font-medium">Nothing here yet.</p>
          <p className="text-sm mt-1">Be the first to report a lost or found item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
