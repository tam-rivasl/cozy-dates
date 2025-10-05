'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
  photos: string[];
  altPrefix: string;
  emptyState?: ReactNode;
  previewLimit?: number;
  className?: string;
  gridClassName?: string;
}

export function PhotoGallery({
  photos,
  altPrefix,
  emptyState,
  previewLimit = 3,
  className,
  gridClassName,
}: PhotoGalleryProps) {
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxApi, setLightboxApi] = useState<CarouselApi | null>(null);

  const previewPhotos = useMemo(() => photos.slice(0, previewLimit), [photos, previewLimit]);

  const openLightboxAt = useCallback((index: number) => {
    setActiveSlide(index);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (isLightboxOpen && lightboxApi) {
      lightboxApi.scrollTo(activeSlide, true);
    }
  }, [isLightboxOpen, lightboxApi, activeSlide]);

  useEffect(() => {
    if (!lightboxApi) return;

    const handleSelect = () => setActiveSlide(lightboxApi.selectedScrollSnap());
    lightboxApi.on('select', handleSelect);
    return () => {
      lightboxApi.off('select', handleSelect);
    };
  }, [lightboxApi]);

  if (!photos || photos.length === 0) {
    return emptyState ? <div className={className}>{emptyState}</div> : null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3',
          gridClassName,
        )}
      >
        {previewPhotos.map((photo, index) => {
          const isOverflowTile = index === previewPhotos.length - 1 && photos.length > previewLimit;
          return (
            <button
              key={photo}
              type="button"
              onClick={() => openLightboxAt(index)}
              className="group relative h-40 w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/30 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src={photo}
                alt={`${altPrefix} ${index + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 90vw"
              />
              <span className="sr-only">Ver {altPrefix.toLowerCase()} {index + 1}</span>
              {isOverflowTile && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                  +{photos.length - previewLimit}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={isLightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl w-full border-none bg-background/80 p-6 sm:rounded-3xl shadow-2xl backdrop-blur-xl">
          <Carousel className="w-full" opts={{ loop: true }} setApi={setLightboxApi}>
            <CarouselContent className="-ml-0">
              {photos.map((photo, index) => (
                <CarouselItem key={`${photo}-modal`} className="flex justify-center">
                  <div className="relative h-[60vh] w-full max-w-4xl">
                    <Image
                      src={photo}
                      alt={`${altPrefix} ${index + 1}`}
                      fill
                      className="object-contain rounded-2xl"
                      sizes="100vw"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-6 top-1/2 -translate-y-1/2" />
                <CarouselNext className="right-6 top-1/2 -translate-y-1/2" />
              </>
            )}
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}
