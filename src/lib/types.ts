
export type UserName = string;

export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
}

export interface MusicNote {
  id: string;
  title: string;
  notes: string;
  playlist_url: string;
  added_by: UserName;
  user_id: string;
}

export type WatchlistType = 'Movie' | 'Series';
export type WatchlistStatus = 'To Watch' | 'Watched';

export interface WatchlistItem {
  id: string;
  title: string;
  type: WatchlistType;
  status: WatchlistStatus;
  notes?: string;
  added_by: UserName;
  user_id: string;
}

export type TaskCategory = 'Date Night' | 'Travel Plans' | 'To-Do' | 'Special Event' | 'Movie Day';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: TaskCategory;
  priority: TaskPriority;
  completed: boolean;
  photos?: string[];
  notes?: string;
  created_by: UserName;
  watchlist_item_id?: string | null;
  owner_id: string;
}
