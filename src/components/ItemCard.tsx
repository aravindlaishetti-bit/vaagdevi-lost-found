import { Link } from "react-router-dom";
import { Item } from "../types";
import { supabase } from "../lib/supabaseClient";
import clsx from "clsx";

function imageUrl(path?: string) {
  if (!path) return null;
  return supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
}

export function ItemCard({ item }: { item: Item }) {
  const cover = item.item_images?.[0]?.storage_path
    ? imageUrl(item.item_images[0].storage_path)
    : null;

  return (
    <Link
      to={`/items/${item.id}`}
      className="group overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            📦
          </div>
        )}

        {/* Lost / Found Badge */}
        <div
          className={clsx(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-md",
            item.type === "lost"
              ? "bg-red-500 text-white"
              : "bg-green-600 text-white"
          )}
        >
          {item.type.toUpperCase()}
        </div>

        {/* Status */}
        <div className="absolute right-3 top-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold capitalize shadow">
          {item.status}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">

        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
          {item.title}
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          📍 {item.location}
        </p>

        <p className="text-sm text-slate-500">
          📅 {new Date(item.date_occurred).toLocaleDateString()}
        </p>

        {item.category && (
          <div className="mt-4">
            <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
              {item.category}
            </span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">

          <span className="text-xs text-slate-400">
            AI Confidence
          </span>

          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
            95%
          </span>

        </div>

        <button className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">
          View Details →
        </button>

      </div>
    </Link>
  );
}