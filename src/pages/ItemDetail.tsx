import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Item, Match } from "../types";
import { ChatPanel } from "../components/ChatPanel";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [matchImageUrls, setMatchImageUrls] =
    useState<Record<string, string>>({});
  const [activeMatchId, setActiveMatchId] =
    useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      load();
    }
  }, [id]);

  async function createSignedUrl(path?: string) {
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from("item-images")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      console.error("SIGNED IMAGE URL ERROR:", error);
      return null;
    }

    return data?.signedUrl ?? null;
  }

  async function load() {
    if (!id) return;

    setLoading(true);

    const { data: itemData, error: itemError } =
      await supabase
        .from("items")
        .select(
          "*, item_images(id, storage_path), profiles(full_name, department)"
        )
        .eq("id", id)
        .single();

    if (itemError) {
      console.error("ITEM DETAIL LOAD ERROR:", itemError);
      setItem(null);
      setLoading(false);
      return;
    }

    const loadedItem = itemData as unknown as Item;

    setItem(loadedItem);

    /* MAIN IMAGE */
    const mainPath =
      loadedItem.item_images?.[0]?.storage_path;

    if (mainPath) {
      const signedUrl = await createSignedUrl(mainPath);
      setCoverUrl(signedUrl);
    } else {
      setCoverUrl(null);
    }

    /* MATCHES */
    const column =
      loadedItem.type === "lost"
        ? "lost_item_id"
        : "found_item_id";

    const { data: matchData, error: matchError } =
      await supabase
        .from("matches")
        .select(
          `
          *,
          lost_item:lost_item_id(
            id,
            reporter_id,
            title,
            type,
            location,
            date_occurred,
            status,
            item_images(storage_path)
          ),
          found_item:found_item_id(
            id,
            reporter_id,
            title,
            type,
            location,
            date_occurred,
            status,
            item_images(storage_path)
          )
        `
        )
        .eq(column, id)
        .order("similarity_score", {
          ascending: false,
        });

    if (matchError) {
      console.error("MATCH LOAD ERROR:", matchError);
      setMatches([]);
      setMatchImageUrls({});
    } else {
      const loadedMatches =
        (matchData as unknown as Match[]) ?? [];

      setMatches(loadedMatches);

      const imageMap: Record<string, string> = {};

      for (const match of loadedMatches) {
        const other =
          loadedItem.type === "lost"
            ? match.found_item
            : match.lost_item;

        const path =
          other?.item_images?.[0]?.storage_path;

        if (!other?.id || !path) continue;

        const signedUrl = await createSignedUrl(path);

        if (signedUrl) {
          imageMap[other.id] = signedUrl;
        }
      }

      setMatchImageUrls(imageMap);
    }

    setLoading(false);
  }

  async function rescan() {
    if (!item || rescanning) return;

    setRescanning(true);

    const { error } =
      await supabase.functions.invoke(
        "compute-matches",
        {
          body: {
            item_id: item.id,
          },
        }
      );

    if (error) {
      console.error("RESCAN ERROR:", error);

      alert(
        "Unable to rescan matches.\n\n" +
          error.message
      );

      setRescanning(false);
      return;
    }

    await load();

    setRescanning(false);
  }

  async function confirmMatch(matchId: string) {
    if (!item) return;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "confirmed",
      })
      .eq("id", matchId);

    if (error) {
      console.error("CONFIRM MATCH ERROR:", error);

      alert(
        "Unable to confirm this match.\n\n" +
          error.message
      );

      return;
    }

    const match = matches.find(
      (currentMatch) =>
        currentMatch.id === matchId
    );

    if (match) {
      const receiverId =
        item.type === "lost"
          ? match.found_item?.reporter_id
          : match.lost_item?.reporter_id;

      if (receiverId) {
        const {
          error: notificationError,
        } = await supabase
          .from("notifications")
          .insert({
            user_id: receiverId,
            type: "match_found",
            title: "🎉 Match Found!",
            body: `A possible match was confirmed for "${item.title}". Open the app to chat with the other user.`,
            link_item_id: item.id,
            is_read: false,
          });

        if (notificationError) {
          console.error(
            "MATCH NOTIFICATION ERROR:",
            notificationError
          );
        }
      }
    }

    setActiveMatchId(matchId);

    await load();
  }

  async function markAsReturned(match: Match) {
    if (!item) return;

    const confirmed = window.confirm(
      "Are you sure this item has been returned to its owner?"
    );

    if (!confirmed) return;

    const { error: itemError } =
      await supabase
        .from("items")
        .update({
          status: "closed",
        })
        .in("id", [
          match.lost_item_id,
          match.found_item_id,
        ]);

    if (itemError) {
      console.error(
        "MARK RETURNED ITEM ERROR:",
        itemError
      );

      alert(
        "Unable to mark the item as returned.\n\n" +
          itemError.message
      );

      return;
    }

    const { error: matchError } =
      await supabase
        .from("matches")
        .update({
          status: "completed",
        })
        .eq("id", match.id);

    if (matchError) {
      console.error(
        "COMPLETE MATCH ERROR:",
        matchError
      );

      alert(
        "Item was closed, but match status could not be updated.\n\n" +
          matchError.message
      );

      await load();
      return;
    }

    const otherUserId =
      item.type === "lost"
        ? match.found_item?.reporter_id
        : match.lost_item?.reporter_id;

    if (otherUserId) {
      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert({
          user_id: otherUserId,
          type: "status_change",
          title: "✅ Item Returned",
          body: `"${item.title}" has been marked as returned.`,
          link_item_id: item.id,
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "RETURN NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    alert("✅ Item marked as returned!");

    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm text-slate-500">
            Loading item details...
          </p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="text-5xl">📦</div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Item not found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            This report may have been removed or is no
            longer available.
          </p>
        </div>
      </div>
    );
  }

  const isOwner =
    item.reporter_id === profile?.id;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-3 py-5 sm:px-4 sm:py-8">

      {/* ITEM OVERVIEW */}
      <section className="grid gap-5 sm:grid-cols-2">

        {/* IMAGE */}
        <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
          <div className="aspect-[4/3]">

            {coverUrl ? (
              <img
                src={coverUrl}
                alt={item.title}
                className="h-full w-full object-cover"
                onError={() => {
                  console.error(
                    "DETAIL MAIN IMAGE FAILED:",
                    coverUrl
                  );
                  setCoverUrl(null);
                }}
              />
            ) : (
              <div className="grid h-full place-items-center text-5xl text-slate-300">
                📦
              </div>
            )}

          </div>
        </div>

        {/* DETAILS */}
        <div className="min-w-0">

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              item.type === "lost"
                ? "bg-red-50 text-red-600"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {item.type} item · {item.status}
          </span>

          <h1 className="mt-3 break-words font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
            {item.title}
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-slate-600">
            {item.description}
          </p>

          <dl className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">

            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-slate-400">
                Location
              </dt>

              <dd className="min-w-0 break-words font-medium text-slate-700">
                {item.location}
              </dd>
            </div>

            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-slate-400">
                Date
              </dt>

              <dd className="font-medium text-slate-700">
                {new Date(
                  item.date_occurred
                ).toLocaleDateString("en-IN")}
              </dd>
            </div>

            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-slate-400">
                Reported by
              </dt>

              <dd className="min-w-0 break-words font-medium text-slate-700">
                {item.profiles?.full_name ?? "—"}
              </dd>
            </div>

            {item.category && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-slate-400">
                  Category
                </dt>

                <dd className="min-w-0 break-words font-medium text-slate-700">
                  {item.category}
                </dd>
              </div>
            )}

            {item.color && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-slate-400">
                  Color
                </dt>

                <dd className="min-w-0 break-words font-medium text-slate-700">
                  {item.color}
                </dd>
              </div>
            )}

            {item.brand && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-slate-400">
                  Brand
                </dt>

                <dd className="min-w-0 break-words font-medium text-slate-700">
                  {item.brand}
                </dd>
              </div>
            )}

          </dl>

          {/* AI ATTRIBUTES */}
          {item.ai_labels && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">
                🤖 AI-detected attributes
              </p>

              <div className="flex flex-wrap gap-2">

                {item.category && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                    📁 {item.category}
                  </span>
                )}

                {item.color && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                    🎨 {item.color}
                  </span>
                )}

                {item.brand && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                    🏷️ {item.brand}
                  </span>
                )}

                {item.ai_labels.primary_color && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                    🎨 AI Color:{" "}
                    {item.ai_labels.primary_color}
                  </span>
                )}

                {item.ai_labels.brand_or_text && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                    🔤{" "}
                    {item.ai_labels.brand_or_text}
                  </span>
                )}

              </div>
            </div>
          )}

          {/* RESCAN */}
          {isOwner && item.status !== "closed" && (
            <button
              onClick={rescan}
              disabled={rescanning}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {rescanning
                ? "🔄 Scanning..."
                : "🔄 Re-scan for matches"}
            </button>
          )}

        </div>
      </section>

      {/* MATCHES */}
      <section>

        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            AI-suggested matches
            {matches.length > 0 &&
              ` (${matches.length})`}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Possible matches detected by Vaagdevi Lost &
            Found AI.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 text-center">

            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
              🤖
            </div>

            <p className="mt-4 font-semibold text-slate-800">
              No candidate matches yet
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              This item will automatically be compared
              with opposite-board reports whenever AI
              analysis is performed.
            </p>

          </div>
        ) : (
          <div className="space-y-4">

            {matches.map((match) => {

              const other =
                item.type === "lost"
                  ? match.found_item
                  : match.lost_item;

              if (!other) return null;

              const otherImage =
                other.id
                  ? matchImageUrls[other.id]
                  : null;

              const percentage = Math.round(
                (match.similarity_score ?? 0) * 100
              );

              const confidence = Math.min(
                Math.max(percentage, 0),
                100
              );

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >

                  {/* MATCH ITEM */}
                  <div className="flex items-start gap-3">

                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20">

                      {otherImage ? (
                        <img
                          src={otherImage}
                          alt={other.title}
                          className="h-full w-full object-cover"
                          onError={() => {
                            console.error(
                              "MATCH IMAGE FAILED:",
                              otherImage
                            );
                          }}
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xl text-slate-300">
                          📦
                        </div>
                      )}

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="break-words text-sm font-semibold text-slate-900 sm:text-base">
                        {other.title}
                      </p>

                      <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                        📍 {other.location}
                      </p>

                      <p className="text-xs text-slate-500">
                        📅{" "}
                        {new Date(
                          other.date_occurred
                        ).toLocaleDateString("en-IN")}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                          match.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : match.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {match.status}
                      </span>

                    </div>
                  </div>

                  {/* SCORE */}
                  <div className="mt-4 rounded-xl bg-blue-50 p-3">

                    <div className="flex items-center justify-between gap-3">

                      <span className="text-xs font-semibold text-blue-700">
                        🤖 AI Match Confidence
                      </span>

                      <span className="text-lg font-bold text-blue-700">
                        {confidence}%
                      </span>

                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{
                          width: `${confidence}%`,
                        }}
                      />

                    </div>
                  </div>

                  {/* AI REASONS */}
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">

                    <p className="text-xs font-semibold text-slate-600">
                      🤖 AI Match Reasons
                    </p>

                    <div className="mt-2 grid gap-1 text-xs text-slate-500">
                      <p>✓ Similar item details</p>
                      <p>✓ Location comparison performed</p>
                      <p>✓ Image/semantic similarity analyzed</p>
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4">

                    {match.status === "confirmed" ? (
                      <div className="grid gap-2 sm:flex sm:flex-wrap">

                        <button
                          onClick={() =>
                            setActiveMatchId(match.id)
                          }
                          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                        >
                          💬 Open Chat
                        </button>

                        <button
                          onClick={() =>
                            markAsReturned(match)
                          }
                          disabled={
                            item.status === "closed"
                          }
                          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          ✅ Mark as Returned
                        </button>

                      </div>
                    ) : match.status === "completed" ? (
                      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                        ✅ Item successfully returned
                      </div>
                    ) : match.status === "rejected" ? (
                      <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
                        ❌ Match rejected
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          confirmMatch(match.id)
                        }
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                      >
                        🤝 Confirm & Message
                      </button>
                    )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* CHAT */}
      {activeMatchId && (
        <section>

          <h2 className="mb-3 font-display text-xl font-semibold text-slate-900">
            Secure messaging
          </h2>

          <div className="w-full overflow-hidden rounded-2xl">
            <ChatPanel matchId={activeMatchId} />
          </div>

        </section>
      )}

    </div>
  );
}