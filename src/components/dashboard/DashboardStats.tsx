export default function DashboardStats() {
  const stats = [
    {
      title: "Lost Items",
      value: "245",
      icon: "📦",
      color: "bg-blue-50",
    },
    {
      title: "Found Items",
      value: "198",
      icon: "🎒",
      color: "bg-green-50",
    },
    {
      title: "AI Matches",
      value: "156",
      icon: "🤖",
      color: "bg-purple-50",
    },
    {
      title: "Success Rate",
      value: "96%",
      icon: "🎯",
      color: "bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
        >
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${stat.color}`}
          >
            {stat.icon}
          </div>

          <h3 className="text-3xl font-bold text-slate-900">
            {stat.value}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {stat.title}
          </p>
        </div>
      ))}
    </div>
  );
}