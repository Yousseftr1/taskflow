/** The lifecycle of a task. Mirrors the `task_status` enum in the database. */
export type TaskStatus = 'todo' | 'doing' | 'done';

/** A task exactly as it is stored in the `tasks` table. */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

/** The shape a caller provides when creating a task. */
export interface NewTask {
  title: string;
  description?: string | null;
  status?: TaskStatus;
}

/** Options accepted by `TasksService.list()`. */
export interface ListOptions {
  status?: TaskStatus;
  limit?: number;
}
