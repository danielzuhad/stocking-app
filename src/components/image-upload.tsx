"use client";

import { Image } from "@imagekit/next";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  maxSizeMB?: number;
}

export default function ImageUploadField({ maxSizeMB = 5 }: ImageUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size exceeds ${maxSizeMB}MB`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const data = new FormData();
    data.set("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: data });
    const json = await res.json();
    setUploading(false);

    if (!res.ok) {
      toast.error(json.error || "Upload failed");
      return;
    }

    setUploadedUrl(json.url);
  };

  const handleDelete = () => {
    setPreview(null);
    setUploadedUrl(null);
  };

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        Upload Image <Upload size={18} />
      </h2>

      {!uploadedUrl ? (
        <label className="block cursor-pointer rounded border-2 border-dashed border-gray-300 p-4 text-center">
          {uploading ? "Uploading..." : "Drag or Click to Upload"}
          <input type="file" className="hidden" onChange={handleFile} accept="image/*" />
        </label>
      ) : (
        <div className="relative h-40 w-40">
          <Image
            src={uploadedUrl}
            width={160}
            height={160}
            alt="Uploaded"
            className="rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {preview && !uploadedUrl && (
        <img src={preview} alt="Preview" className="h-40 w-40 rounded-lg object-cover" />
      )}
    </div>
  );
}
