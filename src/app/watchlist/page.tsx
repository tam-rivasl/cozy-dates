"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, Loader2, PlusCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";

import { useUser } from "@/context/UserContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useTasks } from "@/context/TaskContext";
import type { WatchlistItem } from "@/lib/types";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { AddWatchlistItemDialog } from "@/components/add-watchlist-item-dialog";
import { WatchlistItemCard } from "@/components/watchlist-item-card";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { PageHeading } from "@/components/page-heading";

interface PlanSeed {
  title?: string;
  description?: string;
  notes?: string;
  category?:
    | "Date Night"
    | "Travel Plans"
    | "To-Do"
    | "Special Event"
    | "Movie Day";
  priority?: "High" | "Medium" | "Low";
  date?: Date;
  watchlistItemId?: string;
}

export default function WatchlistPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const {
    watchlistItems,
    isLoading: areItemsLoading,
    addWatchlistItem,
    deleteWatchlistItem,
  } = useWatchlist();
  const { addTask } = useTasks();
  const router = useRouter();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isAddPlanDialogOpen, setAddPlanDialogOpen] = useState(false);
  const [initialPlanData, setInitialPlanData] = useState<
    PlanSeed | undefined
  >();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const handlePlanMovieNight = (item: WatchlistItem) => {
    setInitialPlanData({
      title: item.title,
      description: "Movie night inspired by our watchlist favourite.",
      notes: item.notes ?? "",
      category: "Movie Day",
      watchlistItemId: item.id,
    });
    setAddPlanDialogOpen(true);
  };
  const { toWatchItems, watchedItems } = useMemo(() => {
    const toWatch = watchlistItems.filter((item) => item.status === "To Watch");
    const watched = watchlistItems.filter((item) => item.status === "Watched");
    return { toWatchItems: toWatch, watchedItems: watched };
  }, [watchlistItems]);

  if (isUserLoading || areItemsLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative.flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(215,204,230,0.35),_transparent_60%)]">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="container flex-1 space-y-8 pb-12 pt-8"
      >
        <PageHeading
          icon={Film}
          title="Our Watchlist"
          description="Keep track of everything you want to stream together and turn favourites into date nights."
          actions={
            <Button size="lg" onClick={() => setAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          }
        />

        <AddWatchlistItemDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAddItem={addWatchlistItem}
        />

        <AddTaskDialog
          isOpen={isAddPlanDialogOpen}
          onOpenChange={setAddPlanDialogOpen}
          onAddTask={addTask}
          initialData={initialPlanData}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30%" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-2xl font-headline text-primary"
            >
              To Watch
            </motion.h2>
            {toWatchItems.length > 0 ? (
              <AnimatePresence initial={false}>
                {toWatchItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <WatchlistItemCard
                      item={item}
                      onDelete={deleteWatchlistItem}
                      onPlanMovieNight={handlePlanMovieNight}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/50 p-10 text-center shadow-inner"
              >
                <Video className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  Nothing to watch yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Add a movie or a series to plan your next cozy night in.
                </p>
              </motion.div>
            )}
          </section>

          <section className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30%" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-2xl font-headline text-primary/80"
            >
              Watched Favourites
            </motion.h2>
            {watchedItems.length > 0 ? (
              <AnimatePresence initial={false}>
                {watchedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <WatchlistItemCard
                      item={item}
                      onDelete={deleteWatchlistItem}
                      onPlanMovieNight={handlePlanMovieNight}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/50 p-10 text-center shadow-inner"
              >
                <Video className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  No movies or series watched yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Mark an item as watched when you both finish it.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </motion.main>
    </div>
  );
}
