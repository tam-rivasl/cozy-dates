export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  theme: string | null;
  coupleId: string | null;
  confirmedAt: string | null;
}

export interface CoupleMembership {
  coupleId: string;
  status: 'pending' | 'accepted' | 'declined';
  role: 'owner' | 'member';
}

export interface CoupleSummary {
  id: string;
  name: string | null;
  inviteCode: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  category: 'Date Night' | 'Travel Plans' | 'To-Do' | 'Special Event' | 'Movie Day';
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdBy: Profile | null;
  photos: string[];
  watchlistItemId?: string | null;
}

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'Movie' | 'Series';
  status: 'To Watch' | 'Watched';
  created_by: Profile | null;
  notes?: string | null;
}

export interface MusicNote {
  id: string;
  title: string;
  notes: string;
  playlistUrl: string;
  created_by: Profile | null;
}
