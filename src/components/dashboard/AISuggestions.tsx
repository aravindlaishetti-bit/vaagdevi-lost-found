import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { Item } from "../../types";

export default function AISuggestions() {
  const { profile } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadSuggestions();
    } else {
      setLoading(false);
    }
  }, [profile?.id]);

  async function loadSuggestions() {
    if (!profile?.id) return;

    setLoading(true);
    setImageUrls({});

    try {
      const { data: myItems, error: myItemsError } =
        await supabase
          .from("items")
          .select("id, type")
          .eq("reporter_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10);

      if (myItemsError) {
        console.error(
          "AI SUGGESTIONS MY ITEMS ERROR:",
          myItemsError
        );
        setItems([]);
        return;
      }

      if (!myItems || myItems.length === 0) {
        setItems([]);
        return;
      }

      const myItemIds = myItems.map((item) => item.id);

      const { data: matches, error: matchesError } =
        await supabase
          .from("matches")
          .select(
            `
            id,
            lost_item_id,
            found_item_id,
            similarity_score,
            status
          `
          )
          .or(
            `lost_item_id.in.(${myItemIds.join(",")}),found_item_id.in.(${myItemIds.join(",")})`
          )
          .order("similarity_score", {
            ascending: false,
          })
          .limit(6);

      if (matchesError) {
        console.error(
          "AI SUGGESTIONS MATCH ERROR:",
          matchesError
        );
        setItems([]);
        return;
      }

      if (!matches || matches.length === 0) {
        setItems([]);
        return;
      }

      const otherIds: string[] = [];

      for (const match of matches) {
        const isLostMine = myItemIds.includes(
          match.lost_item_id
        );

        const otherId = isLostMine
          ? match.found_item_id
          : match.lost_item_id;

        if (otherId && !otherIds.includes(otherId)) {
          otherIds.push(otherId);
        }
      }

      if (otherIds.length === 0) {
        setItems([]);
        return;
      }

      const {
        data: suggestionItems,
        error: suggestionError,
      } = await supabase
        .from("items")
        .select(
          "*, item_images(id, storage_path), profiles(full_name, department)"
        )
        .in("id", otherIds);

      if (suggestionError) {
        console.error(
          "AI SUGGESTION ITEMS ERROR:",
          suggestionError
        );
        setItems([]);
        return;
      }

      const orderedItems = otherIds
        .map((id) =>
          suggestionItems?.find(
            (item) => item.id === id
          )
        )
        .filter(Boolean) as Item[];

      const finalItems = orderedItems.slice(0, 4);

      const urlMap: Record<string, string> = {};

      for (const item of finalItems) {
        const path =
          item.item_images?.[0]?.storage_path;

        if (!path) continue;

        const {
          data: signedData,
          error: signedError,
        } = await supabase.storage
          .from("item-images")
          .createSignedUrl(path, 60 * 10);

        if (signedError) {
          console.error(
            "AI SUGGESTION IMAGE ERROR:",
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
      setItems(finalItems);
    } catch (error) {
      console.error(
        "AI SUGGESTIONS ERROR:",
        error
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>

      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-lg">
              🤖
            </div>

            <h2 className="font-display text-xl font-semibold text-slate-900">
              AI suggestions
            </h2>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            Possible matches based on your reports.
          </p>
        </div>

        <Link
          to="/search"
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
        >
          View campus board →
        </Link>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />

              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}

        </div>
      )}

      {/* EMPTY */}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">

          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              🤖
            </div>

            <div className="mt-4 sm:ml-4 sm:mt-0">

              <h3 className="text-sm font-bold text-slate-800">
                AI is ready to help
              </h3>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Report a lost or found item and our
                matching system will look for similar
                reports across campus.
              </p>

            </div>

            <Link
              to="/report"
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 sm:ml-auto sm:mt-0"
            >
              Report an item
            </Link>

          </div>

        </div>
      )}

      {/* SUGGESTIONS */}
      {!loading && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {items.map((item) => {
            const cover = imageUrls[item.id] ?? null;

            return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >

                {/* IMAGE */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">

                  {cover ? (
                    <img
                      src={cover}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() => {
                        console.error(
                          "AI IMAGE LOAD FAILED:",
                          item.id,
                          cover
                        );
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-slate-300">
                      📦
                    </div>
                  )}

                  <span
                    className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase text-white shadow-sm ${
                      item.type === "lost"
                        ? "bg-red-500"
                        : "bg-emerald-600"
                    }`}
                  >
                    {item.type}
                  </span>

                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-blue-700 shadow-sm backdrop-blur">
                    🤖 AI
                  </span>

                </div>

                {/* CONTENT */}
                <div className="p-4">

                  <h3 className="line-clamp-1 text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">
                    📍 {item.location}
                  </p>

                  <div className="mt-3 flex items-center justify-between">

                    {item.category ? (
                      <span className="max-w-[55%] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-semibold text-blue-700">
                        {item.category}
                      </span>
                    ) : (
                      <span />
                    )}

                    <span className="text-[10px] font-semibold text-blue-600">
                      View →
                    </span>

                  </div>

                </div>

              </Link>
            );
          })}

        </div>
      )}

    </section>
  );
}