import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Match } from "../../types";

type ItemSideProps = {
  item: NonNullable<Match["lost_item"]>;
  side: "lost" | "found";
};

function imageUrl(path?: string) {
  if (!path) return null;

  return supabase.storage
    .from("item-images")
    .getPublicUrl(path).data.publicUrl;
}

function confidence(score: number) {
  if (score <= 1) {
    return Math.round(score * 100);
  }

  return Math.round(score);
}

function ItemSide({ item, side }: ItemSideProps) {
  const image = imageUrl(item.item_images?.[0]?.storage_path);

  return (
    <Link
      to={`/items/${item.id}`}
      className={`group/item flex items-center gap-3 ${
        side === "found" ? "md:justify-end md:text-right" : ""
      }`}
    >
      {side === "lost" && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
          {image ? (
            <img
              src={image}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
            />
          ) : (
            <div className="grid h-full place-items-center text-xl">
              📦
            </div>
          )}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {side === "lost" ? "Lost Item" : "Found Item"}
        </p>

        <p className="mt-1 truncate font-semibold text-slate-900">
          {item.title}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          📍 {item.location}
        </p>
      </div>

      {side === "found" && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
          {image ? (
            <img
              src={image}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
            />
          ) : (
            <div className="grid h-full place-items-center text-xl">
              🎒
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

export default function AISuggestions() {
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        lost_item_id,
        found_item_id,
        similarity_score,
        status,
        lost_item:items!matches_lost_item_id_fkey(
          id,
          reporter_id,
          title,
          type,
          location,
          date_occurred,
          status,
          item_images(storage_path)
        ),
        found_item:items!matches_found_item_id_fkey(
          id,
          reporter_id,
          title,
          type,
          location,
          date_occurred,
          status,
          item_images(storage_path)
        )
      `)
      .order("similarity_score", { ascending: false })
      .limit(5);

    if (error) {
      console.error("AI matches error:", error);
      setMatches([]);
    } else {
      setMatches((data as unknown as Match[]) ?? []);
    }

    setLoading(false);
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">

      {/* Background glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

      {/* HEADER */}
      <div className="relative mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
              🤖
            </span>

            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
              AI Matching Engine
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Smart matches
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            CampusLost AI analyzes reported items and discovers possible
            lost and found matches automatically.
          </p>
        </div>

        {/* AI STATUS */}
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 md:self-auto">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

          <span className="text-xs font-semibold text-slate-500">
            AI Engine Online
          </span>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>
      )}

      {/* NO MATCHES */}
      {!loading && matches.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
            🤖
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No AI matches yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Report a lost or found item. When similar reports are available,
            CampusLost AI will automatically suggest possible matches here.
          </p>

          <Link
            to="/report"
            className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Report an Item →
          </Link>
        </div>
      )}

      {/* MATCHES */}
      {!loading && matches.length > 0 && (
        <div className="space-y-4">

          {matches.map((match, index) => {
            const lost = match.lost_item;
            const found = match.found_item;

            if (!lost || !found) {
              return null;
            }

            const score = confidence(match.similarity_score);

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-5"
              >

                <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">

                  {/* LOST */}
                  <ItemSide
                    item={lost}
                    side="lost"
                  />

                  {/* AI MATCH */}
                  <div className="flex items-center justify-center md:flex-col">

                    <div className="hidden h-px w-12 bg-gradient-to-r from-blue-500 to-purple-500 md:block" />

                    <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 shadow-sm">
                      <span className="text-xs font-bold text-blue-600">
                        🤖 {score}% Match
                      </span>
                    </div>

                    <div className="hidden h-px w-12 bg-gradient-to-r from-purple-500 to-blue-500 md:block" />
                  </div>

                  {/* FOUND */}
                  <ItemSide
                    item={found}
                    side="found"
                  />
                </div>

                {/* CONFIDENCE */}
                <div className="mt-5 border-t border-slate-100 pt-4">

                  <div className="flex items-center gap-3">

                    <span className="shrink-0 text-[10px] font-medium text-slate-400">
                      AI Confidence
                    </span>

                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">

                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{
                          duration: 0.8,
                          delay: index * 0.08,
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />

                    </div>

                    <span className="text-xs font-bold text-slate-700">
                      {score}%
                    </span>

                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

        <p className="text-xs text-slate-400">
          Powered by Vaagdevi Lost & Found AI
        </p>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs font-semibold text-blue-600 transition-colors hover:text-purple-600"
          >
            View dashboard →
          </button>
        )}

      </div>

    </section>
  );
}