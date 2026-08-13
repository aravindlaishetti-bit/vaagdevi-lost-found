import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { ItemType } from "../types";
import clsx from "clsx";

export default function ReportItem() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<ItemType>("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateOccurred, setDateOccurred] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSubmitting(true);

    try {
      setStatus("Saving item…");
      const { data: item, error: insertErr } = await supabase
        .from("items")
        .insert({
          reporter_id: profile.id,
          type,
          title,
          description,
          location,
          date_occurred: dateOccurred,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      if (file) {
        setStatus("Uploading photo…");
        const path = `${profile.id}/${item.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("item-images").upload(path, file);
        if (uploadErr) throw uploadErr;

        await supabase.from("item_images").insert({ item_id: item.id, storage_path: path });

        setStatus("Running AI analysis (image recognition, OCR, color & match scoring)…");
        const { error: fnErr } = await supabase.functions.invoke("analyze-item", {
          body: { item_id: item.id },
        });
        if (fnErr) console.warn("AI analysis failed, item is still saved:", fnErr);
      }

      setStatus("Done!");
      navigate(`/items/${item.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
  <p className="mb-2 text-sm font-semibold uppercase tracking-widest opacity-90">
    🚀 CampusLost AI
  </p>

  <h1 className="text-4xl font-bold">
    Report Lost or Found Item
  </h1>

  <p className="mt-3 max-w-2xl text-blue-100">
    Upload a clear image. Our AI automatically detects the item's category,
    color, visible text, and finds similar lost or found reports across the campus.
  </p>
</div>

      <form
  onSubmit={handleSubmit}
  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6"
>
        <div className="flex gap-2">
          {(["lost", "found"] as ItemType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                "flex-1 rounded-lg border py-2.5 text-sm font-semibold capitalize",
                type === t ? "bg-brand-600 border-brand-600 text-white" : "border-slate-200 text-slate-600"
              )}
            >
              I {t === "lost" ? "lost" : "found"} something
            </button>
          ))}
        </div>

        <div>
          <label className="label">Title</label>
          <input
            required
            placeholder="e.g. Black Dell laptop bag"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            required
            rows={3}
            placeholder="Any details that help identify it — brand, contents, stickers, damage…"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Location on campus</label>
            <input
              required
              placeholder="e.g. Library, 2nd floor"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              required
              type="date"
              className="input"
              value={dateOccurred}
              onChange={(e) => setDateOccurred(e.target.value)}
            />
          </div>
        </div>

        <div>
  <label className="label mb-3 block">
    Upload Item Photo
  </label>

  <label
    className="
      flex flex-col items-center justify-center
      rounded-3xl border-2 border-dashed
      border-slate-300 bg-slate-50
      p-10 text-center
      cursor-pointer
      transition-all
      hover:border-blue-500
      hover:bg-blue-50
    "
  >
    <div className="mb-4 text-5xl">
      📸
    </div>

    <h3 className="text-lg font-semibold text-slate-800">
      Drop your image here
    </h3>

    <p className="mt-2 text-sm text-slate-500">
      or click to browse from your device
    </p>

    <p className="mt-3 text-xs text-slate-400">
      AI will analyze category, color & visible text
    </p>

    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        onFileChange(e.target.files?.[0] ?? null)
      }
      className="hidden"
    />
  </label>
</div>
{preview && (
  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
    <h3 className="mb-4 text-lg font-semibold text-slate-800">
      🤖 CampusLost AI Preview
    </h3>

    <img
      src={preview}
      alt="Uploaded item"
      className="h-64 w-full rounded-2xl object-cover"
    />
    {file && (
  <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3">
    <p className="truncate text-sm text-slate-600">
      📎 {file.name}
    </p>

    <button
      type="button"
      onClick={() => onFileChange(null)}
      className="text-sm font-semibold text-red-500 hover:text-red-700"
    >
      Remove
    </button>
  </div>
)}

    <div className="mt-4 grid gap-3 sm:grid-cols-2">

  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-500">
      Category
    </p>
    <p className="mt-1 font-semibold text-slate-800">
      🎒 Detecting...
    </p>
  </div>

  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-500">
      Color
    </p>
    <p className="mt-1 font-semibold text-slate-800">
      🎨 Detecting...
    </p>
  </div>

  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-500">
      Visible Text
    </p>
    <p className="mt-1 font-semibold text-slate-800">
      🔍 Scanning...
    </p>
  </div>

  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-500">
      Match Search
    </p>
    <p className="mt-1 font-semibold text-blue-600">
      🚀 Finding similar reports...
    </p>
  </div>

</div>
  </div>
)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && submitting && <p className="text-sm text-brand-600">{status}</p>}

        <button
  type="submit"
  disabled={submitting}
  className="
    w-full rounded-2xl
    bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
    py-4 text-lg font-bold text-white
    shadow-lg
    transition-all
    hover:scale-[1.02]
    hover:shadow-xl
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
>
  {submitting ? (
    "🤖 AI is analyzing..."
  ) : (
    "🚀 Submit Report"
  )}
</button>
      </form>
    </div>
  );
}
