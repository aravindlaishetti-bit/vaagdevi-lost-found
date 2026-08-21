import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Item } from "../types";
import clsx from "clsx";

type Filter = "all" | "lost" | "found";

export default function Search() {
  const [items, setItems] = useState<Item[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [filter]);

  async function loadItems() {
    setLoading(true);
    setImageUrls({});

    let query = supabase
      .from("items")
      .select(
        "*, item_images(id, storage_path), profiles(full_name, department)"
      )
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("SEARCH LOAD ERROR:", error);
      setItems([]);
      setLoading(false);
      return;
    }

    const loadedItems = (data as unknown as Item[]) ?? [];

    const urlMap: Record<string, string> = {};

    for (const item of loadedItems) {
      const path = item.item_images?.[0]?.storage_path;

      if (!path) continue;

      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("item-images")
          .createSignedUrl(path, 60 * 10);

      if (signedError) {
        console.error(
          "SEARCH IMAGE URL ERROR:",
          item.id,
          signedError
        );
        continue;
      }

      if (signedData?.signedUrl) {
        urlMap[item.id] = signedData.signedUrl;
      }
    }

    setImageUrls(urlMap);
    setItems(loadedItems);
    setLoading(false);
  }

  const visibleItems = items.filter((item) => {
    const text = [
      item.title,
      item.description,
      item.category ?? "",
      item.color ?? "",
      item.brand ?? "",
      item.location,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase().trim());
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-8">

      {/* HEADER */}
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          🔎 Campus Search
        </div>

        <h1 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
          Find an item
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Search lost and found reports across the Vaagdevi campus.
        </p>
      </div>

      {/* SEARCH */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">

          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, category, brand, color, location..."
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="shrink-0 rounded-full px-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(["all", "lost", "found"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
              filter === option
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {option === "all" ? "All items" : option}
          </button>
        ))}

        <span className="ml-auto text-xs text-slate-400">
          {visibleItems.length}{" "}
          {visibleItems.length === 1 ? "result" : "results"}
        </span>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />

              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
            🔍
          </div>

          <h2 className="mt-4 font-semibold text-slate-800">
            No items found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Try a different keyword, category, location, or item type.
          </p>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {visibleItems.map((item) => {
            const coverUrl = imageUrls[item.id];

            return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >

                {/* IMAGE */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">

                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() => {
                        console.error(
                          "SEARCH IMAGE LOAD FAILED:",
                          item.id,
                          coverUrl
                        );
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      📦
                    </div>
                  )}

                  <span
                    className={clsx(
                      "absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase shadow-sm",
                      item.type === "lost"
                        ? "bg-red-500 text-white"
                        : "bg-emerald-600 text-white"
                    )}
                  >
                    {item.type}
                  </span>

                  <span className="absolute right-3 top-3 max-w-[45%] truncate rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold capitalize text-slate-700 shadow-sm backdrop-blur">
                    {item.status}
                  </span>
                </div>

                {/* CONTENT */}
                <div className="p-4">

                  <h2 className="line-clamp-1 text-base font-bold text-slate-900">
                    {item.title}
                  </h2>

                  <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">
                    📍 {item.location}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    📅{" "}
                    {new Date(
                      item.date_occurred
                    ).toLocaleDateString("en-IN")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">

                    {item.category && (
                      <span className="max-w-full truncate rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                        {item.category}
                      </span>
                    )}

                    {item.brand && (
                      <span className="max-w-[45%] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        {item.brand}
                      </span>
                    )}

                    {item.color && (
                      <span className="max-w-[45%] truncate rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-semibold text-purple-700">
                        {item.color}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-semibold text-white transition group-hover:bg-blue-700">
                    View Details →
                  </div>

                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}