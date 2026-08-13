export default function AISuggestions() {
  const suggestions = [
    {
      title: "Black Dell Laptop Bag",
      score: "95%",
      color: "bg-green-500",
      status: "Found near Library Block",
    },
    {
      title: "iPhone 15 Pro",
      score: "87%",
      color: "bg-blue-500",
      status: "Reported yesterday",
    },
    {
      title: "Titan Watch",
      score: "81%",
      color: "bg-orange-500",
      status: "Found in CSE Block",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          🤖 AI Suggestions
        </h2>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Smart Matching
        </span>
      </div>

      <div className="space-y-4">
        {suggestions.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">
                {item.title}
              </h3>

              <p className="text-sm text-slate-500">
                {item.status}
              </p>
            </div>

            <div
              className={`${item.color} rounded-full px-4 py-1 text-sm font-bold text-white`}
            >
              {item.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}