import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Profile, Item } from "../types";

export default function AdminPanel() {
  const [tab, setTab] = useState<"overview" | "users" | "items">("overview");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "lost" | "found" | "closed">("all");

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

    const p = (profileData as Profile[]) ?? [];
    const it = (itemData as unknown as Item[]) ?? [];

    setProfiles(p);
    setItems(it);

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


  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" || item.type === filter || item.status === filter;

    return matchesSearch && matchesFilter;
  });


  return null;
}