export interface Task {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: 'Date Night' | 'Travel Plans' | 'To-Do' | 'Special Event';
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdBy: User;
}

export type User = 'Tamara' | 'Carlos';
