import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Item, Match } from "../types";
import { ChatPanel } from "../components/ChatPanel";

function imageUrl(path: string) {
  return supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    const { data: itemData } = await supabase
      .from("items")
      .select("*, item_images(id, storage_path), profiles(full_name, department)")
      .eq("id", id)
      .single();
    setItem(itemData as unknown as Item);

    const col = itemData?.type === "lost" ? "lost_item_id" : "found_item_id";
    const { data: matchData } = await supabase
      .from("matches")
      .select(
  "*, lost_item:lost_item_id(id, reporter_id, title, type, location, date_occurred, status, item_images(storage_path)), found_item:found_item_id(id, reporter_id, title, type, location, date_occurred, status, item_images(storage_path))"
)
      .eq(col, id)
      .order("similarity_score", { ascending: false });
    setMatches((matchData as unknown as Match[]) ?? []);
  }

  async function rescan() {
    if (!item) return;
    setRescanning(true);
    await supabase.functions.invoke("compute-matches", { body: { item_id: item.id } });
    await load();
    setRescanning(false);
  }

 async function confirmMatch(matchId: string) {
  await supabase
    .from("matches")
    .update({ status: "confirmed" })
    .eq("id", matchId);

  const match = matches.find((m) => m.id === matchId);

  if (match) {
    const receiverId =
      item?.type === "lost"
        ? match.found_item?.reporter_id
        : match.lost_item?.reporter_id;

    if (receiverId) {
      await supabase.from("notifications").insert({
  user_id: receiverId,
  type: "match",
  title: "🎉 Match Found!",
  body: `A possible match was confirmed for "${item?.title}". Open the app to chat with the other user.`,
});
    }
  }

    setActiveMatchId(matchId);
  await load();
}

async function markAsReturned(match: Match) {
  await supabase
    .from("items")
    .update({ status: "closed" })
    .in("id", [match.lost_item_id, match.found_item_id]);

  await supabase
    .from("matches")
    .update({ status: "completed" })
    .eq("id", match.id);

  alert("✅ Item marked as returned!");

  await load();
}

  if (!item) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-slate-400">Loading…</div>;

  const isOwner = item.reporter_id === profile?.id;
  const cover = item.item_images?.[0]?.storage_path;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
          {cover ? (
            <img src={imageUrl(cover)} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full grid place-items-center text-4xl text-slate-300">📦</div>
          )}
        </div>
        <div>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase mb-2 ${
              item.type === "lost" ? "bg-ember/10 text-ember" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {item.type} item · {item.status}
          </span>
          <h1 className="font-display font-semibold text-2xl">{item.title}</h1>
          <p className="text-sm text-slate-600 mt-2">{item.description}</p>

          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-24">Location</dt>
              <dd>{item.location}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-24">Date</dt>
              <dd>{new Date(item.date_occurred).toLocaleDateString()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-24">Reported by</dt>
              <dd>{item.profiles?.full_name ?? "—"}</dd>
            </div>
          </dl>

          {item.ai_labels && (
            <div className="mt-4 rounded-lg bg-brand-50 border border-brand-100 p-3">
              <p className="text-xs font-semibold text-brand-700 mb-1.5">🤖 AI-detected attributes</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {item.category && <span className="rounded-full bg-white px-2 py-0.5 border">📁 {item.category}</span>}
                {item.color && <span className="rounded-full bg-white px-2 py-0.5 border">🎨 {item.color}</span>}
                {item.brand && <span className="rounded-full bg-white px-2 py-0.5 border">🏷️ {item.brand}</span>}
              </div>
            </div>
          )}

          {isOwner && (
            <button onClick={rescan} disabled={rescanning} className="btn-secondary mt-4">
              {rescanning ? "Scanning…" : "🔄 Re-scan for matches"}
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg mb-3">
          AI-suggested matches {matches.length > 0 && `(${matches.length})`}
        </h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">
            No candidate matches yet. This item is compared automatically against the opposite
            board (lost ↔ found) whenever a photo is analyzed.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const other = item.type === "lost" ? m.found_item : m.lost_item;
              if (!other) return null;
              const otherCover = other.item_images?.[0]?.storage_path;
              const pct = Math.round((m.similarity_score ?? 0) * 100);
              return (
                <div key={m.id} className="card p-3 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {otherCover ? (
                      <img src={imageUrl(otherCover)} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full grid place-items-center text-slate-300">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{other.title}</p>
                    <p className="text-xs text-slate-500">
                      {other.location} · {new Date(other.date_occurred).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand-600">{pct}% match</div>
                    <div className="mt-2 text-xs text-slate-500 space-y-1">
  <p>🤖 AI Match Reasons</p>
  <p>✓ Same location</p>
  <p>✓ Similar item details</p>
  <p>✓ Image similarity detected</p>
</div>
                    {m.status === "confirmed" ? (
                      <div className="flex flex-col gap-2">
  <button
  onClick={() => setActiveMatchId(m.id)}
  className="text-xs text-blue-600 font-semibold"
>
  💬 Open Chat
</button>

  <button
    onClick={() => markAsReturned(m)}
    className="text-xs text-green-600 font-semibold"
  >
    ✅ Mark as Returned
  </button>
</div>
                    ) : (
                      <button onClick={() => confirmMatch(m.id)} className="text-xs text-brand-600 font-semibold">
                        Confirm &amp; message
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeMatchId && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Secure messaging</h2>
          <ChatPanel matchId={activeMatchId} />
        </div>
      )}
    </div>
  );
}
