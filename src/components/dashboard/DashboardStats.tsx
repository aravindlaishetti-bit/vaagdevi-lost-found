import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

type Stats = {
  lost: number;
  found: number;
  matches: number;
  claimed: number;
  total: number;
};

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    lost: 0,
    found: 0,
    matches: 0,
    claimed: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);

      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("type, status");

      if (itemsError) {
        console.error("Items stats error:", itemsError);
        return;
      }

      const { count: matchCount, error: matchesError } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

      if (matchesError) {
        console.error("Matches stats error:", matchesError);
      }

      const itemList = items ?? [];

      setStats({
        lost: itemList.filter((item) => item.type === "lost").length,
        found: itemList.filter((item) => item.type === "found").length,
        matches: matchCount ?? 0,
        claimed: itemList.filter((item) => item.status === "claimed").length,
        total: itemList.length,
      });
    } finally {
      setLoading(false);
    }
  }

  const successRate =
    stats.total > 0
      ? Math.round((stats.claimed / stats.total) * 100)
      : 0;

  const statCards = [
    {
      label: "Lost Items",
      value: stats.lost,
      icon: "📦",
      description: "Items reported lost",
    },
    {
      label: "Found Items",
      value: stats.found,
      icon: "🎒",
      description: "Items reported found",
    },
    {
      label: "AI Matches",
      value: stats.matches,
      icon: "🤖",
      description: "Possible matches detected",
    },
    {
      label: "Recovery Rate",
      value: successRate,
      suffix: "%",
      icon: "🎯",
      description: "Items successfully claimed",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
          }}
          whileHover={{
            y: -6,
            scale: 1.02,
          }}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-purple-500/20" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-xl shadow-lg">
                {stat.icon}
              </div>

              <span className="text-xs font-medium text-slate-400">
                LIVE
              </span>
            </div>

            <p className="text-sm font-medium text-slate-500">
              {stat.label}
            </p>

            <div className="mt-1 flex items-baseline gap-1">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.15 + 0.3 }}
                className="text-3xl font-bold tracking-tight text-slate-900"
              >
                {loading ? "—" : stat.value}
              </motion.span>

              {stat.suffix && (
                <span className="text-xl font-bold text-blue-600">
                  {stat.suffix}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {stat.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}