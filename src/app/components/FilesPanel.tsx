"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";
import type { FileMeta } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "project-files";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function FilesPanel({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/files?project_id=${projectId}`);
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => {
    load();
  }, [projectId]);

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    const supabase = createClient();
    const failed: string[] = [];

    try {
      for (const file of Array.from(fileList)) {
        // Storage keys must be plain ASCII — keep the real name in the database instead.
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).replace(/[^\w.]/g, "") : "";
        const storagePath = `${projectId}/${crypto.randomUUID()}${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) {
          failed.push(`${file.name} (${upErr.message})`);
          continue;
        }

        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            original_name: file.name,
            storage_path: storagePath,
            size: file.size,
            mime_type: file.type,
          }),
        });
        if (!res.ok) {
          await supabase.storage.from(BUCKET).remove([storagePath]); // don't leave an orphan behind
          failed.push(file.name);
        }
      }
      if (failed.length) setError(`Could not upload: ${failed.join(", ")}`);
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <p className="text-xs flex items-center gap-1.5 mono uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        <FileText size={13} /> Files — quotation, architecture, anything
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-lg cursor-pointer transition-colors mb-3"
        style={{
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
          background: dragOver ? "var(--accent-dim)" : "var(--surface)",
        }}
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
        ) : (
          <Upload size={18} style={{ color: "var(--text-muted)" }} />
        )}
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {uploading ? "Uploading..." : "Tap or drop files here"}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs mb-3" style={{ color: "var(--danger)" }} role="alert">{error}</p>
      )}

      {files.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No files uploaded yet.</p>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md"
              style={{ background: "var(--surface-2)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={13} style={{ color: "var(--accent)" }} className="shrink-0" />
                <span className="truncate" style={{ color: "var(--text-primary)" }}>{f.original_name}</span>
                <span className="shrink-0 hidden sm:inline" style={{ color: "var(--text-muted)" }}>· {fmtSize(f.size)} · {fmtDate(f.uploaded_at)}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-2">
                <a href={`/api/files/${f.id}`} download style={{ color: "var(--accent)" }} className="flex items-center" aria-label="Download">
                  <Download size={15} />
                </a>
                <button onClick={() => remove(f.id)} style={{ color: "var(--danger)" }} className="flex items-center" aria-label="Delete file">
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
