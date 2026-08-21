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
  const [dateOccurred, setDateOccurred] = useState(
    new Date().toISOString().slice(0, 10)
  );
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
    setStatus(null);
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

        const { error: uploadErr } = await supabase.storage
          .from("item-images")
          .upload(path, file);

        if (uploadErr) throw uploadErr;

        await supabase.from("item_images").insert({
          item_id: item.id,
          storage_path: path,
        });

        setStatus(
          "Running AI analysis (image recognition, OCR, color & match scoring)…"
        );

        const { error: fnErr } = await supabase.functions.invoke(
          "analyze-item",
          {
            body: { item_id: item.id },
          }
        );

        if (fnErr) {
          console.warn(
            "AI analysis failed, item is still saved:",
            fnErr
          );
        }
      }

      setStatus("Done!");

      navigate(`/items/${item.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-8">

      {/* PAGE HERO */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white shadow-xl sm:mb-8 sm:rounded-3xl sm:p-8">

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-90 sm:text-sm sm:tracking-widest">
          🚀 Vaagdevi Lost & Found AI
        </p>

        <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
          Report Lost or Found Item
        </h1>

        <p className="mt-3 max-w-2xl text-xs leading-5 text-blue-100 sm:text-base sm:leading-6">
          Upload a clear image. Our AI automatically detects the item's
          category, color, visible text, and finds similar lost or found
          reports across Vaagdevi College.
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:space-y-6 sm:rounded-3xl sm:p-8"
      >

        {/* TYPE */}
        <div>
          <label className="label mb-2 block">
            What happened?
          </label>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">

            {(["lost", "found"] as ItemType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={clsx(
                  "min-h-[48px] rounded-xl border px-2 py-3 text-xs font-semibold transition-all sm:rounded-xl sm:text-sm",
                  type === t
                    ? "border-brand-600 bg-brand-600 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {t === "lost"
                  ? "🔍 I lost something"
                  : "🎒 I found something"}
              </button>
            ))}

          </div>
        </div>

        {/* TITLE */}
        <div>
          <label className="label">
            Item Title
          </label>

          <input
            required
            placeholder="e.g. Black Dell laptop bag"
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="label">
            Description
          </label>

          <textarea
            required
            rows={4}
            placeholder="Brand, color, stickers, damage, contents, unique marks..."
            className="input w-full resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* LOCATION + DATE */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <label className="label">
              Location on campus
            </label>

            <input
              required
              placeholder="e.g. Library, 2nd floor"
              className="input w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="label">
              Date
            </label>

            <input
              required
              type="date"
              className="input w-full"
              value={dateOccurred}
              onChange={(e) =>
                setDateOccurred(e.target.value)
              }
            />
          </div>

        </div>

        {/* PHOTO UPLOAD */}
        <div>

          <label className="label mb-3 block">
            Upload Item Photo
          </label>

          <label
            className="
              flex min-h-[190px]
              cursor-pointer flex-col
              items-center justify-center
              rounded-2xl border-2 border-dashed
              border-slate-300
              bg-slate-50
              px-4 py-8
              text-center
              transition-all
              hover:border-blue-500
              hover:bg-blue-50
              sm:min-h-[240px]
              sm:rounded-3xl
              sm:p-10
            "
          >

            <div className="mb-3 text-4xl sm:mb-4 sm:text-5xl">
              📸
            </div>

            <h3 className="text-base font-semibold text-slate-800 sm:text-lg">
              Upload your item image
            </h3>

            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Tap here to choose a photo from your phone
            </p>

            <p className="mt-3 text-[10px] text-slate-400 sm:text-xs">
              AI analyzes category, color & visible text
            </p>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) =>
                onFileChange(
                  e.target.files?.[0] ?? null
                )
              }
              className="hidden"
            />

          </label>
        </div>

        {/* PREVIEW */}
        {preview && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:rounded-3xl sm:p-5">

            <div className="mb-4 flex items-center justify-between gap-3">

              <h3 className="text-base font-semibold text-slate-800 sm:text-lg">
                🤖 AI Photo Preview
              </h3>

              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 sm:text-sm"
              >
                Remove
              </button>

            </div>

            <img
              src={preview}
              alt="Uploaded item"
              className="h-52 w-full rounded-xl object-cover sm:h-72 sm:rounded-2xl"
            />

            {file && (
              <div className="mt-3 rounded-xl bg-white p-3">
                <p className="truncate text-xs text-slate-600 sm:text-sm">
                  📎 {file.name}
                </p>
              </div>
            )}

            {/* AI DETAILS */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[11px] text-slate-500">
                  Category
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  🎒 Detecting...
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[11px] text-slate-500">
                  Color
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  🎨 Detecting...
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[11px] text-slate-500">
                  Visible Text
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  🔍 Scanning...
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[11px] text-slate-500">
                  Match Search
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-600">
                  🚀 Finding similar reports...
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 sm:text-sm">
            {error}
          </div>
        )}

        {/* STATUS */}
        {status && submitting && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-brand-600 sm:text-sm">
            {status}
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={submitting}
          className="
            min-h-[52px]
            w-full
            rounded-xl
            bg-gradient-to-r
            from-blue-600
            via-indigo-600
            to-purple-600
            px-4
            py-3
            text-sm
            font-bold
            text-white
            shadow-lg
            transition-all
            hover:scale-[1.01]
            hover:shadow-xl
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-60
            sm:min-h-[58px]
            sm:rounded-2xl
            sm:text-lg
          "
        >
          {submitting
            ? "🤖 AI is analyzing..."
            : "🚀 Submit Report"}
        </button>

      </form>
    </div>
  );
}