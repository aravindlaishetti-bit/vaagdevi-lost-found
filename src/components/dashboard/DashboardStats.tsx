import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

type Stat = {
  label: string;
  value: number;
  icon: string;
  description: string;
};

export default function DashboardStats() {
  const { profile } = useAuth();

  const [stats, setStats] = useState<Stat[]>([
    {
      label: "Lost Items",
      value: 0,
      icon: "🔴",
      description: "Items reported lost",
    },
    {
      label: "Found Items",
      value: 0,
      icon: "🟢",
      description: "Items reported found",
    },
    {
      label: "My Reports",
      value: 0,
      icon: "📋",
      description: "Your submitted reports",
    },
    {
      label: "Matches",
      value: 0,
      icon: "🤝",
      description: "AI suggested matches",
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadStats();
    }
  }, [profile?.id]);

  async function loadStats() {
    if (!profile?.id) return;

    setLoading(true);

    try {
      const [
        lostResult,
        foundResult,
        mineResult,
        matchesResult,
      ] = await Promise.all([
        supabase
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("type", "lost"),

        supabase
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("type", "found"),

        supabase
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("reporter_id", profile.id),

        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("status", "suggested"),
      ]);

      if (lostResult.error) {
        console.error(
          "LOST ITEMS COUNT ERROR:",
          lostResult.error
        );
      }

      if (foundResult.error) {
        console.error(
          "FOUND ITEMS COUNT ERROR:",
          foundResult.error
        );
      }

      if (mineResult.error) {
        console.error(
          "MY REPORTS COUNT ERROR:",
          mineResult.error
        );
      }

      if (matchesResult.error) {
        console.error(
          "MATCHES COUNT ERROR:",
          matchesResult.error
        );
      }

      setStats([
        {
          label: "Lost Items",
          value: lostResult.count ?? 0,
          icon: "🔴",
          description: "Items reported lost",
        },
        {
          label: "Found Items",
          value: foundResult.count ?? 0,
          icon: "🟢",
          description: "Items reported found",
        },
        {
          label: "My Reports",
          value: mineResult.count ?? 0,
          icon: "📋",
          description: "Your submitted reports",
        },
        {
          label: "Matches",
          value: matchesResult.count ?? 0,
          icon: "🤝",
          description: "AI suggested matches",
        },
      ]);
    } catch (error) {
      console.error("DASHBOARD STATS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">

      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5"
        >

          <div className="flex items-start justify-between gap-3">

            {/* ICON */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl transition group-hover:scale-105 sm:h-11 sm:w-11">
              {stat.icon}
            </div>

            {/* VALUE */}
            <div className="text-right">

              {loading ? (
                <div className="ml-auto h-7 w-10 animate-pulse rounded-md bg-slate-100" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {stat.value}
                </p>
              )}

            </div>

          </div>

          {/* LABEL */}
          <div className="mt-4">

            <p className="text-sm font-bold text-slate-800 sm:text-base">
              {stat.label}
            </p>

            <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">
              {stat.description}
            </p>

          </div>

        </div>
      ))}

    </section>
  );
}