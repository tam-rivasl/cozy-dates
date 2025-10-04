'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageBreadcrumbs, type BreadcrumbItem } from '@/components/page-breadcrumbs';
import { cn } from '@/lib/utils';

interface PageHeadingProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeading({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
}: PageHeadingProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <PageBreadcrumbs items={breadcrumbs} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/80 p-6 shadow-lg shadow-primary/5 backdrop-blur"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {Icon ? (
              <span className="rounded-2xl bg-primary/10 p-3 text-primary shadow-inner shadow-primary/20">
                <Icon className="h-6 w-6" />
              </span>
            ) : null}
            <div>
              <h1 className="font-headline text-3xl tracking-tight text-foreground md:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-xl text-sm text-muted-foreground md:text-base">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              {actions}
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
