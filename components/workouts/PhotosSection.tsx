"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Trash2, Camera, X, ChevronLeft, ChevronRight, Columns2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadBodyPhotoAction, deleteBodyPhotoAction } from "@/app/actions/workouts";

interface Photo { id: string; storage_path: string; date: string; notes: string | null; url: string; }

export function PhotosSection({ photos: initial, today }: { photos: Photo[]; today: string }) {
  const [photos, setPhotos] = useState(initial);
  const [lightbox, setLightbox] = useState<number | null>(null); // index into photos
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadDate, setUploadDate] = useState(today);
  const [uploadNotes, setUploadNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setShowUpload(true);
  }

  function handleUpload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("date", uploadDate);
    fd.append("notes", uploadNotes);
    startTransition(async () => {
      const res = await uploadBodyPhotoAction(fd);
      if ("error" in res) { alert(res.error); return; }
      setPhotos((prev) => [{ id: res.id, storage_path: "", date: uploadDate, notes: uploadNotes || null, url: res.url }, ...prev]);
      setShowUpload(false); setPreview(null); setFile(null); setUploadDate(today); setUploadNotes("");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleDelete(photo: Photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (lightbox !== null) setLightbox(null);
    startTransition(() => deleteBodyPhotoAction(photo.id, photo.storage_path));
  }

  const lightboxPhoto = lightbox !== null ? photos[lightbox] : null;

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Progress Photos</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {photos.length} photo{photos.length !== 1 ? "s" : ""} · visual progress over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {photos.length >= 2 && (
            <button
              onClick={() => { setCompareMode((v) => !v); setCompareIds([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: compareMode ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${compareMode ? "rgba(96,165,250,0.35)" : "rgba(255,235,180,0.1)"}`, color: compareMode ? "#60A5FA" : "rgba(245,240,232,0.5)" }}>
              <Columns2 className="w-3.5 h-3.5" /> {compareMode ? "Cancel" : "Compare"}
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
            <Plus className="w-3.5 h-3.5" /> Add Photo
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && preview && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-5 rounded-2xl flex gap-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,144,10,0.2)" }}>
            <img src={preview} alt="preview" className="w-28 h-28 object-cover rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "rgba(245,240,232,0.35)" }}>Date</label>
                  <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
                    style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "rgba(245,240,232,0.35)" }}>Notes (optional)</label>
                <input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. After 8 weeks of training…"
                  className="w-full bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }} />
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={handleUpload} disabled={isPending}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-all"
                  style={{ background: "rgba(200,144,10,0.2)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
                  {isPending ? "Uploading…" : "Upload"}
                </button>
                <button onClick={() => { setShowUpload(false); setPreview(null); setFile(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Camera className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No progress photos yet</p>
          <button onClick={() => fileRef.current?.click()}
            className="text-xs px-4 py-2 rounded-xl transition-all"
            style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.2)", color: "rgba(200,144,10,0.8)" }}>
            Upload your first photo
          </button>
        </div>
      )}

      {/* Photo grid */}
      {/* Compare hint */}
      {compareMode && (
        <p className="text-xs mb-4" style={{ color: "rgba(96,165,250,0.7)" }}>
          {compareIds.length === 0 ? "Select 2 photos to compare" : compareIds.length === 1 ? "Select one more photo" : ""}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, i) => {
            const isSelected = compareIds.includes(photo.id);
            return (
              <button key={photo.id}
                onClick={() => compareMode ? toggleCompare(photo.id) : setLightbox(i)}
                className="group relative aspect-square rounded-2xl overflow-hidden transition-transform hover:scale-[1.02]"
                style={{ border: `1px solid ${isSelected ? "rgba(96,165,250,0.5)" : "rgba(255,235,180,0.07)"}`, outline: isSelected ? "2px solid rgba(96,165,250,0.4)" : "none" }}>
                {photo.url ? (
                  <img src={photo.url} alt={photo.notes ?? photo.date} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Camera className="w-6 h-6" style={{ color: "rgba(245,240,232,0.2)" }} />
                  </div>
                )}
                {compareMode && isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#60A5FA" }}>
                    <span className="text-[9px] font-bold text-white">{compareIds.indexOf(photo.id) + 1}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                  style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                  <p className="text-[10px] font-medium" style={{ color: "rgba(245,240,232,0.8)" }}>
                    {new Date(photo.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Side-by-side comparison view */}
      <AnimatePresence>
        {compareMode && compareIds.length === 2 && (() => {
          const [a, b] = compareIds.map((id) => photos.find((p) => p.id === id)!);
          return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="mt-6 rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.04)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(96,165,250,0.1)" }}>
                <p className="text-xs font-medium" style={{ color: "rgba(96,165,250,0.8)" }}>Side-by-side comparison</p>
                <button onClick={() => { setCompareIds([]); setCompareMode(false); }}>
                  <X className="w-4 h-4" style={{ color: "rgba(245,240,232,0.35)" }} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(96,165,250,0.1)" }}>
                {[a, b].map((photo) => (
                  <div key={photo.id} className="relative">
                    <img src={photo.url} alt={photo.notes ?? photo.date} className="w-full object-cover" style={{ maxHeight: "60vh" }} />
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                      <p className="text-xs font-medium" style={{ color: "#F5F0E8" }}>
                        {new Date(photo.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      {photo.notes && <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.5)" }}>{photo.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightbox(null)}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full flex flex-col gap-3">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>
                    {new Date(lightboxPhoto.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  {lightboxPhoto.notes && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.5)" }}>{lightboxPhoto.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(lightboxPhoto)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/15 transition-all">
                    <Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.7)" }} />
                  </button>
                  <button onClick={() => setLightbox(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all">
                    <X className="w-4 h-4" style={{ color: "rgba(245,240,232,0.5)" }} />
                  </button>
                </div>
              </div>

              {/* Image */}
              <img src={lightboxPhoto.url} alt={lightboxPhoto.notes ?? lightboxPhoto.date}
                className="w-full rounded-2xl object-contain max-h-[70vh]" />

              {/* Prev / Next */}
              {photos.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setLightbox((prev) => (prev! - 1 + photos.length) % photos.length)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                    style={{ color: "rgba(245,240,232,0.5)" }}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <p className="text-xs" style={{ color: "rgba(245,240,232,0.3)" }}>
                    {lightbox! + 1} / {photos.length}
                  </p>
                  <button
                    onClick={() => setLightbox((prev) => (prev! + 1) % photos.length)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                    style={{ color: "rgba(245,240,232,0.5)" }}>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
