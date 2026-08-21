import { Link } from "react-router-dom";
import { Item } from "../types";
import { supabase } from "../lib/supabaseClient";
import clsx from "clsx";
import { useEffect, useState } from "react";

export function ItemCard({ item }: { item: Item }) {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      const path = item.item_images?.[0]?.storage_path;

      if (!path) {
        setCover(null);
        return;
      }

      const { data, error } = await supabase.storage
        .from("item-images")
        .createSignedUrl(path, 60 * 10);

      if (error) {
        console.error("ITEM CARD IMAGE ERROR:", error);
        if (!cancelled) setCover(null);
        return;
      }

      if (!cancelled) {
        setCover(data.signedUrl);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [item.item_images]);

  const isLost = item.type === "lost";

  return (
    <Link
      to={`/items/${item.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* IMAGE */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              console.error("ITEM CARD IMAGE LOAD FAILED:", cover);
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl">
            📦
          </div>
        )}

        {/* LOST / FOUND */}
        <div
          className={clsx(
            "absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:text-xs",
            isLost
              ? "bg-red-500 text-white"
              : "bg-emerald-600 text-white"
          )}
        >
          {isLost ? "LOST" : "FOUND"}
        </div>

        {/* STATUS */}
        <div className="absolute right-2 top-2 max-w-[45%] truncate rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold capitalize text-slate-700 shadow-sm backdrop-blur sm:right-3 sm:top-3 sm:px-3 sm:text-xs">
          {item.status}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-3 sm:p-5">
        <h3 className="line-clamp-1 text-sm font-bold text-slate-900 sm:text-lg">
          {item.title}
        </h3>

        <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-500 sm:mt-2 sm:text-sm">
          📍 {item.location}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-500 sm:text-sm">
          📅{" "}
          {item.date_occurred
            ? new Date(item.date_occurred).toLocaleDateString("en-IN")
            : "Date unavailable"}
        </p>

        {item.category && (
          <div className="mt-2.5 sm:mt-4">
            <span className="inline-block max-w-full truncate rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700 sm:px-3 sm:text-xs">
              {item.category}
            </span>
          </div>
        )}

        {item.description && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-400 sm:mt-3 sm:text-xs">
            {item.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-5">
          <span className="text-[9px] text-slate-400 sm:text-xs">
            AI Analysis
          </span>

          <span className="shrink-0 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700 sm:px-3 sm:text-xs">
            ✨ Analyzed
          </span>
        </div>

        <div className="mt-3 w-full rounded-xl bg-brand-600 py-2 text-center text-[11px] font-semibold text-white transition group-hover:bg-brand-700 sm:mt-5 sm:py-2.5 sm:text-sm">
          View Details →
        </div>
      </div>
    </Link>
  );
}