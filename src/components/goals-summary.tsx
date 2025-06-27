'use client';

import React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';
import { Trophy, CheckCircle2, Lightbulb } from 'lucide-react';

interface GoalsSummaryProps {
  tasks: Task[];
}

export function GoalsSummary({ tasks }: GoalsSummaryProps) {
  const {
    completedCount,
    tamaraIdeaCount,
    carlosIdeaCount,
    totalIdeas,
    tamaraProgress,
    carlosProgress,
  } = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const tamaraIdeas = tasks.filter((task) => task.createdBy === 'Tamara').length;
    const carlosIdeas = tasks.filter((task) => task.createdBy === 'Carlos').length;
    const total = tamaraIdeas + carlosIdeas;

    return {
      completedCount: completed,
      tamaraIdeaCount: tamaraIdeas,
      carlosIdeaCount: carlosIdeas,
      totalIdeas: total,
      tamaraProgress: total > 0 ? (tamaraIdeas / total) * 100 : 0,
      carlosProgress: total > 0 ? (carlosIdeas / total) * 100 : 0,
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
          <div className="space-y-3">
             <div className="flex justify-between items-center gap-4">
               <span className="text-sm font-medium text-tamara">Tamara's Ideas</span>
               <span className="text-sm font-bold">{tamaraIdeaCount}</span>
             </div>
             <div className="flex justify-between items-center gap-4">
               <span className="text-sm font-medium text-carlos">Carlos's Ideas</span>
               <span className="text-sm font-bold">{carlosIdeaCount}</span>
             </div>
          </div>
           <div className="mt-2 w-full h-4 rounded-full flex overflow-hidden bg-muted">
             {/* Container for the progress bars and names with relative positioning */}
             <div className="relative w-full h-4 flex">
                {/* Tamara's Progress Bar */}
                <div
                  className="h-full bg-tamara transition-all duration-500 relative flex justify-center items-center"
                  style={{ width: `${tamaraProgress}%` }}
                >
                  {/* Tamara's Name */}
                  <span className="absolute bottom-full mb-1 text-xs font-bold text-tamara">
                    Tamara
                  </span>
                </div>
                {/* Carlos's Progress Bar */}
                <div
                  className="h-full bg-carlos transition-all duration-500 relative flex justify-center items-center"
                  style={{ width: `${carlosProgress}%` }}
                >
                   {/* Carlos's Name */}
                   <span className="absolute bottom-full mb-1 text-xs font-bold text-carlos">Carlos</span>
                </div>
             </div>
           </div>
 </div>
 </CardContent>
 </Card>
 );
}
