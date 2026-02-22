'use client';

import { EyeIcon, ExternalLinkIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { ImageWithSkeleton } from './image-with-skeleton';

type ImagePreviewDialogPropsType = {
  src: string;
  alt: string;
  thumbnail_src?: string;
  external_src?: string;
  title?: string;
  description?: string;
  trigger_class_name?: string;
  trigger_image_class_name?: string;
};

/**
 * Clickable image thumbnail that opens a larger preview inside a dialog.
 */
export function ImagePreviewDialog({
  src,
  alt,
  thumbnail_src,
  external_src,
  title = 'Pratinjau gambar',
  description = 'Klik di luar dialog untuk menutup.',
  trigger_class_name,
  trigger_image_class_name,
}: ImagePreviewDialogPropsType) {
  const externalPreviewSrc = external_src ?? src;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Lihat pratinjau foto"
          className={cn(
            'group relative inline-flex overflow-hidden rounded-md border focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
            trigger_class_name,
          )}
        >
          <ImageWithSkeleton
            src={thumbnail_src ?? src}
            alt={alt}
            width={96}
            height={96}
            className={cn('size-16 object-cover', trigger_image_class_name)}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            <EyeIcon className="size-4" />
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-md border">
          <ImageWithSkeleton
            src={src}
            alt={alt}
            width={1600}
            height={1600}
            className="max-h-[75vh] w-full bg-muted/10 object-contain"
          />
        </div>

        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            <a
              href={externalPreviewSrc}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buka di tab baru
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
