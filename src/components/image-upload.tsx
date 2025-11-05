"use client";

import { Button } from "@/components/ui/button";
import { cn, handleErrorToast } from "@/lib/utils";
import {
  buildSrc,
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";

type ImageUploadProps = {
  maxSizeMB?: number;
  initialUrl: string | null | undefined;
  onChange?: (value: { url: string; fileId?: string } | null) => void;
  className?: string;
  isOptional?: boolean;
};

export default function ImageUpload({
  maxSizeMB = 5,
  initialUrl,
  onChange,
  className,
  isOptional = true,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl ?? null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true); // NEW

  const hasImage = !!uploadedUrl || !!previewUrl;
  const blurUrl = uploadedUrl
    ? buildSrc({
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
        src: uploadedUrl.replace(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!, ""),
        transformation: [{ quality: 10, blur: 50 }],
      })
    : null;

  const getAuth = useCallback(async () => {
    const res = await fetch("/api/upload-auth", { cache: "no-store" });
    if (!res.ok) throw new Error(`Auth failed (${res.status})`);
    return res.json(); // { signature, expire, token, publicKey }
  }, []);

  const validateFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File exceeds ${maxSizeMB} MB.`);
    }
  };

  const doUpload = useCallback(
    async (file: File) => {
      validateFile(file);

      // reset state jika ada file sebelumnya (replace)
      if (uploadedUrl && fileId) {
        // opsional: hapus file lama di server
        try {
          await fetch("/api/delete-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId }),
          });
        } catch {
          // silent fail; tidak wajib blokir UX
        }
      }

      setIsUploading(true);
      setProgress(0);
      setPreviewUrl(URL.createObjectURL(file));

      const { signature, expire, token, publicKey } = await getAuth();
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await upload({
          file,
          fileName: file.name,
          signature,
          expire,
          token,
          publicKey,
          // SDK V2 progress event
          onProgress: (evt) => {
            if (evt.total) {
              setProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          },
          abortSignal: abortRef.current.signal,
        });

        // res => { url, fileId, name, ... }
        setUploadedUrl(res.url as string);
        setFileId(res.fileId ?? null);
        setPreviewUrl(null);
        setProgress(100);
        onChange?.({ url: res.url as string, fileId: res.fileId });
      } catch (error) {
        // reset preview jika gagal
        setUploadedUrl(null);
        setFileId(null);
        setPreviewUrl(null);
        setProgress(0);

        // tipe error detail
        if (error instanceof ImageKitAbortError) {
          handleErrorToast(error.reason);
        } else if (error instanceof ImageKitInvalidRequestError) {
          handleErrorToast(error.message);
        } else if (error instanceof ImageKitUploadNetworkError) {
          handleErrorToast(error.message);
        } else if (error instanceof ImageKitServerError) {
          handleErrorToast(error.message);
        } else {
          console.error(error);
        }
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [getAuth, onChange, uploadedUrl, fileId, maxSizeMB]
  );

  const onFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await doUpload(file);
      } catch (e: unknown) {
        handleErrorToast(e);
      } finally {
        // reset input supaya bisa pilih file yang sama lagi
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [doUpload]
  );

  // Drag & Drop handlers
  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      try {
        await doUpload(file);
      } catch (e: unknown) {
        handleErrorToast(e);
      }
    },
    [doUpload]
  );

  const dropClasses = useMemo(
    () =>
      cn(
        "block w-full rounded-xl border-2 border-dashed p-5 text-center transition",
        dragOver
          ? "border-primary/60 bg-primary/5"
          : "border-muted-foreground/30 hover:bg-muted/30",
        "cursor-pointer"
      ),
    [dragOver]
  );

  const removeImage = useCallback(async () => {
    // opsional: hapus di ImageKit jika ada fileId
    if (fileId) {
      try {
        await fetch("/api/delete-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });
      } catch {
        // boleh diabaikan
      }
    }
    setUploadedUrl(null);
    setFileId(null);
    setPreviewUrl(null);
    setProgress(0);
    onChange?.(null);
  }, [fileId, onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>
          Upload Image{" "}
          {isOptional && <span className="text-muted-foreground text-xs">(optional)</span>}
        </Label>
        {isUploading ? (
          <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
            Cancel
          </Button>
        ) : hasImage ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Replace
            </Button>
            <Button variant="destructive" size="sm" onClick={removeImage}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      {/* Dropzone */}
      {!hasImage && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={dropClasses}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-6 w-6 opacity-60" />
            <p className="text-muted-foreground text-sm">
              Drag & drop or <span className="text-foreground font-medium">click</span> to upload
            </p>
            <p className="text-muted-foreground text-xs">Max {maxSizeMB} MB • Images only</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInputChange}
          />
        </label>
      )}

      {/* Preview / Result */}
      {previewUrl && (
        <div className="relative aspect-square w-40 overflow-hidden rounded-lg border">
          <Image
            src={previewUrl}
            alt="Preview"
            width={320}
            height={320}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {!previewUrl && uploadedUrl && (
        <div
          className="relative aspect-square w-40 overflow-hidden rounded-lg border"
          style={
            showPlaceholder && blurUrl
              ? {
                  backgroundImage: `url(${blurUrl})`,
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                }
              : {}
          }
        >
          <Image
            src={uploadedUrl}
            alt="Uploaded"
            width={320}
            height={320}
            className="h-full w-full object-cover"
            loading="lazy"
            onLoad={() => setShowPlaceholder(false)}
          />
        </div>
      )}

      {/* Progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">{progress}%</p>
        </div>
      )}

      {/* Hidden input to replace file */}
      {hasImage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileInputChange}
        />
      )}
    </div>
  );
}
