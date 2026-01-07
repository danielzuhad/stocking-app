import * as React from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export type EmptyStateProps = Omit<React.ComponentProps<typeof Empty>, 'children'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional media (usually an icon). */
  media?: React.ReactNode;
  mediaVariant?: React.ComponentProps<typeof EmptyMedia>['variant'];
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  /** Optional actions/content displayed below the header. */
  children?: React.ReactNode;
};

/**
 * Reusable Empty State wrapper (title + description + optional actions).
 *
 * Use this instead of manually composing `Empty` + `EmptyHeader` + `EmptyTitle`.
 */
export function EmptyState({
  title,
  description,
  media,
  mediaVariant = 'default',
  headerClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <Empty {...props}>
      <EmptyHeader className={headerClassName}>
        {media ? <EmptyMedia variant={mediaVariant}>{media}</EmptyMedia> : null}
        <EmptyTitle className={titleClassName}>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription className={cn(descriptionClassName)}>
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>

      {children ? <EmptyContent className={contentClassName}>{children}</EmptyContent> : null}
    </Empty>
  );
}

