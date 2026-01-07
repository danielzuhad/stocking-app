'use client';

import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Skeleton } from './skeleton';

export type ImageWithSkeletonProps = Omit<ImageProps, 'onLoadingComplete'> & {
  /** Extra class for the outer wrapper (required to size the wrapper when using `fill`). */
  containerClassName?: string;
  /** Extra class for the skeleton overlay. */
  skeletonClassName?: string;
  /** Whether to show the skeleton overlay while the image is loading. */
  showSkeleton?: boolean;
  /** Adds a simple fade-in transition when the image finishes loading. */
  fadeIn?: boolean;
  /**
   * @deprecated Use `onLoad` instead.
   * See https://nextjs.org/docs/app/api-reference/components/image#onload
   */
  onLoadingComplete?: (img: HTMLImageElement) => void;
};

/**
 * Next.js `Image` wrapper with a shadcn/ui `Skeleton` loader overlay.
 *
 * Notes:
 * - When using `fill`, provide sizing on the wrapper via `containerClassName` (e.g. `aspect-square`).
 * - Never render raw error strings to end users; this component only controls visuals.
 */
export function ImageWithSkeleton({
  containerClassName,
  skeletonClassName,
  showSkeleton = true,
  fadeIn = true,
  className,
  alt,
  src,
  onLoad,
  onError,
  onLoadingComplete,
  ...props
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
  }, [src]);

  const handleLoad = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      onLoad?.(event);
      onLoadingComplete?.(event.currentTarget);
      setIsLoading(false);
    },
    [onLoad, onLoadingComplete],
  );

  const handleError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(event);
      setIsLoading(false);
    },
    [onError],
  );

  return (
    <div className={cn('relative isolate overflow-hidden', containerClassName)}>
      {showSkeleton && isLoading ? (
        <Skeleton
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit]',
            skeletonClassName,
          )}
        />
      ) : null}

      <Image
        alt={alt}
        src={src}
        {...props}
        className={cn(
          fadeIn ? 'transition-opacity duration-300' : null,
          isLoading && (showSkeleton || fadeIn) ? 'opacity-0' : 'opacity-100',
          className,
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
