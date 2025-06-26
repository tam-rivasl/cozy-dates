export interface Task {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: 'Date Night' | 'Travel Plans' | 'To-Do' | 'Special Event';
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdBy: User;
  photos?: string[];
  notes?: string;
  playlistUrl?: string;
}

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'Movie' | 'Series';
  status: 'To Watch' | 'Watched';
  addedBy: User;
  notes?: string;
}

export type User = 'Tamara' | 'Carlos';
