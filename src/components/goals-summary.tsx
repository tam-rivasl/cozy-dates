'use client';

import React, { useMemo } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, CheckCircle2, Lightbulb } from 'lucide-react';
import { getProfileDisplayName } from '@/lib/profile';

interface GoalsSummaryProps {
  tasks: Task[];
}

interface Contribution {
  profileId: string;
  displayName: string;
  count: number;
}

export function GoalsSummary({ tasks }: GoalsSummaryProps) {
  const { completedCount, totalIdeas, contributions } = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const contributionMap = new Map<string, Contribution>();

    tasks.forEach((task) => {
      const profileId = task.createdBy?.id ?? 'unknown';
      const existing = contributionMap.get(profileId);

      if (existing) {
        existing.count += 1;
      } else {
        contributionMap.set(profileId, {
          profileId,
          displayName: getProfileDisplayName(task.createdBy),
          count: 1,
        });
      }
    });

    const contributionsArray = Array.from(contributionMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    return {
      completedCount: completed,
      totalIdeas: tasks.length,
      contributions: contributionsArray,
    };
  }, [tasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-primary" />
          <span>Our Couple Goals</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-8 text-center sm:flex-row sm:justify-around sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Plans Completed</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
            <p className="text-2xl font-bold">{totalIdeas}</p>
            <p className="text-sm text-muted-foreground">Total Ideas</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2 text-center">Idea Contribution</h3>
          <div className="space-y-4">
            {contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No ideas yet. Add your first plan!</p>
            ) : (
              contributions.map((contribution) => {
                const percentage = totalIdeas > 0 ? (contribution.count / totalIdeas) * 100 : 0;
                return (
                  <div key={contribution.profileId} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{contribution.displayName}</span>
                      <span className="font-bold">{contribution.count}</span>
                    </div>
                    <Progress value={percentage} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}