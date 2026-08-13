import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Profile, Item } from "../types";

export default function AdminPanel() {
  const [tab, setTab] = useState<
    "overview" | "users" | "items" | "matches"
  >("overview");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "lost" | "found" | "closed"
  >("all");

  const [stats, setStats] = useState({
    total: 0,
    lost: 0,
    found: 0,
    claimed: 0,
    users: 0,
    pending: 0,
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: itemData } = await supabase
      .from("items")
      .select("*, profiles(full_name, department)")
      .order("created_at", { ascending: false });

    const { data: matchData } = await supabase
      .from("matches")
      .select(`
        *,
        lost_item:lost_item_id(title),
        found_item:found_item_id(title)
      `)
      .order("created_at", { ascending: false });

    const p = (profileData as Profile[]) ?? [];
    const it = (itemData as unknown as Item[]) ?? [];

    setProfiles(p);
    setItems(it);
    setMatches(matchData ?? []);

    setStats({
      total: it.length,
      lost: it.filter((i) => i.type === "lost").length,
      found: it.filter((i) => i.type === "found").length,
      claimed: it.filter((i) => i.status === "claimed").length,
      users: p.length,
      pending: p.filter((u) => !u.is_verified).length,
    });
  }

  async function toggleVerify(userId: string, verified: boolean) {
    await supabase
      .from("profiles")
      .update({ is_verified: verified })
      .eq("id", userId);

    loadAll();
  }

  async function closeItem(itemId: string) {
    await supabase
      .from("items")
      .update({ status: "closed" })
      .eq("id", itemId);

    loadAll();
  }

  const filteredItems = items.filter((i) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "closed"
        ? i.status === "closed"
        : i.type === filter;

    const matchesSearch = search.trim()
      ? (
          i.title +
          " " +
          i.description +
          " " +
          (i.category ?? "")
        )
          .toLowerCase()
          .includes(search.toLowerCase())
      : true;

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold mb-2">
        Admin Panel
      </h1>

      <p className="text-slate-500 mb-6">
        User verification, moderation and analytics.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {(["overview", "users", "items", "matches"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg capitalize ${
              tab === t
                ? "bg-brand-600 text-white"
                : "border border-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ["Total Reports", stats.total],
            ["Lost Items", stats.lost],
            ["Found Items", stats.found],
            ["Claimed", stats.claimed],
            ["Users", stats.users],
            ["Pending", stats.pending],
          ].map(([label, value]) => (
            <div key={label as string} className="card p-4">
              <p className="text-2xl font-bold text-brand-700">
                {value}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">{p.full_name}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3 capitalize">
                    {p.role}
                  </td>

                  <td className="px-4 py-3">
                    {p.is_verified ? "Verified" : "Pending"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        toggleVerify(p.id, !p.is_verified)
                      }
                      className="text-brand-600 font-semibold"
                    >
                      {p.is_verified ? "Revoke" : "Verify"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
            {tab === "items" && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 flex-1"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as "all" | "lost" | "found" | "closed"
                )
              }
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Reporter</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-6 text-slate-400"
                    >
                      No items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="px-4 py-3">{i.title}</td>
                      <td className="px-4 py-3 capitalize">{i.type}</td>
                      <td className="px-4 py-3">
                        {i.profiles?.full_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {i.status}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {i.status !== "closed" && (
                          <button
                            onClick={() => closeItem(i.id)}
                            className="text-red-600 font-semibold"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "matches" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Lost Item</th>
                <th className="text-left px-4 py-3">Found Item</th>
                <th className="text-left px-4 py-3">Match %</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-6 text-slate-400"
                  >
                    No matches found.
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-3">
                      {m.lost_item?.title ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {m.found_item?.title ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-blue-600 font-semibold">
                      {Math.round((m.similarity_score ?? 0) * 100)}%
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {m.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}