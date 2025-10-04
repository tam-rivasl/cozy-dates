'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Home, BookHeart, Film, Music, Settings, Star } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

const SEGMENT_CONFIG: Record<string, { label: string; icon?: LucideIcon; href?: string }> = {
  dashboard: { label: 'Inicio', icon: Home, href: '/dashboard' },
  memories: { label: 'Recuerdos', icon: BookHeart },
  watchlist: { label: 'Watchlist', icon: Film },
  music: { label: 'Notas Musicales', icon: Music },
  settings: { label: 'Configuración', icon: Settings },
  goals: { label: 'Metas', icon: Star },
};

function buildAutoTrail(pathname: string): BreadcrumbItem[] {
  const cleaned = pathname.split('?')[0];
  const segments = cleaned.split('/').filter(Boolean);

  const trail: BreadcrumbItem[] = [
    {
      href: '/dashboard',
      label: 'Inicio',
      icon: Home,
    },
  ];

  let cumulative = '';
  segments.forEach((segment) => {
    if (segment === 'dashboard') {
      cumulative = '/dashboard';
      return;
    }

    cumulative += `/${segment}`;
    const config = SEGMENT_CONFIG[segment];
    trail.push({
      href: config?.href ?? cumulative,
      label: config?.label ?? segment.replace(/-/g, ' '),
      icon: config?.icon,
    });
  });

  return trail;
}

export function PageBreadcrumbs({
  items,
  className,
}: {
  items?: BreadcrumbItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const trail = useMemo(() => items ?? buildAutoTrail(pathname), [items, pathname]);

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === trail.length - 1;

          return (
            <Fragment key={`${item.href}-${item.label}`}>
              <motion.li
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 backdrop-blur-sm',
                  isLast
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'bg-card/70 text-muted-foreground ring-1 ring-border/50 hover:text-foreground',
                )}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 transition-colors',
                    isLast && 'pointer-events-none font-medium',
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  <span className="capitalize">{item.label}</span>
                </Link>
              </motion.li>
              {index < trail.length - 1 ? (
                <ChevronRight className="h-4 w-4 text-border" aria-hidden />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

