export type Category = 'routine' | 'chore' | 'behavior';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type Recurrence = 'daily' | 'weekdays' | 'custom' | 'one_time';

export interface FamilyRow {
  id: string;
  parent_user_id: string | null;
  timezone: string;
  created_at: string;
}

export interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  age: number | null;
  avatar_stage: number;
  successful_days: number;
  last_evaluated_date: string | null;
  pending_stage_transition: boolean;
  cosmetics: string[];
  equipped_cosmetics: Record<string, string>;
  created_at: string;
}

export interface TaskRow {
  id: string;
  child_id: string;
  title: string;
  icon: string | null;
  category: Category;
  time_slot: TimeSlot;
  difficulty: number;
  recurrence: Recurrence;
  recurrence_days: number[] | null;
  is_bonus: boolean;
  bonus_cosmetic_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TaskCompletionRow {
  id: string;
  task_id: string;
  child_id: string;
  local_date: string; // YYYY-MM-DD
  completed_at: string;
  marked_by_parent: boolean;
}
